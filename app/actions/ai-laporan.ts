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

async function callOpenRouter(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not found");

  const models = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "mistralai/mistral-small-24b-instruct-2501:free",
  ];

  let lastError: any = null;
  for (const model of models) {
    try {
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://sipadin.id",
          "X-Title": "SIPADIN Web AI",
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenRouter Error (${res.status}): ${err}`);
      }

      const json = await res.json();
      const rawText = json.choices?.[0]?.message?.content;
      if (!rawText) throw new Error("Empty content");

      return { data: parseStructuredJson(rawText), model };
    } catch (e: any) {
      lastError = e;
      console.warn(`[OpenRouter AI Laporan] Model ${model} gagal:`, e.message || e);
      continue;
    }
  }

  throw lastError || new Error("OpenRouter all models failed");
}

async function callGroq(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY belum dikonfigurasi di file .env. Harap masukkan API key dari Groq Cloud."
    );
  }

  const models = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768"
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

      return { data: parseStructuredJson(rawText), model };
    } catch (e: any) {
      lastError = e;
      console.warn(`[Groq AI Laporan] Model ${model} gagal:`, e.message || e);
      continue;
    }
  }

  throw lastError || new Error("Gagal menghubungkan ke Groq.");
}

async function callGemini(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env.");
  }

  const candidateModels = [
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash",
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
      console.log(`[Gemini AI Laporan] Model ${modelPath} merespons dalam ${Date.now() - startTime}ms dengan status: ${res.status}`);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Error (${res.status}) pada ${modelPath}: ${errText}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini tidak mengembalikan respons teks.");
      }

      return { data: parseStructuredJson(rawText), model: modelPath.replace("models/", "") };
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e;
      console.warn(`[Gemini AI Laporan] Model ${modelPath} gagal:`, e.message || e);
      continue;
    }
  }

  throw lastError || new Error("Gagal menghubungi layanan AI.");
}

async function callAiUnified(prompt: string, systemInstruction?: string): Promise<{ data: any; source: string }> {
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await callOpenRouter(prompt, systemInstruction);
      const cleanName = res.model.split("/").pop()?.replace(":free", "") || res.model;
      return { data: res.data, source: `OpenRouter (${cleanName})` };
    } catch (err: any) {
      console.warn("[AI Unified Laporan] OpenRouter gagal, fallback ke Groq:", err.message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const res = await callGroq(prompt, systemInstruction);
      return { data: res.data, source: `Groq (${res.model})` };
    } catch (err: any) {
      console.warn("[AI Unified Laporan] Groq gagal, fallback ke Gemini:", err.message);
    }
  }

  const res = await callGemini(prompt, systemInstruction);
  return { data: res.data, source: `Gemini (${res.model})` };
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
): Promise<{ text?: string; items?: string[]; source: string }> {
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

  const res = await callAiUnified(prompt, SYSTEM_PROMPT_LAPORAN);
  const result = res.data;

  if (isListField) {
    const items = Array.isArray(result.items)
      ? result.items.map(String)
      : [String(result.items || result.text || "")];
    return { items, source: res.source };
  } else {
    return { text: String(result.text || ""), source: res.source };
  }
}
