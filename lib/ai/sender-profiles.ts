/**
 * Modul Profil Pengirim WhatsApp & Kamus Dialek Dayak Benuaq
 * SIPADIN Assistant AI - Kabupaten Kutai Barat
 */

export interface SenderContact {
  panggilan: string;
  namaLengkap?: string;
  peran?: string;
}

// 1. DAFTAR KONTAK & PANGGILAN KUSTOM
export const SENDER_PROFILES: Record<string, SenderContact> = {
  "628115444166": { panggilan: "Tuaq Ucoy" },
  "6282158148148": { panggilan: "Men Oboy" },
  "6282251702012": { panggilan: "Njos" },
  "6282253523350": { panggilan: "Bos Ap" },
  "6282158120262": { panggilan: "Men Al" },
  "6282254835097": { panggilan: "Dai" },
  "628115819948": { panggilan: "B7R" },
  "6281355139018": { panggilan: "Pak Pres" },
};

/**
 * Normalisasi nomor HP ke format 62xxxxxxxxxxx
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = String(raw || "").split("@")[0].split(":")[0].replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (!digits.startsWith("62") && digits.length >= 9) {
    return `62${digits}`;
  }
  return digits;
}

/**
 * Cari profil pengirim berdasarkan nomor HP
 */
export function getSenderProfile(rawNumber: string): SenderContact | null {
  const clean = normalizePhoneNumber(rawNumber);
  if (!clean) return null;

  if (SENDER_PROFILES[clean]) {
    return SENDER_PROFILES[clean];
  }

  // Coba pencocokan substring ujung nomor (9 digit terakhir)
  const last9 = clean.slice(-9);
  for (const [key, profile] of Object.entries(SENDER_PROFILES)) {
    if (key.slice(-9) === last9) {
      return profile;
    }
  }

  return null;
}

// 2. KAMUS & PANDUAN PENGGUNAAN FRASA DAYAK BENUAQ
export const BENUAQ_DICTIONARY = [
  {
    frasa: "makasih deoq",
    arti: "terima kasih",
    kegunaan: "Gunakan untuk mengucapkan terima kasih.",
  },
  {
    frasa: "ijoq beneh",
    arti: "itu aja",
    kegunaan: "Gunakan untuk menutup kalimat atau penyampaian data yang relevan (misal: 'Nih datanya, ijoq beneh ya!').",
  },
  {
    frasa: "heq togaq agi ap",
    arti: "gatau juga aku / tidak tahu",
    kegunaan: "Gunakan saat bingung sama pertanyaan atau saat data yang dicari tidak ditemukan di database.",
  },
  {
    frasa: "oyoq",
    arti: "kawan / teman / bro",
    kegunaan: "Gunakan sesekali sebagai pengganti kata 'bro' / kawan secara natural (jangan terlalu berlebihan).",
  },
];
