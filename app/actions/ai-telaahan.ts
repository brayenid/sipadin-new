"use server";

import { auth } from "@/lib/auth";

export type InitTelaahanInput = {
  isUndangan: boolean;
  pengirimUndangan?: string;
  nomorUndangan?: string;
  tanggalUndangan?: string;
  perihal: string;
  tempatBerangkat?: string;
  tempatTujuan?: string;
  tglBerangkat?: string;
  tglKembali?: string;
  personelList?: string[];
  urgensiTambahan?: string;
};

export type InitTelaahanResult = {
  dasar: string;
  praAnggapan: string[];
  fakta: string[];
  analisis: string;
  kesimpulan: string;
  saran: string;
};

function parseStructuredJson(rawText: string) {
  let cleanText = rawText.trim();
  
  // 1. Bersihkan tag markdown code block ```json ... ``` jika ada
  if (cleanText.includes("```")) {
    const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleanText = match[1].trim();
    }
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    // 2. Coba ambil area kurung kurawal pertama { ... } jika ada teks pendahuluan
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

async function callDeepSeek(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not found");

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek Error (${res.status}): ${err}`);
  }

  const json = await res.json();
  const rawText = json.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("Empty content from DeepSeek");

  return { data: parseStructuredJson(rawText), model: "DeepSeek V3" };
}

async function callGroq(prompt: string, systemInstruction?: string) {
  const rawKey = process.env.GROQ_API_KEY?.trim() || "";
  const keys = rawKey.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi di file .env.");
  }

  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ];
  let lastError: any = null;

  for (const apiKey of keys) {
    for (const model of models) {
      try {
        const messages: any[] = [];
        if (systemInstruction) {
          messages.push({ role: "system", content: systemInstruction });
        }
        messages.push({ role: "user", content: prompt });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
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
        continue;
      }
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
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
  ];

  let lastError: Error | null = null;

  for (const modelPath of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:generateContent?key=${apiKey}`;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini Error (${res.status}) pada ${modelPath}: ${errText}`);
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Gemini tidak mengembalikan respons teks.");
      }

      return { data: parseStructuredJson(rawText), model: modelPath };
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e;
      continue;
    }
  }

  throw lastError || new Error("Gagal menghubungi layanan AI.");
}

async function callAiUnified(prompt: string, systemInstruction?: string): Promise<{ data: any; source: string }> {
  // 1. Coba DeepSeek Official (Utama - Kualitas Terbaik untuk Naskah Birokrasi)
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const res = await callDeepSeek(prompt, systemInstruction);
      return { data: res.data, source: `DeepSeek (${res.model})` };
    } catch (err: any) {
      console.warn("[AI Unified Telaahan] DeepSeek gagal, fallback ke Groq:", err.message);
    }
  }

  // 2. Coba Groq (Fallback 1)
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await callGroq(prompt, systemInstruction);
      return { data: res.data, source: `Groq (${res.model})` };
    } catch (err: any) {
      console.warn("[AI Unified Telaahan] Groq gagal, fallback ke Gemini:", err.message);
    }
  }

  // 3. Coba Gemini (Fallback 2)
  const res = await callGemini(prompt, systemInstruction);
  return { data: res.data, source: `Gemini (${res.model})` };
}

const SYSTEM_PROMPT_TELAAHAN = `Anda adalah asisten birokrasi profesional untuk Pemerintah Kabupaten Kutai Barat.
Tugas Anda adalah menyusun naskah dinas "Telaahan Staf" yang formal, lugas, baku, dan sesuai kaidah tata naskah dinas kedinasan Indonesia.

PEDOMAN INTEGRITAS & ANTI-REDUNDANSI ANTAR SUB-POIN:
Masing-masing sub-poin memiliki peran spesifik dan TIDAK BOLEH saling tumpang tindih (redundant):
1. "dasar": Berisi dasar hukum, DPA, atau rincian surat undangan masuk (pengirim, nomor, tanggal, perihal). Dilarang menyertakan analisis dampak atau usulan tindakan di sini.
2. "praAnggapan": Berupa poin-poin asumsi strategis, premis logis, atau kondisi awal mengapa telaahan ini penting sebelum kegiatan berlangsung.
3. "fakta": Hanya berisi fakta-fakta objektif lapangan (jadwal, rute/lokasi, personel yang ditugaskan, agenda pokok). Dilarang mengulang kembali isi pasal peraturan atau kalimat normatif yang ada di dasar.
4. "analisis": Analisis dampak, urgensi, konsekuensi risiko jika tidak dilaksanakan, serta keterkaitan dengan kinerja dinas/daerah. PENTING: JANGAN mengulang kembali fakta mentah (seperti menyebut ulang tanggal, daftar lengkap nama personel, atau nomor surat yang sudah ada di Fakta/Dasar). Fokus murni pada penafsiran implikasi, efektivitas, dan nilai strategis.
5. "kesimpulan": Sintesis padat dan konklusif 1-2 kalimat dari hasil analisis. Menegaskan perlunya persetujuan atau tindak lanjut.
6. "saran": Rekomendasi tindakan konkret dan operasional yang dimintakan kepada pimpinan (misal: mohon perkenan Bapak Bupati/Sekda menerbitkan Surat Perintah Tugas dan Surat Perjalanan Dinas).

ATURAN TERPENTING: Jika pada prompt terdapat "INSTRUKSI KHUSUS PENGGUNA" yang terisi, INSTRUKSI TERSEBUT ADALAH PRIORITAS UTAMA DAN HARUS DIPATUHI SEPENUHNYA — mengesampingkan pedoman gaya default di atas jika bertentangan. Contoh: jika user meminta bahasa Inggris, gunakan bahasa Inggris. Jika user meminta ringkas, buat singkat.
Wajib mengembalikan output dalam format JSON murni.`;

export async function initTelaahanAi(
  input: InitTelaahanInput
): Promise<InitTelaahanResult> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const prompt = `Buatkan draf Telaahan Staf lengkap berdasarkan data konteks berikut:

DATA KONTEKS:
- Perihal / Maksud: ${input.perihal}
- Apakah berdasarkan Undangan: ${input.isUndangan ? "YA (Berdasarkan Surat Undangan Masuk)" : "TIDAK (Inisiatif Organisasi / Monitoring / Koordinasi Rutin)"}
${
  input.isUndangan
    ? `- Pengirim Undangan: ${input.pengirimUndangan || "Kementerian / Lembaga Terkait"}
- Nomor Surat Undangan: ${input.nomorUndangan || "-"}
- Tanggal Surat Undangan: ${input.tanggalUndangan || "-"}`
    : `- Sifat Kegiatan: Inisiatif tugas pokok dan fungsi dinas / koordinasi teknis internal.`
}
- Rute Perjalanan: ${input.tempatBerangkat || "Sendawar"} menuju ${input.tempatTujuan || "Tujuan Terkait"}
- Waktu Pelaksanaan: ${input.tglBerangkat || "-"} s.d. ${input.tglKembali || "-"}
- Personel / Tim yang Ditugaskan: ${input.personelList?.join(", ") || "-"}
- Catatan / Urgensi Tambahan: ${input.urgensiTambahan || "-"}

INSTRUKSI FORMAT JSON YANG WAJIB DIKEMBALIKAN:
{
  "dasar": "Teks kalimat dasar. Jika ada surat undangan, sebutkan pengirim, nomor surat (jika ada), tanggal, dan perihal surat tersebut. Jika bukan undangan, rujuk pada Tupoksi dan DPA instansi terkait.",
  "praAnggapan": [
    "Poin pra-anggapan 1 (misal: Bahwa kegiatan ini sangat penting untuk...)",
    "Poin pra-anggapan 2 (misal: Bahwa keterlibatan personel...)"
  ],
  "fakta": [
    "Poin fakta 1 (fakta objektif pelaksanaan, lokasi, tanggal, pengundang/urgensi)",
    "Poin fakta 2 (fakta kesiapan personel atau kebutuhan teknis)"
  ],
  "analisis": "Paragraf analisis mendalam mengenai dampak, manfaat, dan risiko jika tidak dihadiri/dilaksanakan.",
  "kesimpulan": "Kalimat kesimpulan yang tegas dan padat.",
  "saran": "Kalimat saran tindakan konkrit kepada atasan/Sekretaris Daerah (misal: Kiranya berkenan menyetujui penugasan...)."
}`;

  const res = await callAiUnified(prompt, SYSTEM_PROMPT_TELAAHAN);
  const result = res.data;

  return {
    dasar: String(result.dasar || ""),
    praAnggapan: Array.isArray(result.praAnggapan)
      ? result.praAnggapan.map(String)
      : [String(result.praAnggapan || "")],
    fakta: Array.isArray(result.fakta)
      ? result.fakta.map(String)
      : [String(result.fakta || "")],
    analisis: String(result.analisis || ""),
    kesimpulan: String(result.kesimpulan || ""),
    saran: String(result.saran || ""),
  };
}

export type RefineFieldInput = {
  targetField: "dasar" | "praAnggapan" | "fakta" | "analisis" | "kesimpulan" | "saran";
  instruction?: string;
  aiInitData?: {
    isUndangan: boolean;
    pengirimUndangan?: string;
    nomorUndangan?: string;
    tanggalUndangan?: string;
    perihal: string;
    urgensiTambahan?: string;
  };
  currentDoc: {
    perihal: string;
    dasar: string;
    praAnggapan: string[];
    fakta: string[];
    analisis: string;
    kesimpulan: string;
    saran: string;
  };
};

export async function refineFieldAi(
  input: RefineFieldInput
): Promise<{ text?: string; items?: string[]; source: string }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const isListField =
    input.targetField === "praAnggapan" || input.targetField === "fakta";

  const rawValue = input.currentDoc[input.targetField];
  const currentValue = Array.isArray(rawValue)
    ? rawValue.filter((x: string) => x.trim() !== "")
    : (rawValue as string)?.trim() || "";
  const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : Boolean(currentValue);

  const existingReferenceText = hasValue
    ? `\n⚠️ DRAF SAAT INI (RUJUKAN UTAMA):
${isListField ? JSON.stringify(currentValue) : currentValue}
Tugas Anda adalah MEMPERBAIKI, MENYEMPURNAKAN, dan MENYELARASKAN draf saat ini di atas agar lebih formal dan mengalir indah sesuai gaya penulisan daerah. JANGAN mengabaikan draf tersebut; jadikan sebagai rujukan utama.`
    : "";

  const initDataText = input.aiInitData
    ? `METADATA INISIALISASI AI:
- Status: ${input.aiInitData.isUndangan ? "Berdasarkan Surat Undangan Masuk" : "Inisiatif/Tupoksi Rutin"}
${input.aiInitData.isUndangan ? `- Pengirim Undangan: ${input.aiInitData.pengirimUndangan || "-"}
- Nomor Undangan: ${input.aiInitData.nomorUndangan || "-"}
- Tanggal Undangan: ${input.aiInitData.tanggalUndangan || "-"}` : ""}
- Perihal Init: ${input.aiInitData.perihal || "-"}
- Urgensi/Catatan Tambahan: ${input.aiInitData.urgensiTambahan || "-"}`
    : "METADATA INISIALISASI AI: (Belum ada)";

  const userInstruction = input.instruction?.trim();

  const prompt = `Anda diminta untuk menyusun atau menyempurnakan KHUSUS bagian "${input.targetField}" dari dokumen Telaahan Staf berikut:

${userInstruction ? `⭐ INSTRUKSI KHUSUS PENGGUNA (PRIORITAS TERTINGGI — PATUHI SEPENUHNYA):
${userInstruction}
` : ""}
${initDataText}
${existingReferenceText}

KONTEKS TELAAHAN SAAT INI (FORM STATE):
- Perihal: ${input.currentDoc.perihal || "-"}
- Dasar: ${input.currentDoc.dasar || "-"}
- Pra-Anggapan: ${JSON.stringify(input.currentDoc.praAnggapan || [])}
- Fakta yang Mempengaruhi: ${JSON.stringify(input.currentDoc.fakta || [])}
- Analisis: ${input.currentDoc.analisis || "-"}
- Kesimpulan: ${input.currentDoc.kesimpulan || "-"}
- Saran: ${input.currentDoc.saran || "-"}

PEDOMAN GAYA PENULISAN & ANTI-REDUNDANSI (abaikan jika bertentangan dengan instruksi khusus di atas):
- Perhatikan KONTEKS TELAAHAN SAAT INI di atas. DILARANG mengulang narasi atau informasi yang sudah tertulis di sub-poin lain!
- Jika targetField = "dasar": Fokus pada legalitas dasar/surat undangan. Hindari menganalisis dampak atau memberi usulan.
- Jika targetField = "praAnggapan": Berupa poin-poin asumsi logis/urgensi awal.
- Jika targetField = "fakta": Berupa poin fakta objektif (waktu, lokasi, pelaksana). JANGAN mengulang klausul dasar hukum di sini.
- Jika targetField = "analisis": Analisis dampak strategis, risiko jika tidak hadir/laksana, dan urgensi tugas. JANGAN mengulang tanggal/lokasi/daftar nama personel yang sudah ada di Fakta.
- Jika targetField = "kesimpulan": Padat dan tegas (1-2 kalimat) mengikat hasil analisis.
- Jika targetField = "saran": Usulan tindakan konkret spesifik kepada pimpinan.
${!userInstruction ? "\nJika tidak ada instruksi khusus: tulis draf baru atau sempurnakan teks agar formal, padat, lugas, dan terbebas dari pengulangan kata/kalimat redundan." : ""}

${
  isListField
    ? `KEMBALIKAN FORMAT JSON BERIKUT:
{
  "items": [
    "Poin 1 yang dihasilkan/disempurnakan",
    "Poin 2 yang dihasilkan/disempurnakan"
  ]
}`
    : `KEMBALIKAN FORMAT JSON BERIKUT:
{
  "text": "Teks isi ${input.targetField} yang dihasilkan/disempurnakan."
}`
}`;

  const res = await callAiUnified(prompt, SYSTEM_PROMPT_TELAAHAN);
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
