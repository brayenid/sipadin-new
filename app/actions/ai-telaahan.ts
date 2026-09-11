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
Tugas Anda adalah menyusun naskah dinas "Telaahan Staf" yang formal, lugas, mengalir alami, dan sesuai kaidah tata naskah dinas kedinasan Indonesia.

PEDOMAN STRUKTUR & POLA PENULISAN (IKUTI POLA PRESET DAERAH SECARA FLEKSIBEL & KONTEKSTUAL):
Masing-masing bagian memiliki fungsi spesifik dan TIDAK BOLEH saling tumpang tindih (anti-redundansi):

1. "dasar" (WAJIB SATU PARAGRAF NARATIF MENGALIR - BUKAN POIN/NUMBERED LIST):
   - HARUS berupa 1 (satu) paragraf narasi mengalir utuh tanpa penomoran (dilarang keras menggunakan 1, 2, 3 atau bullet point).
   - RELEVANSI STATUS INISIASI (SANGAT PENTING):
     * JIKA BERDASARKAN SURAT UNDANGAN (isUndangan = true): Rujukan UTAMA adalah surat undangan tersebut. Pola kalimat: "Dalam rangka menindaklanjuti Surat Undangan dari [Pengirim], Nomor: [Nomor Undangan], tanggal [Tanggal Undangan], perihal [Perihal Undangan], maka dipandang perlu menugaskan pejabat/pegawai terkait guna menghadiri agenda tersebut."
     * JIKA MERUPAKAN INISIATIF DINAS / NON-UNDANGAN (isUndangan = false): Rujukan adalah pelaksanaan tugas pokok dan fungsi (tupoksi), pembinaan teknis, monitoring evaluasi, konsultasi ke instansi pembina, atau pemenuhan target program kerja. JANGAN mengarang surat undangan jika statusnya inisiatif! Pola kalimat: "Dalam rangka [maksud/tujuan kegiatan, misal: optimalisasi pelayanan publik / pembinaan teknis / konsultasi regulasi], diperlukan langkah nyata berupa penugasan personel untuk melaksanakan koordinasi teknis dan verifikasi langsung..."
   - DILARANG memecah menjadi list pasal undang-undang bernomor layaknya dasar hukum SPT/Konsideran.

2. "praAnggapan" (DAFTAR POIN ASUMSI & PREMIS LOGIS AWAL - LUWES & FLEKSIBEL):
   - Berupa array string poin-poin kalimat (tanpa nomor manual).
   - TIDAK HARUS DAN JANGAN SELALU menyebut "DPA/anggaran" secara kaku di setiap telaahan jika tidak relevan. Buat premis logis yang bervariasi dan kontekstual sesuai substansi kegiatan, seperti:
     * Efektivitas metode koordinasi langsung/tatap muka dibandingkan komunikasi daring untuk pembahasan teknis yang kompleks.
     * Mitigasi risiko keterlambatan pelaporan, kekeliruan administrasi, atau ketidaksesuaian regulasi di kemudian hari.
     * Kesiapan dan kapasitas personel yang ditugaskan untuk menyerap materi serta mendiseminasikannya ke unit kerja.
     * Dampak strategis kehadiran perwakilan daerah dalam forum koordinasi atau pengambilan kebijakan.
     * Ketersediaan dukungan sumber daya atau alokasi kegiatan yang mendukung kelancaran pelaksanaan tugas.

3. "fakta" (DAFTAR POIN FAKTA OBYEKTIF & KONDISI RIIL):
   - Berupa array string poin-poin (tanpa nomor manual).
   - Memuat fakta riil lapangan yang relevan: kepastian jadwal, tempat pelaksanaan, agenda/isu krusial yang dibahas, kondisi riil layanan/OPP di lapangan, atau regulasi teknis spesifik yang mengharuskan penyesuaian (misal: Permenpan/Permendagri). JANGAN mengulang teks kalimat dasar di sini.

