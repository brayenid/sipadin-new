import { NextRequest, NextResponse } from "next/server";
import { processUserMessageWithGroq } from "@/lib/ai/groq-agent";
import { sendFonnteMessage } from "@/lib/fonnte/client";

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
    const isGroup = sender.includes("@g.us") || Boolean(body.group_id);
    const actualSender = isGroup && member ? member : sender;

    console.log("==================================================");
    console.log("📥 [FONNTE WEBHOOK INCOMING]");
    console.log(`Sender: ${sender} | Member: ${member} | Message: "${rawMessage}"`);
    console.log("==================================================");

    if (!sender || !rawMessage) {
      return NextResponse.json({ status: "ignored", reason: "Payload kosong atau tidak lengkap." }, { status: 200 });
    }

    // 0. FITUR PING-PONG INSTAN (Untuk Tes Cepat Koneksi)
    if (rawMessage.trim().toLowerCase() === "ping") {
      console.log(`[Fonnte Webhook] Menerima PING dari ${actualSender}. Mengirim PONG...`);
      await sendFonnteMessage({
        target: sender,
        message: "🏓 *PONG!*\n\nKoneksi WhatsApp Webhook ke server lokal berhasil terhubung aktif!",
      });
      return NextResponse.json({ status: "success", reply: "pong" }, { status: 200 });
    }

    // 1. FILTER SPAM & PESAN TIDAK RELEVAN (Menghemat Kuota Fonnte & Token AI)
    const trimmedMsg = rawMessage.trim();

    // A. Abaikan pesan terlalu pendek (< 2 karakter) atau hanya emotikon/karakter aneh
    if (trimmedMsg.length < 2) {
      console.log(`[Anti-Spam] Pesan dari ${actualSender} terlalu pendek (${trimmedMsg}), diabaikan.`);
      return NextResponse.json({ status: "ignored", reason: "Pesan terlalu pendek." }, { status: 200 });
    }

    // B. Abaikan pesan spam broadcast umum / promosi / salam otomatis tanpa konteks
    const spamPatterns = [
      /^(ok|oke|siap|baik|ya|tes|test|p|asalamualaikum|assalamualaikum|halo|hai|pagi|siang|malam)\.?$/i,
    ];
    // Jika hanya mengetik salam/satu kata tanpa konteks dan tidak ada draft aktif
    const isTrivialGreeting = spamPatterns.some((pattern) => pattern.test(trimmedMsg));
    if (isTrivialGreeting && trimmedMsg.toLowerCase() !== "ping") {
      console.log(`[Anti-Spam] Pesan basa-basi '${trimmedMsg}' diabaikan untuk menghemat kuota.`);
      return NextResponse.json({ status: "ignored", reason: "Salam singkat tanpa konteks diabaikan." }, { status: 200 });
    }

    // C. Whitelist Verification (Berlaku untuk Chat Personal MAUPUN Pengirim di dalam Grup)
    const rawAllowed = process.env.WA_ALLOWED_NUMBERS?.trim() || "";
    if (rawAllowed.length > 0) {
      const allowedList = rawAllowed.split(",").map((n) => n.trim().replace(/\D/g, "").replace(/^0/, "62"));
      const cleanSender = actualSender.replace(/\D/g, "").replace(/^0/, "62");
      const isAllowed = allowedList.some((allowed) => cleanSender.includes(allowed) || allowed.includes(cleanSender));
      if (!isAllowed) {
        console.warn(`[Anti-Spam & Security] Pesan dari nomor tidak berwenang (${actualSender}) di ${isGroup ? "Grup " + sender : "Personal"} diabaikan tanpa balasan.`);
        return NextResponse.json({ status: "rejected", reason: "Pengirim tidak terdaftar di whitelist." }, { status: 200 });
      }
    }

    // 2. Filter Trigger untuk Pesan Grup
    // Jika pesan berasal dari grup, bot hanya merespons jika di-mention atau mengandung kata pemicu
    const botKeyword = process.env.FONNTE_BOT_KEYWORD?.toLowerCase() || "sipadin";
    let cleanedMessage = rawMessage;

    if (isGroup) {
      const lower = rawMessage.toLowerCase();
      const hasTrigger =
        lower.includes(`@${botKeyword}`) ||
        lower.includes(`!${botKeyword}`) ||
        lower.includes(`/${botKeyword}`) ||
        lower.startsWith(botKeyword);

      if (!hasTrigger) {
        // Abaikan chat obrolan umum antar anggota grup
        return NextResponse.json({ status: "ignored", reason: "Bukan pesan yang ditujukan untuk bot di grup." }, { status: 200 });
      }

      // Bersihkan kata pemicu dari pesan agar prompt lebih bersih
      cleanedMessage = rawMessage
        .replace(new RegExp(`@${botKeyword}`, "gi"), "")
        .replace(new RegExp(`!${botKeyword}`, "gi"), "")
        .replace(new RegExp(`/${botKeyword}`, "gi"), "")
        .trim();
      
      if (!cleanedMessage) {
        cleanedMessage = "Halo";
      }
    }

    // 3. Tentukan Session Key unik per obrolan
    const sessionKey = isGroup ? `group_${sender}_${actualSender}` : `user_${sender}`;
    const targetReply = sender; // Balas ke grup jika pesan dari grup, atau ke nomor pengirim jika personal

    console.log(`[Fonnte Webhook] Memproses pesan dari ${actualSender} (${isGroup ? "Grup: " + sender : "Personal"}): "${cleanedMessage}"`);

    // 4. Jalankan AI Agent Groq
    const result = await processUserMessageWithGroq(sessionKey, cleanedMessage);

    // 5. Kirim Balasan ke WhatsApp via Fonnte
    if (result.replyText) {
      await sendFonnteMessage({
        target: targetReply,
        message: result.replyText,
      });
    }

    return NextResponse.json({
      status: "success",
      tools: result.toolCallsExecuted,
      message: "Pesan berhasil diproses dan dibalas.",
    });
  } catch (error: any) {
    console.error("[Fonnte Webhook Error]:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error?.message || "Terjadi kesalahan internal pada server.",
      },
      { status: 500 }
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
