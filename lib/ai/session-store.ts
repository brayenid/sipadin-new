/**
 * In-Memory Session & State Store untuk Percakapan WhatsApp
 * Menyimpan riwayat obrolan (maks 10 pesan terakhir) dan draft SPJ yang menunggu konfirmasi "SIMPAN".
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface PendingDraftSpj {
  id: string; // generated draft ID (e.g. draft_12345)
  jenisSpj: "PERJADIN" | "MAKAN_MINUM" | "HONORARIUM" | "OPERASIONAL";
  teamId: string;
  createdById: string;
  kodeRekeningId: string;
  perihal: string;
  totalPengeluaran: string; // BigInt serialized as string
  metaDokumen: any;
  perjadinDetail?: {
    tempatBerangkat: string;
    tempatTujuan: string;
    tglBerangkat: string; // ISO string
    tglKembali: string; // ISO string
    lamaPerjalanan: number;
    alatAngkut: string;
    tingkatPerjadin?: string;
  };
  rosterItems?: Array<{
    pegawaiId: string;
    order: number;
    role: "KEPALA_JALAN" | "PENGIKUT";
    nama: string;
    nip?: string | null;
    jabatan: string;
    golongan?: string | null;
    pangkat?: string | null;
  }>;
  maminDetail?: {
    vendorId: string;
    namaRapat: string;
    jumlahPeserta: number;
  };
  pengeluaranDetails: Array<{
    spjRosterItemId?: string; // index or id
    kategori?: string;
    uraian: string;
    hargaSatuan: string; // BigInt serialized
    qty: number;
    satuan: string;
    total: string; // BigInt serialized
  }>;
  createdAt: number;
}

interface UserSession {
  messages: ChatMessage[];
  pendingDraft: PendingDraftSpj | null;
  lastActive: number;
}

const sessions = new Map<string, UserSession>();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 Menit tidak aktif ➔ Reset

/**
 * Ambil session user berdasarkan sender key (nomor WA atau Group ID + sender)
 */
export function getSession(key: string): UserSession {
  cleanExpiredSessions();
  
  let session = sessions.get(key);
  if (!session) {
    session = {
      messages: [],
      pendingDraft: null,
      lastActive: Date.now(),
    };
    sessions.set(key, session);
  } else {
    session.lastActive = Date.now();
  }
  return session;
}

/**
 * Tambah pesan ke riwayat chat user (maksimal 10 pesan terakhir untuk hemat token)
 */
export function addMessageToSession(key: string, msg: ChatMessage) {
  const session = getSession(key);
  session.messages.push(msg);
  if (session.messages.length > 10) {
    session.messages = session.messages.slice(-10);
  }
  session.lastActive = Date.now();
}

/**
 * Set pending draft yang siap di-commit saat user balas "SIMPAN"
 */
export function setPendingDraft(key: string, draft: PendingDraftSpj) {
  const session = getSession(key);
  session.pendingDraft = draft;
  session.lastActive = Date.now();
}

/**
 * Hapus pending draft setelah berhasil disimpan atau dibatalkan
 */
export function clearPendingDraft(key: string) {
  const session = getSession(key);
  session.pendingDraft = null;
}

/**
 * Reset seluruh session
 */
export function resetSession(key: string) {
  sessions.delete(key);
}

/**
 * Pembersihan otomatis session kedaluwarsa
 */
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}
