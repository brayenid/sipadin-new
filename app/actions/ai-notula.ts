"use server";

import { auth } from "@/lib/auth";

export type InitNotulaInput = {
  acara: string;
  hariTanggal?: string;
  pukul?: string;
  tempat?: string;
  ketuaNama?: string;
  ketuaJabatan?: string;
  pesertaRapat?: string;
  catatanRapat?: string;
  instruksiKhusus?: string;
};

export type RefineNotulaInput = {
  currentHtml: string;
  instruction?: string;
  mode?: "grammar" | "conclusion" | "discussion" | "expand" | "custom";
  aiInitData?: {
    acara?: string;
    catatanRapat?: string;
  };
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
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
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
      console.warn(`[OpenRouter AI Notula] Model ${model} gagal:`, e.message || e);
      continue;
    }
  }

  throw lastError || new Error("OpenRouter all models failed");
}

async function callGroq(prompt: string, systemInstruction?: string) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi di file .env.");
  }

  const models = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile"
  ];
  let lastError: any = null;

  for (const model of models) {
    console.log(`[Groq AI Notula] Mencoba model: ${model}...`);
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
      console.warn(`[Groq AI Notula] Model ${model} gagal:`, e.message || e);
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
    "models/gemini-2.5-flash",
    "models/gemini-flash-latest",
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

    console.log(`[Gemini AI Notula] Mencoba model: ${modelPath}...`);
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
      console.warn("[AI Unified Notula] OpenRouter gagal, fallback ke Groq:", err.message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const res = await callGroq(prompt, systemInstruction);
      return { data: res.data, source: `Groq (${res.model})` };
    } catch (err: any) {
      console.warn("[AI Unified Notula] Groq gagal, fallback ke Gemini:", err.message);
    }
  }

  const res = await callGemini(prompt, systemInstruction);
  return { data: res.data, source: `Gemini (${res.model})` };
}

const SYSTEM_PROMPT_NOTULA = `Anda adalah asisten birokrasi profesional untuk Pemerintah Kabupaten Kutai Barat.
Tugas Anda adalah menyusun dan menyempurnakan naskah resmi "Notula Rapat" yang sangat terstruktur, formal, baku, dan sesuai dengan tata naskah dinas kedinasan Indonesia.

STRUKTUR DOKUMEN NOTULA YANG WAJIB DIHASILKAN (GUNAKAN TAG HTML VALID):
<h1>I. PEMBUKAAN</h1>
<ol>
  <li>Penyampaian oleh Pimpinan Rapat:
    <ol>
      <li>Rapat dibuka oleh [Nama & Jabatan Pimpinan] pada pukul [Waktu].</li>
      <li>[Poin maksud/tujuan penyelenggaraan rapat secara padat, formal, dan terukur]</li>
    </ol>
  </li>
</ol>

<h1>II. PEMBAHASAN</h1>
<h2>A. Paparan Utama / Materi Rapat</h2>
<ol>
  <li>[Topik Pembahasan 1]:
    <ol>
      <li>[Rincian regulasi / data teknis / kondisi pelaksanaan faktual 1]</li>
      <li>[Rincian regulasi / data teknis / kondisi pelaksanaan faktual 2]</li>
    </ol>
  </li>
  <li>[Topik Pembahasan 2]:
    <ol>
      <li>[Rincian evaluasi / kendala / strategi yang disepakati]</li>
    </ol>
  </li>
</ol>

<h1>III. TANGGAPAN / TANYA JAWAB</h1>
<ol>
  <li>[Nama Instansi / Peserta Rapat 1]:
    <ol>
      <li><strong>Pertanyaan / Masukan:</strong> [Uraian pertanyaan/masukan peserta]</li>
      <li><strong>Tanggapan / Jawaban:</strong> [Uraian jawaban/arahan pimpinan atau narasumber]</li>
    </ol>
  </li>
  <li>[Nama Instansi / Peserta Rapat 2]:
    <ol>
      <li><strong>Pertanyaan / Masukan:</strong> [Uraian pertanyaan/masukan peserta]</li>
      <li><strong>Tanggapan / Jawaban:</strong> [Uraian jawaban/arahan pimpinan atau narasumber]</li>
    </ol>
  </li>
</ol>

<h1>IV. KESIMPULAN DAN PENUTUP</h1>
<ol>
  <li>[Poin Rekomendasi / Tindak Lanjut Konkret 1]</li>
  <li>[Poin Rekomendasi / Tindak Lanjut Konkret 2]</li>
  <li>Rapat ditutup oleh Pimpinan Rapat pada pukul [Waktu Selesai] WITA.</li>
</ol>

PEDOMAN PENULISAN:
- Selalu gunakan tag <h1> untuk Bab Utama (I. PEMBUKAAN, II. PEMBAHASAN, III. TANGGAPAN / TANYA JAWAB, IV. KESIMPULAN DAN PENUTUP).
- Selalu gunakan tag <h2> untuk Sub-Bab di dalam pembahasan.
- Selalu gunakan tag <ol><li> untuk poin utama, dan nested <ol><li> untuk rincian sub-poin (karena di sistem akan otomatis terformat menjadi a., b., dst).
- Gunakan bahasa Indonesia resmi kedinasan (EYD V), jelas, padat, dan profesional.
- Kembalikan HANYA format JSON murni dengan field "htmlContent".`;

