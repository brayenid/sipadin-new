import { NextRequest, NextResponse } from "next/server";
import { processUserMessageWithGroq } from "@/lib/ai/groq-agent";
import { sendFonnteMessage } from "@/lib/fonnte/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Cache Anti-Duplikasi Pesan Masuk (Mencegah Double Reply jika Webhook Ter-trigger Ganda)
const recentProcessedMessages = new Map<string, number>();

function isDuplicateMessage(dedupKey: string, ttlMs: number = 15000): boolean {
  const now = Date.now();
  // Bersihkan cache kedaluwarsa
  for (const [key, timestamp] of recentProcessedMessages.entries()) {
    if (now - timestamp > 30000) {
      recentProcessedMessages.delete(key);
    }
  }

  const lastSeen = recentProcessedMessages.get(dedupKey);
  if (lastSeen && now - lastSeen < ttlMs) {
    return true;
  }

  recentProcessedMessages.set(dedupKey, now);
  return false;
}

/**
 * Endpoint Webhook Fonnte untuk Menerima Pesan Masuk WhatsApp
 * POST /api/fonnte/webhook
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const entries: Record<string, any> = {};
      formData.forEach((value, key) => {
        entries[key] = value;
      });
      body = entries;
    } else {
      const rawText = await req.text();
      try {
        body = JSON.parse(rawText);
      } catch {
        body = { raw: rawText };
      }
    }

    // 0. KEAMANAN LAYER 0: Verifikasi Webhook Secret Token (Anti-Spoofing Luar)
    const expectedSecret = process.env.FONNTE_WEBHOOK_SECRET?.trim();
    if (expectedSecret) {
      const incomingSecret =
        req.headers.get("x-fonnte-secret") ||
        req.headers.get("authorization") ||
        req.nextUrl.searchParams.get("secret");

      if (incomingSecret !== expectedSecret) {
        console.warn("[Security Alert] Percobaan akses webhook ilegal tanpa secret token yang valid.");
        return NextResponse.json(
          { status: "unauthorized", message: "Akses webhook ditolak. Secret token tidak valid." },
          { status: 401 }
        );
      }
    }

    const sender: string = String(body.sender || body.from || "").trim();
    const rawMessage: string = String(body.message || body.text || "").trim();
    const member: string = String(body.member || "").trim();
    const isGroup = sender.includes("@g.us") || Boolean(body.group_id || body.groupId);
    const actualSender = isGroup && member ? member : sender;
    const targetReply = isGroup
      ? (sender.includes("@g.us") ? sender : String(body.group_id || body.groupId || sender))
      : sender;

    console.log("==================================================");
    console.log("📥 [FONNTE WEBHOOK INCOMING]");
    console.log(`isGroup: ${isGroup} | Sender: ${sender} | Member: ${member} | ActualSender: ${actualSender}`);
    console.log(`Target Reply: ${targetReply}`);
    console.log(`Raw Message: "${rawMessage}"`);
    console.log("==================================================");

    if (!sender || !rawMessage) {
      return NextResponse.json({ status: "ignored", reason: "Payload kosong atau tidak lengkap." }, { status: 200 });
    }

    // 0.5 ANTI-DUPLICATE / DEDUP CHECK (Mencegah Double Reply dari Retry Webhook)
    const msgId = String(body.id || body.message_id || body.requestid || "").trim();
    const dedupKey = msgId
      ? `id_${msgId}`
      : `text_${actualSender}_${targetReply}_${rawMessage.trim().toLowerCase()}`;

    if (isDuplicateMessage(dedupKey, 12000)) {
      console.warn(`[Anti-Duplicate] Request duplikat untuk key: ${dedupKey} diabaikan.`);
      return NextResponse.json(
        { status: "ignored", reason: "Request duplikat terdeteksi dalam window waktu bersamaan." },
        { status: 200 }
      );
    }

    // 1. FILTER SPAM & PESAN TIDAK RELEVAN
    const trimmedMsg = rawMessage.trim();

    // A. Abaikan pesan terlalu pendek (< 2 karakter)
    if (trimmedMsg.length < 2) {
      console.log(`[Anti-Spam] Pesan dari ${actualSender} terlalu pendek (${trimmedMsg}), diabaikan.`);
      return NextResponse.json({ status: "ignored", reason: "Pesan terlalu pendek." }, { status: 200 });
    }

    // B. Whitelist Verification (Berlaku untuk Chat Personal maupun Pengirim di dalam Grup)
    const rawAllowed = process.env.WA_ALLOWED_NUMBERS?.trim() || "";
    if (rawAllowed.length > 0) {
      const allowedList = rawAllowed
        .split(",")
        .map((n) => n.trim().split("@")[0].split(":")[0].replace(/\D/g, "").replace(/^0/, "62"))
        .filter(Boolean);

      const cleanSender = actualSender
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "")
        .replace(/^0/, "62");

      const isAllowed = allowedList.some(
        (allowed) => cleanSender === allowed || cleanSender.includes(allowed) || allowed.includes(cleanSender)
      );

      console.log(`[Whitelist Check] cleanSender: "${cleanSender}", allowedList: ${JSON.stringify(allowedList)}, isAllowed: ${isAllowed}`);

      if (!isAllowed) {
        console.warn(`[Anti-Spam & Security] Pesan dari nomor tidak berwenang (${actualSender} -> ${cleanSender}) di ${isGroup ? "Grup " + sender : "Personal"} diabaikan.`);
        return NextResponse.json({ status: "rejected", reason: "Pengirim tidak terdaftar di whitelist." }, { status: 200 });
      }
    }

    // 2. Filter Trigger & Pembersihan Mention untuk Pesan Grup
    let cleanedMessage = rawMessage;

    if (isGroup) {
      // Identifikasi nomor WhatsApp Bot (Default: 628197962899, payload Fonnte body.device, atau env variable)
      const defaultBotNumber = "628197962899";
      const deviceNumber = String(body.device || "").split("@")[0].split(":")[0].replace(/\D/g, "").replace(/^0/, "62");
      const envBotNumber = String(process.env.FONNTE_BOT_NUMBER || process.env.WA_BOT_NUMBER || "")
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "")
        .replace(/^0/, "62");
      const botNumbers = Array.from(new Set([defaultBotNumber, deviceNumber, envBotNumber].filter(Boolean)));

      // Daftar kata kunci trigger nama bot
      const rawKeywords = process.env.FONNTE_BOT_KEYWORD || "sipadin";
      const keywords = rawKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      if (!keywords.includes("sipadin")) keywords.push("sipadin");

      const lowerMsg = rawMessage.toLowerCase();
      const normalizedMsg = lowerMsg.replace(/[\s\-\+\(\)]/g, "");

      // Cek Mention:
      // a. Terdapat mention nomor bot spesifik di teks pesan (misal: @628197962899, @08197962899, @62 819-7962-899)
      const hasBotNumberMention = botNumbers.some((bNum) => {
        const shortNum = bNum.replace(/^62/, "0");
        const coreDigits = bNum.slice(-9); // misal: 8197962899
        return (
          normalizedMsg.includes(`@${bNum}`) ||
          normalizedMsg.includes(`@${shortNum}`) ||
          normalizedMsg.includes(`@+${bNum}`) ||
          normalizedMsg.includes(`@${coreDigits}`) ||
          (normalizedMsg.includes("@") && normalizedMsg.includes(coreDigits)) ||
          lowerMsg.includes(bNum) ||
          lowerMsg.includes(shortNum)
        );
      });

      // b. Metadata mentioned dari payload resmi Fonnte
      let isMentionedInPayload = false;
      if (body.mentioned) {
        const payloadMentioned = Array.isArray(body.mentioned)
          ? body.mentioned.map((m: any) => String(m).split("@")[0].split(":")[0].replace(/\D/g, "").replace(/^0/, "62"))
          : [String(body.mentioned).split("@")[0].split(":")[0].replace(/\D/g, "").replace(/^0/, "62")];

        isMentionedInPayload = payloadMentioned.length > 0 && (
          payloadMentioned.some((pNum: string) =>
            botNumbers.some((bNum) => pNum.includes(bNum) || bNum.includes(pNum) || pNum.slice(-8) === bNum.slice(-8))
          ) ||
          payloadMentioned.some((pNum: string) => pNum.includes("8197962899"))
        );
      }

      // c. Reply / Quote terhadap pesan bot di grup
      let isQuotingBot = false;
      const quotedSender = String(
        body.quoted_sender ||
          body.quoted_member ||
          body.reply_to ||
          body.reply_sender ||
          (typeof body.quoted === "object" && body.quoted?.sender) ||
          ""
      )
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "")
        .replace(/^0/, "62");

      if (quotedSender && botNumbers.length > 0) {
        isQuotingBot = botNumbers.some((bNum) => quotedSender.includes(bNum) || bNum.includes(quotedSender) || quotedSender.includes("8197962899"));
      }

      // d. Kata kunci bot di mana saja di dalam pesan (misal: "sipadin", "@sipadin", "!sipadin", "/sipadin", dsb.)
      const isKeywordMention = keywords.some((k) => lowerMsg.includes(k.toLowerCase()));

      const isExplicitTagOrCommand =
        isKeywordMention ||
        lowerMsg.includes("@sipadin") ||
        lowerMsg.includes("@bot") ||
        lowerMsg.includes("!sipadin") ||
        lowerMsg.includes("/sipadin") ||
        /@\d{8,16}/.test(lowerMsg);

      const isMentioned = hasBotNumberMention || isMentionedInPayload || isQuotingBot || isExplicitTagOrCommand;

      console.log(`[Group Mention Check] hasBotNumberMention: ${hasBotNumberMention}, isMentionedInPayload: ${isMentionedInPayload}, isQuotingBot: ${isQuotingBot}, isKeywordMention: ${isKeywordMention}, isExplicitTagOrCommand: ${isExplicitTagOrCommand}`);

      if (!isMentioned) {
        console.log(`[Group Filter] Pesan di grup ${sender} dari ${actualSender} diabaikan karena bot (${defaultBotNumber}) tidak di-mention.`);
        return NextResponse.json({ status: "ignored", reason: "Bot tidak di-mention di dalam grup." }, { status: 200 });
      }

      // Bersihkan mention (@Sipadin X, @Sipadin, @628197962899, !sipadin, /sipadin) dari teks agar prompt AI bersih
      let cleaned = rawMessage;

      // 1. Hapus mention nomor WhatsApp
      botNumbers.forEach((bNum) => {
        const shortNum = bNum.replace(/^62/, "0");
        cleaned = cleaned.replace(new RegExp(`@${bNum}(?:@s\\.whatsapp\\.net)?`, "gi"), "");
        cleaned = cleaned.replace(new RegExp(`@${shortNum}(?:@s\\.whatsapp\\.net)?`, "gi"), "");
      });
      cleaned = cleaned.replace(/@\d{8,16}(?:@s\.whatsapp\.net)?/gi, "");

      // 2. Hapus tag mention @ / prefix bot
      cleaned = cleaned
        .replace(/@sipadin\b/gi, "")
        .replace(/@bot\b/gi, "")
        .replace(/!sipadin\b/gi, "")
        .replace(/\/sipadin\b/gi, "")
        .replace(/^(?:@?sipadin|din)[:,.\s]+/gi, "");

      // 3. Hapus sisa kata alias kontak di awal jika ada (misal: "X " dari "@Sipadin X ping")
      cleaned = cleaned.replace(/^[a-zA-Z0-9_]+\s+(?=(?:ping|pong|info|cek|apa|tolong|bagaimana|buat|data|sisa|daftar|baca|bayar|link|nip|agenda|absensi|spj|halo|hai|\/|!|\?|[a-zA-Z]))/i, "");

      cleanedMessage = cleaned.trim();
      
      if (!cleanedMessage) {
        cleanedMessage = "Halo";
      }
    }

    console.log(`[Cleaned Message for Processing]: "${cleanedMessage}"`);

    // 3. FITUR PING-PONG INSTAN (Bekerja untuk Chat Personal maupun Mention Grup)
    if (cleanedMessage.toLowerCase() === "ping" || rawMessage.trim().toLowerCase() === "ping") {
      console.log(`[Fonnte Webhook] Menerima PING dari ${actualSender}. Mengirim PONG ke ${targetReply}...`);
      await sendFonnteMessage({
        target: targetReply,
        message: "🏓 *PONG!*\n\nKoneksi WhatsApp Webhook ke server lokal berhasil terhubung aktif!",
      });
      return NextResponse.json({ status: "success", reply: "pong" }, { status: 200 });
    }

    // 4. SHORTCUT CEPAT: Bantuan / Panduan Perintah (/help, help, bantuan, menu)
    const lowerClean = cleanedMessage.toLowerCase().trim();
    if (lowerClean === "/help" || lowerClean === "help" || lowerClean === "bantuan" || lowerClean === "/bantuan" || lowerClean === "menu") {
      const helpMessage = `🤖 *SIPADIN Co-Pilot - Panduan Perintah*

📌 *1. SPJ Belum Dibayar:*
• _"SPJ belum dibayar"_
• _"Bayar [ID / Nama]"_ (Ubah status lunas)

📌 *2. Bukti Dukung (Google Drive):*
• _"SPJ tanpa bukti dukung"_
• _"Link drive [ID / Nama] [URL]"_

📌 *3. Info NIP Instan:*
• _"NIP [Nama Pegawai]"_

📌 *4. Anggaran & Sisa Pagu:*
• _"Beri data anggaran"_ (List sub-kegiatan)
• _"Sisa saldo [Nama Sub-Kegiatan]"_
• _"Saya perlu 5 juta untuk jalan dinas, cukup?"_

📌 *5. Naskah Dinas & Surat:*
• _"Daftar naskah dinas"_
• _"Baca naskah [ID / No Surat]"_

📌 *6. Absensi & Agenda OPD:*
• _"Data absensi OPD terbaru"_
• _"Daftar kegiatan rapat OPD"_

📌 *7. Agenda Kegiatan Tim (Kalender):*
• _"Agenda tim minggu ini"_
• _"Buat agenda tanggal 17 Agustus 2026, kegiatan FKP, jam 10 pagi"_

_Ketik perintah di atas secara langsung & santai!_`;

      await sendFonnteMessage({
        target: targetReply,
        message: helpMessage,
      });

      return NextResponse.json({ status: "success", type: "help_message" }, { status: 200 });
    }

    // 5. Jalankan AI Agent Groq dengan Tools
    const sessionKey = isGroup ? `group_${sender}_${actualSender}` : `user_${sender}`;
    console.log(`[Fonnte Webhook] Memproses pesan dari ${actualSender} (${isGroup ? "Grup: " + sender : "Personal"}): "${cleanedMessage}"`);

    let result: any = null;
    try {
      result = await processUserMessageWithGroq(sessionKey, cleanedMessage, undefined, actualSender);
    } catch (agentErr: any) {
      console.error("[Groq Agent Process Error]:", agentErr);
      await sendFonnteMessage({
        target: targetReply,
        message: "Maaf, sistem sedang sibuk memproses data. Silakan coba kirim ulang perintah Anda dalam beberapa detik.",
      });
      return NextResponse.json({ status: "error", error: agentErr?.message || "Agent error" }, { status: 200 });
    }

    // 5. Kirim Balasan ke WhatsApp via Fonnte
    if (result && result.replyText) {
      await sendFonnteMessage({
        target: targetReply,
        message: result.replyText,
      });
    }

    return NextResponse.json({
      status: "success",
      tools: result?.toolCallsExecuted || [],
      message: "Pesan berhasil diproses dan dibalas.",
    });
  } catch (error: any) {
    console.error("[Fonnte Webhook Fatal Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error?.message || "Terjadi kesalahan internal pada server.",
      },
      { status: 200 } // Kembalikan 200 agar Fonnte tidak terus-menerus me-retry webhook
    );
  }
}

/**
 * GET Handler untuk Health Check & Verifikasi URL Webhook oleh Fonnte
 */
export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "SIPADIN AI WhatsApp Webhook (Fonnte)",
    timestamp: new Date().toISOString(),
  });
}

/**
 * OPTIONS Handler untuk CORS & Preflight Request
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