4. "analisis" (PARAGRAF NARASI TELAAH SUBSTANSI):
   - Berupa 1-2 paragraf narasi mendalam yang menganalisis urgensi, kemanfaatan, konsekuensi jika tidak hadir/laksana, serta kontribusinya terhadap peningkatan kinerja perangkat daerah. DILARANG membuat numbered list. JANGAN mengulang rincian tanggal atau nama personel yang sudah ada di fakta.

5. "kesimpulan" (SINTESIS PADAT 1-2 KALIMAT):
   - Kalimat konklusif yang menegaskan bahwa berdasarkan urgensi, pertimbangan teknis, dan kesiapan yang ada, usulan perjalanan dinas ini dinilai tepat, penting, dan telah memenuhi syarat untuk dilaksanakan.

6. "saran" (USULAN KONKRET TINDAKAN KEPADA ATASAN):
   - Berupa 1 paragraf usulan konkrit kepada pimpinan (Bupati/Sekretaris Daerah) untuk berkenan memberikan persetujuan penugasan serta menandatangani Surat Perintah Tugas (SPT) dan Surat Perintah Perjalanan Dinas (SPD).

ATURAN TERPENTING: Jika pada prompt terdapat "INSTRUKSI KHUSUS PENGGUNA" yang terisi, INSTRUKSI TERSEBUT ADALAH PRIORITAS UTAMA DAN HARUS DIPATUHI SEPENUHNYA.
Wajib mengembalikan output dalam format JSON murni.`;

export async function initTelaahanAi(
  input: InitTelaahanInput
): Promise<InitTelaahanResult> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const prompt = `Buatkan draf Telaahan Staf lengkap berdasarkan pola preset naskah dinas dengan data konteks berikut:

DATA KONTEKS:
- Perihal / Maksud: ${input.perihal}
- Apakah berdasarkan Undangan: ${input.isUndangan ? "YA (Berdasarkan Surat Undangan Masuk)" : "TIDAK (Inisiatif Organisasi / Monitoring / Koordinasi Rutin)"}
${
  input.isUndangan
    ? `- Pengirim Undangan: ${input.pengirimUndangan || "Kementerian / Lembaga Terkait"}
- Nomor Surat Undangan: ${input.nomorUndangan || "-"}
- Tanggal Surat Undangan: ${input.tanggalUndangan || "-"}`
    : `- Sifat Kegiatan: Inisiatif tugas pokok dan fungsi dinas / pembinaan teknis / koordinasi internal.`
}
- Rute Perjalanan: ${input.tempatBerangkat || "Sendawar"} menuju ${input.tempatTujuan || "Tujuan Terkait"}
- Waktu Pelaksanaan: ${input.tglBerangkat || "-"} s.d. ${input.tglKembali || "-"}
- Personel / Tim yang Ditugaskan: ${input.personelList?.join(", ") || "-"}
- Catatan / Urgensi Tambahan: ${input.urgensiTambahan || "-"}

