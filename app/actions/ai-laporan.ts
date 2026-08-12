"use server";

import { auth } from "@/lib/auth";

export type InitLaporanInput = {
  konteksKegiatan: string;
};

function parseStructuredJson(rawText: string) {
  let cleanText = rawText.trim();
  
  if (cleanText.includes("```")) {
    const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleanText = match[1].trim();
    }
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    const startIdx = cleanText.indexOf("{");
    const endIdx = cleanText.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const candidateJson = cleanText.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(candidateJson);
      } catch (_) {}
    }
    throw err;
  }
}

async function callGroq(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY tidak terdeteksi di lingkungan server."
    );
  }

  const models = [
    "llama-3.3-70b-specdec",
    "llama-3.3-70b-versatile",
    "llama3-8b-8192",
    "gemma2-9b-it"
  ];
  let lastError: any = null;

  for (const model of models) {
    console.log(`[Groq AI Laporan] Mencoba model: ${model}...`);
    try {
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API Error (${res.status}): ${errText}`);
      }

      const json = await res.json();
      const rawText = json.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error("Groq tidak mengembalikan respon.");
      }

      return parseStructuredJson(rawText);
    } catch (e: any) {
      lastError = e;
      console.warn(`[Groq AI Laporan] Model ${model} gagal:`, e.message || e);
      continue;
    }
  }

  const finalError = lastError || new Error("Gagal menghubungkan ke Groq.");
  let userFriendlyMsg = "Gagal memproses permintaan dengan AI Groq. Silakan coba beberapa saat lagi.";
  const errStr = finalError.message.toLowerCase();

  if (errStr.includes("limit") || errStr.includes("429") || errStr.includes("rate_limit") || errStr.includes("quota")) {
    userFriendlyMsg = "Batas penggunaan harian atau menit AI Groq telah habis. Harap tunggu beberapa saat.";
  } else if (errStr.includes("401") || errStr.includes("unauthorized") || errStr.includes("api key")) {
    userFriendlyMsg = "Kunci API (API Key) Groq tidak valid.";
  } else if (errStr.includes("abort") || errStr.includes("timeout")) {
    userFriendlyMsg = "Koneksi ke server AI Groq terlalu lambat atau terputus.";
  }

  throw new Error(userFriendlyMsg);
}

async function callGemini(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi di file .env."
    );
  }

  const candidateModels = [
    "models/gemini-1.5-flash-8b",
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash-exp",
    "models/gemini-1.5-flash",
    "models/gemini-2.0-flash",
  ];

  let lastError: Error | null = null;

  for (const modelPath of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    console.log(`[Gemini AI Laporan] Mencoba model: ${modelPath}...`);
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[Gemini AI Laporan] Model ${modelPath} merespons dalam ${Date.now() - startTime}ms (${res.status})`);

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = `Status ${res.status}`;
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error?.message || errMsg;
        } catch (_) {}

        const isQuotaOrNotFound =
          res.status === 404 ||
          res.status === 429 ||
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("limit: 0") ||
          errMsg.toLowerCase().includes("no longer available") ||
          errMsg.toLowerCase().includes("not found");

        if (isQuotaOrNotFound && modelPath !== candidateModels[candidateModels.length - 1]) {
          lastError = new Error(`Model ${modelPath} (${errMsg})`);
          continue;
        }

        throw new Error(`Gemini Error (${res.status}) pada ${modelPath}: ${errMsg}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini tidak mengembalikan respons teks.");
      }

      return parseStructuredJson(rawText);
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e;
      const isTimeout = e.name === "AbortError";
      const isRetryable =
        isTimeout ||
        e instanceof SyntaxError ||
        e.message?.includes("JSON") ||
        e.message?.includes("tidak tersedia") ||
        e.message?.includes("404") ||
        e.message?.includes("429") ||
        e.message?.includes("quota") ||
        e.message?.includes("Quota") ||
        e.message?.includes("limit: 0") ||
        e.message?.includes("no longer available");

      console.warn(`[Gemini AI Laporan] Model ${modelPath} gagal: ${isTimeout ? "Timeout 8s" : e.message}`);

      if (isRetryable && modelPath !== candidateModels[candidateModels.length - 1]) {
        continue;
      }
      throw e;
    }
  }

  const finalError = lastError || new Error("Gagal menghubungi layanan AI.");
  let userFriendlyMsg = "Gagal memproses permintaan dengan AI. Silakan coba beberapa saat lagi.";
  const errStr = finalError.message.toLowerCase();

  if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("limit")) {
    userFriendlyMsg = "Batas kuota gratis AI menit ini telah habis. Harap tunggu sekitar 1 menit.";
  } else if (errStr.includes("404") || errStr.includes("not found") || errStr.includes("no longer available")) {
    userFriendlyMsg = "Layanan model AI tersebut tidak ditemukan.";
  } else if (errStr.includes("abort") || errStr.includes("timeout")) {
    userFriendlyMsg = "Koneksi ke server AI terlalu lambat.";
  } else if (finalError instanceof SyntaxError || errStr.includes("json")) {
    userFriendlyMsg = "Format respon AI tidak valid. Silakan coba klik refine kembali.";
  }

  throw new Error(userFriendlyMsg);
}

const SYSTEM_PROMPT_LAPORAN = `Anda adalah asisten kedinasan resmi Pemerintah Kabupaten Kutai Barat.
Tugas Anda adalah membuat atau menyempurnakan bagian dari "Laporan Hasil Perjalanan Dinas" yang formal, akurat, dan rapi sesuai tata naskah dinas kedinasan Indonesia.

Pedoman Penulisan:
- Gunakan bahasa Indonesia resmi kedinasan, efektif, dan profesional.
- Kalimat harus padat dan relevan dengan konteks kegiatan perjalanan dinas.
- Jika ada "INSTRUKSI KHUSUS PENGGUNA", instruksi tersebut WAJIB dipatuhi di atas pedoman default.
- Kembalikan output dalam format JSON murni.`;

export type RefineLaporanFieldInput = {
  targetField: "hasilPembuka" | "hasilPoin" | "hasilNarasi";
  instruction?: string;
  aiInitData?: {
    konteksKegiatan: string;
  };
  currentDoc: {
    kegiatan: string;
    waktu: string;
    lokasi: string;
    tujuan: string;
    hasilPembuka: string;
    hasilMode: "POINTS" | "NARRATIVE";
    hasilPoin: string[];
    hasilNarasi: string;
  };
};

export async function refineLaporanFieldAi(
  input: RefineLaporanFieldInput
): Promise<{ text?: string; items?: string[]; source: "Gemini" | "Groq" }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const isListField = input.targetField === "hasilPoin";
  const userInstruction = input.instruction?.trim();

  const initKonteksText = input.aiInitData?.konteksKegiatan?.trim()
    ? `KONTEKS RUJUKAN KEGIATAN (INPUT INISIALISASI PENGGUNA):
${input.aiInitData.konteksKegiatan}`
    : "KONTEKS RUJUKAN KEGIATAN: (Belum diisi inisialisasi)";

  const rawValue = input.currentDoc[input.targetField];
  const currentValue = Array.isArray(rawValue)
    ? rawValue.filter((x: string) => x.trim() !== "")
    : (rawValue as string)?.trim() || "";
  const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : Boolean(currentValue);

  const existingReferenceText = hasValue
    ? `\n⚠️ DRAF SAAT INI (RUJUKAN EDITING):
${isListField ? JSON.stringify(currentValue) : currentValue}
Tugas Anda adalah MEMPERBAIKI, MENYEMPURNAKAN, dan MENYESUAIKAN draf saat ini agar lebih sistematis, resmi, dan mudah dipahami.`
    : "";

  const prompt = `Anda diminta untuk menyusun atau menyempurnakan bagian "${input.targetField}" dari Laporan Hasil Perjalanan Dinas:

${userInstruction ? `⭐ INSTRUKSI KHUSUS PENGGUNA (PRIORITAS TERTINGGI — PATUHI SEPENUHNYA):
${userInstruction}
` : ""}
${initKonteksText}
${existingReferenceText}

METADATA PERJALANAN DINAS:
- Kegiatan / Maksud: ${input.currentDoc.kegiatan || "-"}
- Lokasi & Tujuan: ${input.currentDoc.lokasi || "-"} / ${input.currentDoc.tujuan || "-"}
- Tanggal Waktu: ${input.currentDoc.waktu || "-"}
- Mode Hasil: ${input.currentDoc.hasilMode}

PEDOMAN PER KHUSUS ITEM:
${input.targetField === "hasilPembuka" ? `- Buatkan kalimat pembuka hasil laporan yang formal. Contoh: "Sehubungan dengan pelaksanaan perjalanan dinas tersebut di atas, berikut kami laporkan hasil-hasil kegiatan yang telah dicapai:"` : ""}
${input.targetField === "hasilPoin" ? `- Buatkan butir-butir poin hasil kegiatan yang jelas, ringkas, konkret, dan berbasis tindakan/kesepakatan yang dicapai.` : ""}
${input.targetField === "hasilNarasi" ? `- Buatkan uraian narasi lengkap berbentuk paragraf yang runtut menceritakan jalannya kegiatan, poin penting, serta tindak lanjut yang disepakati.` : ""}
${!userInstruction ? "\nJika tidak ada instruksi khusus: susun teks/poin yang baku, lugas, dan rapi sesuai kaidah birokrasi daerah." : ""}

${
  isListField
    ? `KEMBALIKAN FORMAT JSON BERIKUT:
{
  "items": [
    "Butir hasil kegiatan 1",
    "Butir hasil kegiatan 2"
  ]
}`
    : `KEMBALIKAN FORMAT JSON BERIKUT:
{
  "text": "Teks kalimat / paragraf ${input.targetField} yang dihasilkan."
}`
}`;

  // Coba Groq dahulu
  try {
    const result = await callGroq(prompt, SYSTEM_PROMPT_LAPORAN);
    if (isListField) {
      const items = Array.isArray(result.items)
        ? result.items.map(String)
        : [String(result.items || result.text || "")];
      return { items, source: "Groq" };
    } else {
      return { text: String(result.text || ""), source: "Groq" };
    }
  } catch (groqError: any) {
    console.warn("[AI Laporan Fallback] Groq gagal, mencoba Gemini...", groqError.message);
    try {
      const result = await callGemini(prompt, SYSTEM_PROMPT_LAPORAN);
      if (isListField) {
        const items = Array.isArray(result.items)
          ? result.items.map(String)
          : [String(result.items || result.text || "")];
        return { items, source: "Gemini" };
      } else {
        return { text: String(result.text || ""), source: "Gemini" };
      }
    } catch (geminiError: any) {
      console.error("[AI Laporan Fallback] Gemini juga gagal:", geminiError.message);
      throw groqError;
    }
  }
}