export async function initNotulaAi(
  input: InitNotulaInput
): Promise<{ htmlContent: string; source: string }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const prompt = `Susunlah draf naskah Notula Rapat lengkap berdasarkan data berikut:

DATA RAPAT:
- Acara / Judul Rapat: ${input.acara || "Rapat Koordinasi Dinas"}
- Hari, Tanggal: ${input.hariTanggal || "Sesuai Jadwal"}
- Waktu: ${input.pukul || "09.00 WITA – Selesai"}
- Tempat: ${input.tempat || "Ruang Rapat Dinas"}
- Pimpinan Rapat: ${input.ketuaNama || "Pimpinan Rapat"} (${input.ketuaJabatan || "Kepala Bagian"})
- Peserta / OPD yang Hadir: ${input.pesertaRapat || "Para Pejabat Struktural, Fungsional, dan Staf Terkait"}
- Catatan / Pokok Bahasan Rapat:
${input.catatanRapat || "Membahas evaluasi kinerja, percepatan program kegiatan, serta penyelarasan regulasi dan tata kelola birokrasi."}

${input.instruksiKhusus ? `⭐ INSTRUKSI KHUSUS PENGGUNA (WAJIB DIPATUHI):
${input.instruksiKhusus}` : ""}

KEMBALIKAN FORMAT JSON BERIKUT:
{
  "htmlContent": "<h1>I. PEMBUKAAN</h1><ol><li>...</li></ol>..."
}`;

  const res = await callAiUnified(prompt, SYSTEM_PROMPT_NOTULA);
  return { htmlContent: String(res.data.htmlContent || ""), source: res.source };
}

export async function refineNotulaAi(
  input: RefineNotulaInput
): Promise<{ htmlContent: string; source: string }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  let instructionGuidance = input.instruction?.trim() || "";

  if (input.mode === "grammar") {
    instructionGuidance = "Perbaiki tata bahasa, ejaan baku (EYD V), tanda baca, dan formalitas kalimat agar sangat rapi tanpa mengubah esensi isi rapat.";
  } else if (input.mode === "conclusion") {
    instructionGuidance = "Pertajam dan rapikan bagian IV. KESIMPULAN DAN PENUTUP agar menghasilkan butir rekomendasi serta rencana tindak lanjut yang konkret, terukur, dan memiliki penanggung jawab yang jelas.";
  } else if (input.mode === "discussion") {
    instructionGuidance = "Perluas dan lengkapi bagian III. TANGGAPAN / TANYA JAWAB dengan dinamika diskusi yang lebih hidup, pertanyaan berbobot dari OPD terkait, serta jawaban arahan yang solutif.";
  } else if (input.mode === "expand") {
    instructionGuidance = "Perdalam dan kembangkan seluruh isi pembahasan agar lebih komprehensif, berbasis data/regulasi, dan memiliki alur bahasan yang sangat detail.";
  }

  const prompt = `Anda diminta untuk menyempurnakan dan memperbarui naskah Notula Rapat berikut:

${instructionGuidance ? `⭐ INSTRUKSI PENYEMPURNAAN (PRIORITAS UTAMA):
${instructionGuidance}
` : ""}

DRAF NOTULA SAAT INI (HTML):
${input.currentHtml}

${input.aiInitData?.catatanRapat ? `KONTEKS CATATAN RAPAT ASLI:
${input.aiInitData.catatanRapat}` : ""}

ATURAN PENTING:
- Tetap pertahankan struktur baku naskah Notula resmi (I. PEMBUKAAN, II. PEMBAHASAN, III. TANGGAPAN / TANYA JAWAB, IV. KESIMPULAN DAN PENUTUP).
- Gunakan tag HTML yang tepat (<h1>, <h2>, <ol>, <li>, <strong>).
- Kembalikan seluruh naskah notula yang telah disempurnakan.

KEMBALIKAN FORMAT JSON BERIKUT:
{
  "htmlContent": "<h1>I. PEMBUKAAN</h1><ol><li>...</li></ol>..."
}`;

  const res = await callAiUnified(prompt, SYSTEM_PROMPT_NOTULA);
  return { htmlContent: String(res.data.htmlContent || ""), source: res.source };
}