INSTRUKSI FORMAT JSON YANG WAJIB DIKEMBALIKAN (IKUTI STRUKTUR & POLA PRESET):
{
  "dasar": "${input.isUndangan ? "Satu paragraf naratif mengalir menindaklanjuti surat undangan resmi pengirim, nomor, tanggal, dan perihal. DILARANG poin/numbered list." : "Satu paragraf naratif mengalir menjelaskan inisiatif pelaksanaan tupoksi / koordinasi teknis dinas tanpa mengada-ada surat undangan. DILARANG poin/numbered list."}",
  "praAnggapan": [
    "Poin pra-anggapan 1 (asumsi logis kontekstual, misal efektivitas koordinasi tatap muka atau mitigasi risiko, luwes tanpa harus kaku menyebut DPA)",
    "Poin pra-anggapan 2 (kapasitas personel atau kesinambungan program kerja)"
  ],
  "fakta": [
    "Poin fakta 1 (fakta riil pelaksanaan, jadwal, agenda atau dasar regulasi teknis)",
    "Poin fakta 2 (kesiapan teknis atau kondisi objektif lapangan)"
  ],
  "analisis": "Paragraf narasi telaah substansi (urgensi kegiatan, manfaat strategis, dan implikasi kinerja). Bukan poin/nomor.",
  "kesimpulan": "Kalimat kesimpulan tegas bahwa usulan penugasan dinilai penting dan memenuhi syarat administratif maupun substantif untuk disetujui.",
  "saran": "Kalimat usulan konkrit: 'Sehubungan dengan hal tersebut, mohon perkenan Bapak/Ibu sekiranya dapat menyetujui penugasan serta menandatangani Surat Tugas dan Surat Perintah Perjalanan Dinas (SPD) bagi pegawai yang ditunjuk.'"
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

  const isUndangan = input.aiInitData?.isUndangan ?? false;

  const initDataText = input.aiInitData
    ? `METADATA INISIALISASI AI:
- Status: ${isUndangan ? "Berdasarkan Surat Undangan Masuk" : "Inisiatif Dinas / Tupoksi Rutin (BUKAN surat undangan)"}
${isUndangan ? `- Pengirim Undangan: ${input.aiInitData.pengirimUndangan || "-"}
- Nomor Undangan: ${input.aiInitData.nomorUndangan || "-"}
- Tanggal Undangan: ${input.aiInitData.tanggalUndangan || "-"}` : "- Sifat: Inisiatif kegiatan internal / konsultasi / monev"}
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

ATURAN STRUKTUR BIDANG "${input.targetField}" SESUAI POLA PRESET & RELEVANSI INISIASI:
${
  input.targetField === "dasar"
    ? `- WAJIB BERBENTUK 1 (SATU) PARAGRAF NARATIF MENGALIR UTUH (DILARANG KERAS membuat nomor 1, 2, 3, bullet, atau poin-poin!).
- SESUAIKAN DENGAN STATUS INISIASI:
  * Jika Berdasarkan Undangan (isUndangan = true): Rujuk langsung Surat Undangan dari ${input.aiInitData?.pengirimUndangan || "instansi pengundang"}, Nomor: ${input.aiInitData?.nomorUndangan || "[nomor]"}, tanggal ${input.aiInitData?.tanggalUndangan || "[tanggal]"}.
  * Jika Inisiatif / Non-Undangan (isUndangan = false): Fokuskan pada tujuan pelaksanaan tupoksi, kebutuhan konsultasi regulasi, atau monev lapangan. DILARANG membuat-buat surat undangan fiktif jika statusnya inisiatif!`
    : input.targetField === "praAnggapan"
    ? `- Berupa poin-poin array string berupa premis logis kontekstual (efektivitas tatap muka, urgensi pemecahan masalah teknis, mitigasi risiko regulasi, kapasitas personel). JANGAN kaku mengharuskan kata 'DPA' pada setiap poin.`
    : input.targetField === "fakta"
    ? `- Berupa poin-poin array string fakta riil objektif (konfirmasi agenda/tempat, dasar regulasi teknis, kondisi riil layanan di lapangan). JANGAN mengulang klausul dasar di sini.`
    : input.targetField === "analisis"
    ? `- Berupa paragraf narasi mendalam mengenai dampak, urgensi substansi, dan manfaat terhadap kinerja organisasi. DILARANG membuat numbered list.`
    : input.targetField === "kesimpulan"
    ? `- Berupa 1-2 kalimat sintesis padat penegasan kelayakan dan pentingnya penugasan disetujui.`
    : `- Berupa 1 paragraf usulan konkrit kepada pimpinan untuk menyetujui penugasan dan menandatangani ST serta SPD.`
}
- DILARANG mengulang narasi atau informasi yang sudah tertulis di sub-poin lain!
${!userInstruction ? "\nJika tidak ada instruksi khusus: sempurnakan draf saat ini agar formal, baku, lugas, mengalir alami, dan sesuai kaidah tata naskah dinas." : ""}

${
  isListField
    ? `KEMBALIKAN FORMAT JSON BERIKUT:
{
  "items": [
    "Poin 1 yang disempurnakan",
    "Poin 2 yang disempurnakan"
  ]
}`
    : `KEMBALIKAN FORMAT JSON BERIKUT:
{
  "text": "Teks paragraf ${input.targetField} yang disempurnakan (dalam 1 paragraf narasi mengalir tanpa penomoran list)."
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
