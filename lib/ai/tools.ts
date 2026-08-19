/**
 * Definisi Tools & Backend Handler SIPADIN AI WhatsApp Assistant (Versi Sederhana & Fokus)
 */

import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";

// ==========================================
// 1. TOOL DEFINITIONS (OpenAI / Groq Format)
// ==========================================
export const AI_TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "get_unpaid_spjs",
      description: "List SPJ belum bayar (default 10).",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "string", description: "Jumlah maksimal data, contoh '10'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_spj_payment_status",
      description: "Ubah status bayar SPJ (lunas/belum) berdasarkan BKU, nama, atau perihal.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { type: "string" },
          terbayar: { type: "boolean" },
        },
        required: ["searchQuery", "terbayar"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_missing_drive_spjs",
      description: "List SPJ tanpa link drive/bukti.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "string", description: "Jumlah maksimal data, contoh '10'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_spj_drive_url",
      description: "Update link Google Drive SPJ.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { type: "string" },
          driveUrl: { type: "string" },
        },
        required: ["searchQuery", "driveUrl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_nip_direct",
      description: "Cari NIP pegawai dari nama.",
      parameters: {
        type: "object",
        properties: {
          nama: { type: "string" },
        },
        required: ["nama"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_available_budget_categories",
      description: "List nama sub-kegiatan/rekening anggaran.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_specific_budget_detail",
      description: "Cek detail sisa saldo sub-kegiatan/rekening.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_travel_budget_feasibility",
      description: "Cek kecukupan anggaran dinas (5.1.02.04).",
      parameters: {
        type: "object",
        properties: {
          estimasiBiaya: { type: "string", description: "Estimasi nominal biaya perjalanan dinas, contoh '5000000'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_naskah_dinas",
      description: "List naskah dinas/surat resmi.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "string", description: "Jumlah maksimal data, contoh '10'." },
          jenisNaskah: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_naskah_dinas_detail",
      description: "Baca detail isi naskah dinas dari ID/nomor.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { type: "string" },
        },
        required: ["searchQuery"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_agenda_absensi",
      description: "List agenda absensi rapat OPD.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "string", description: "Jumlah maksimal data, contoh '10'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_agenda_tim",
      description: "List agenda kegiatan tim dari kalender (bisa filter kata kunci/judul atau tanggal tertentu).",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { type: "string", description: "Filter berdasarkan judul atau lokasi (opsional)." },
          tanggal: { type: "string", description: "Filter tanggal tertentu format YYYY-MM-DD (opsional)." },
          limit: { type: "string", description: "Maksimal data yang diambil, contoh '10'." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_agenda_tim",
      description: "Catat jadwal kegiatan/rapat/perjadin ke kalender kerja internal tim (tanpa form presensi mandiri publik).",
      parameters: {
        type: "object",
        properties: {
          judul: { type: "string", description: "Nama / judul kegiatan agenda internal tim." },
          tanggalMulai: { type: "string", description: "Tanggal mulai format YYYY-MM-DD." },
          tanggalSelesai: { type: "string", description: "Tanggal selesai format YYYY-MM-DD (opsional)." },
          waktuMulai: { type: "string", description: "Waktu mulai misal '09:00' atau '19:00' (opsional)." },
          waktuSelesai: { type: "string", description: "Waktu selesai misal '12:00' atau '22:00' (opsional)." },
          lokasi: { type: "string", description: "Tempat atau lokasi kegiatan (opsional)." },
          deskripsi: { type: "string", description: "Deskripsi atau agenda pembahasan (opsional)." },
          kategori: { type: "string", enum: ["RAPAT", "PERJALANAN_DINAS", "SOSIALISASI", "MONITORING_EVALUASI", "ACARA_INTERNAL", "LAINNYA"], description: "Kategori agenda." },
          pic: { type: "string", description: "Nama penanggung jawab / PIC (opsional)." },
        },
        required: ["judul", "tanggalMulai"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_agenda_absensi",
      description: "Buat agenda presensi / absensi resmi OPD yang menghasilkan tautan link publik mandiri dengan slug otomatis dari judul kegiatan.",
      parameters: {
        type: "object",
        properties: {
          namaKegiatan: { type: "string", description: "Nama kegiatan / acara presensi OPD." },
          tanggal: { type: "string", description: "Tanggal pelaksanaan kegiatan format YYYY-MM-DD." },
          waktuMulai: { type: "string", description: "Waktu mulai misal '09:00' (opsional)." },
          waktuSelesai: { type: "string", description: "Waktu selesai misal '12:00' (opsional)." },
          tempat: { type: "string", description: "Tempat / lokasi acara presensi." },
          deskripsi: { type: "string", description: "Keterangan atau deskripsi kegiatan (opsional)." },
          targetPeserta: { type: "string", description: "Target peserta, default 'Eselon II.b dan III.a' (opsional)." },
          targetKategori: { type: "string", enum: ["ESELON_2", "ESELON_3", "ESELON_2_3", "SEMUA_OPD", "KECAMATAN", "CUSTOM"], description: "Kategori binding peserta OPD." },
          requirePhoto: { type: "boolean", description: "Wajibkan foto selfie/kamera saat mengisi absen (default: true). Jika pengguna minta tanpa selfie/foto, set false." },
          requireLocation: { type: "boolean", description: "Wajibkan verifikasi lokasi GPS saat mengisi absen (default: true). Jika pengguna minta tanpa GPS/lokasi bebas, set false." },
          allowNonPeserta: { type: "boolean", description: "Izinkan peserta di luar daftar undangan/OPD mengisi hadir (default: true). Jika khusus yang terdaftar saja, set false." },
        },
        required: ["namaKegiatan", "tanggal", "tempat"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_agenda_tim",
      description: "Hapus / batalkan agenda kegiatan tim dari kalender berdasarkan ID (6 karakter) atau kata kunci judul kegiatan.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { type: "string", description: "ID 6 karakter agenda atau kata kunci judul kegiatan yang mau dihapus." },
        },
        required: ["searchQuery"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_agenda_tim",
      description: "Ubah / edit data agenda kegiatan tim (misal ubah jam, tanggal, judul, lokasi, PIC, atau status) berdasarkan ID (6 karakter) atau kata kunci judul kegiatan.",
      parameters: {
        type: "object",
        properties: {
          searchQuery: { type: "string", description: "ID 6 karakter agenda atau kata kunci judul kegiatan yang mau diubah." },
          judul: { type: "string", description: "Judul baru agenda (opsional)." },
          tanggalMulai: { type: "string", description: "Tanggal mulai baru format YYYY-MM-DD (opsional)." },
          tanggalSelesai: { type: "string", description: "Tanggal selesai baru format YYYY-MM-DD (opsional)." },
          waktuMulai: { type: "string", description: "Waktu mulai baru misal '14:00' atau '09:00' (opsional)." },
          waktuSelesai: { type: "string", description: "Waktu selesai baru misal '16:00' (opsional)." },
          lokasi: { type: "string", description: "Lokasi / tempat baru (opsional)." },
          pic: { type: "string", description: "Nama PIC baru (opsional)." },
          kategori: { type: "string", enum: ["RAPAT", "PERJALANAN_DINAS", "SOSIALISASI", "MONITORING_EVALUASI", "ACARA_INTERNAL", "LAINNYA"], description: "Kategori baru (opsional)." },
          status: { type: "string", enum: ["DIRENCANAKAN", "BERLANGSUNG", "SELESAI", "DIBATALKAN"], description: "Status agenda baru (opsional)." },
        },
        required: ["searchQuery"],
      },
    },
  },
];

function formatWitaDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Makassar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function parseWitaDate(dateStr: string): Date {
  const clean = dateStr.trim();
  const datePart = clean.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return new Date(`${datePart}T00:00:00+08:00`);
  }
  return new Date(clean);
}

export function inferKategoriAgenda(judul: string, explicitKategori?: string): "RAPAT" | "PERJALANAN_DINAS" | "SOSIALISASI" | "MONITORING_EVALUASI" | "ACARA_INTERNAL" | "LAINNYA" {
  if (explicitKategori) {
    const norm = explicitKategori.toUpperCase().trim();
    if (["RAPAT", "PERJALANAN_DINAS", "SOSIALISASI", "MONITORING_EVALUASI", "ACARA_INTERNAL", "LAINNYA"].includes(norm)) {
      return norm as any;
    }
  }

  const lower = (judul || "").toLowerCase();

  // 1. Acara Internal / Perayaan / Pawai / Upacara / Olahraga
  if (
    lower.includes("pawai") ||
    lower.includes("obor") ||
    lower.includes("karnaval") ||
    lower.includes("upacara") ||
    lower.includes("apel") ||
    lower.includes("senam") ||
    lower.includes("olahraga") ||
    lower.includes("jalan santai") ||
    lower.includes("gathering") ||
    lower.includes("family day") ||
    lower.includes("lomba") ||
    lower.includes("perayaan") ||
    lower.includes("festival") ||
    lower.includes("buka puasa") ||
    lower.includes("halal bihalal") ||
    lower.includes("syukuran") ||
    lower.includes("17-an") ||
    lower.includes("17 agustus") ||
    lower.includes("hut")
  ) {
    return "ACARA_INTERNAL";
  }

  // 2. Sosialisasi / Bimtek / Pelatihan / Workshop
  if (
    lower.includes("sosialisasi") ||
    lower.includes("bimtek") ||
    lower.includes("bimbingan teknis") ||
    lower.includes("pelatihan") ||
    lower.includes("workshop") ||
    lower.includes("seminar") ||
    lower.includes("webinar") ||
    lower.includes("diseminasi") ||
    lower.includes("penyuluhan") ||
    lower.includes("lokakarya") ||
    lower.includes("diklat")
  ) {
    return "SOSIALISASI";
  }

  // 3. Perjalanan Dinas / Kunker / Studi Banding
  if (
    lower.includes("dinas luar") ||
    lower.includes("perjalanan dinas") ||
    lower.includes("perjadin") ||
    lower.includes("kunjungan kerja") ||
    lower.includes("kunker") ||
    lower.includes("studi banding") ||
    lower.includes("luar daerah") ||
    lower.includes("luar kota")
  ) {
    return "PERJALANAN_DINAS";
  }

  // 4. Monitoring & Evaluasi / Sidak / Pengawasan
  if (
    lower.includes("monev") ||
    lower.includes("monitoring") ||
    lower.includes("evaluasi lapangan") ||
    lower.includes("sidak") ||
    lower.includes("inspeksi") ||
    lower.includes("pengawasan") ||
    lower.includes("verifikasi lapangan") ||
    lower.includes("peninjauan")
  ) {
    return "MONITORING_EVALUASI";
  }

  // 5. Rapat / Koordinasi / Pertemuan
  if (
    lower.includes("rapat") ||
    lower.includes("koordinasi") ||
    lower.includes("rakor") ||
    lower.includes("fgd") ||
    lower.includes("musyawarah") ||
    lower.includes("briefing") ||
    lower.includes("audiensi") ||
    lower.includes("sidang") ||
    lower.includes("pertemuan")
  ) {
    return "RAPAT";
  }

  return "LAINNYA";
}

// ==========================================
// 2. BACKEND IMPLEMENTATION
// ==========================================

export async function executeToolCall(
  name: string,
  rawArgs: any,
  sessionKey: string,
  contextTeamId?: string
): Promise<string> {
  const args = rawArgs && typeof rawArgs === "object" ? rawArgs : {};

  try {
    switch (name) {
      // 1. GET UNPAID SPJS
      case "get_unpaid_spjs": {
        const limit = Number(args.limit) || 10;
        const spjs = await prisma.spj.findMany({
          where: {
            terbayar: false,
            isDeleted: false,
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: limit,
          orderBy: { tanggalSpj: "desc" },
          include: {
            roster: true,
            maminDetail: { include: { vendor: true } },
            kodeRekening: { include: { subKegiatan: true } },
          },
        });

        const totalUnpaid = await prisma.spj.count({
          where: { terbayar: false, isDeleted: false },
        });

        if (spjs.length === 0) {
          return JSON.stringify({
            found: false,
            message: "Semua SPJ saat ini sudah lunas/terbayar.",
          });
        }

        const items = spjs.map((s, idx) => {
          // Kumpulkan nama depan orang / vendor terkait
          let personRelated = "";
          if (s.roster && s.roster.length > 0) {
            personRelated = s.roster
              .map((r) => r.nama.trim().split(/\s+/)[0])
              .join(", ");
          } else if (s.maminDetail?.vendor?.namaVendor) {
            personRelated = s.maminDetail.vendor.namaVendor;
          } else if ((s.metaDokumen as any)?.namaPenerima) {
            personRelated = String((s.metaDokumen as any).namaPenerima).trim().split(/\s+/)[0];
          }

          return {
            no: idx + 1,
            id: s.id.slice(0, 6),
            tanggal: s.tanggalSpj.toISOString().slice(0, 10),
            perihal: s.perihal || "-",
            nama: personRelated || "-",
            nominal: `Rp ${Number(s.totalPengeluaran).toLocaleString("id-ID")}`,
          };
        });

        return JSON.stringify({
          found: true,
          totalBelumBayar: totalUnpaid,
          ditampilkan: items.length,
          data: items,
          hint: "Untuk mengubah status, sebutkan ID (misal: 'Bayar a1b2c3') atau nama orang terkait (misal: 'Bayar Brayen').",
        });
      }

      // 2. UPDATE SPJ PAYMENT STATUS
      case "update_spj_payment_status": {
        const query = String(args.searchQuery || "").trim();
        const terbayar = Boolean(args.terbayar);

        // Cari SPJ yang cocok berdasarkan ID, Nomor BKU, Roster Nama, Vendor, atau Perihal
        const candidates = await prisma.spj.findMany({
          where: {
            isDeleted: false,
            OR: [
              { id: { startsWith: query, mode: "insensitive" } },
              { id: { contains: query, mode: "insensitive" } },
              { nomorBku: { contains: query, mode: "insensitive" } },
              { perihal: { contains: query, mode: "insensitive" } },
              { roster: { some: { nama: { contains: query, mode: "insensitive" } } } },
              { maminDetail: { vendor: { namaVendor: { contains: query, mode: "insensitive" } } } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          include: {
            roster: true,
            maminDetail: { include: { vendor: true } },
          },
          take: 5,
        });

        if (candidates.length === 0) {
          return JSON.stringify({
            status: "NOT_FOUND",
            message: `SPJ terkait '${query}' tidak ditemukan. Mohon sebutkan ID (6 karakter) atau nama orang terkait.`,
          });
        }

        // Jika ada lebih dari 1 kecocokan, minta user memilih
        if (candidates.length > 1) {
          const list = candidates.map((c) => {
            const names = c.roster.map((r) => r.nama.trim().split(/\s+/)[0]).join(", ") || c.maminDetail?.vendor?.namaVendor || "-";
            return `• ID: [${c.id.slice(0, 6)}] - ${c.perihal} (${names}) - Rp ${Number(c.totalPengeluaran).toLocaleString("id-ID")}`;
          });
          return JSON.stringify({
            status: "AMBIGUOUS",
            message: `Ditemukan ${candidates.length} SPJ yang cocok dengan '${query}':\n${list.join("\n")}\n\nSebutkan ID 6 karakter yang ingin diubah.`,
          });
        }

        const targetSpj = candidates[0];
        await prisma.spj.update({
          where: { id: targetSpj.id },
          data: { terbayar },
        });

        const names = targetSpj.roster.map((r) => r.nama.trim().split(/\s+/)[0]).join(", ") || targetSpj.maminDetail?.vendor?.namaVendor || "-";
        return JSON.stringify({
          status: "SUCCESS",
          id: targetSpj.id.slice(0, 6),
          perihal: targetSpj.perihal,
          nama: names,
          statusBaru: terbayar ? "LUNAS / TERBAYAR" : "BELUM DIBAYAR",
          nominal: Number(targetSpj.totalPengeluaran),
        });
      }

      // 3. GET MISSING DRIVE SPJS
      case "get_missing_drive_spjs": {
        const limit = Number(args.limit) || 10;
        const spjs = await prisma.spj.findMany({
          where: {
            isDeleted: false,
            OR: [{ driveUrl: null }, { driveUrl: "" }],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: limit,
          orderBy: { tanggalSpj: "desc" },
          include: {
            roster: true,
            maminDetail: { include: { vendor: true } },
          },
        });

        const totalMissing = await prisma.spj.count({
          where: { isDeleted: false, OR: [{ driveUrl: null }, { driveUrl: "" }] },
        });

        if (spjs.length === 0) {
          return JSON.stringify({
            found: false,
            message: "Semua SPJ sudah memiliki tautan bukti dukung / Google Drive.",
          });
        }

        const items = spjs.map((s, idx) => {
          const names = s.roster
            .map((r) => r.nama.trim().split(/\s+/)[0])
            .join(", ") || s.maminDetail?.vendor?.namaVendor || "-";

          return {
            no: idx + 1,
            id: s.id.slice(0, 6),
            tanggal: s.tanggalSpj.toISOString().slice(0, 10),
            perihal: s.perihal || "-",
            nama: names,
            nominal: `Rp ${Number(s.totalPengeluaran).toLocaleString("id-ID")}`,
          };
        });

        return JSON.stringify({
          found: true,
          totalBelumAdaDrive: totalMissing,
          ditampilkan: items.length,
          data: items,
          hint: "Untuk mengisi link, sebutkan ID atau nama (misal: 'Link drive a1b2c3 https://...' atau 'Link drive Brayen https://...').",
        });
      }

      // 4. UPDATE SPJ DRIVE URL
      case "update_spj_drive_url": {
        const query = String(args.searchQuery || "").trim();
        const driveUrl = String(args.driveUrl || "").trim();

        const candidates = await prisma.spj.findMany({
          where: {
            isDeleted: false,
            OR: [
              { id: { startsWith: query, mode: "insensitive" } },
              { id: { contains: query, mode: "insensitive" } },
              { nomorBku: { contains: query, mode: "insensitive" } },
              { perihal: { contains: query, mode: "insensitive" } },
              { roster: { some: { nama: { contains: query, mode: "insensitive" } } } },
              { maminDetail: { vendor: { namaVendor: { contains: query, mode: "insensitive" } } } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          include: { roster: true, maminDetail: { include: { vendor: true } } },
          take: 5,
        });

        if (candidates.length === 0) {
          return JSON.stringify({
            status: "NOT_FOUND",
            message: `SPJ dengan kata kunci '${query}' tidak ditemukan.`,
          });
        }

        if (candidates.length > 1) {
          const list = candidates.map((c) => {
            const names = c.roster.map((r) => r.nama.trim().split(/\s+/)[0]).join(", ") || c.maminDetail?.vendor?.namaVendor || "-";
            return `• ID: [${c.id.slice(0, 6)}] - ${c.perihal} (${names})`;
          });
          return JSON.stringify({
            status: "AMBIGUOUS",
            message: `Ditemukan ${candidates.length} SPJ yang cocok:\n${list.join("\n")}\n\nSebutkan ID 6 karakter spesifiknya.`,
          });
        }

        const target = candidates[0];
        await prisma.spj.update({
          where: { id: target.id },
          data: { driveUrl },
        });

        const names = target.roster.map((r) => r.nama.trim().split(/\s+/)[0]).join(", ") || target.maminDetail?.vendor?.namaVendor || "-";
        return JSON.stringify({
          status: "SUCCESS",
          id: target.id.slice(0, 6),
          perihal: target.perihal,
          nama: names,
          driveUrl: driveUrl,
          message: "Tautan bukti dukung berhasil disimpan.",
        });
      }

      // 5. LOOKUP NIP DIRECT
      case "lookup_nip_direct": {
        const query = String(args.nama || "").trim();
        const pegawais = await prisma.pegawai.findMany({
          where: {
            nama: { contains: query, mode: "insensitive" },
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: 3,
          select: { nama: true, nip: true, pangkat: true, golongan: true, jabatan: true },
        });

        if (pegawais.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Pegawai '${query}' tidak ditemukan.`,
          });
        }

        return JSON.stringify({
          found: true,
          results: pegawais.map((p) => {
            // Sambung NIP jadi satu string angka tanpa spasi / strip
            const cleanNip = p.nip ? p.nip.replace(/\D/g, "") : "NIP Belum Terdaftar";
            return {
              nama: p.nama,
              nip: cleanNip,
              golongan: p.golongan || "-",
            };
          }),
        });
      }

      // 6. LIST AVAILABLE BUDGET CATEGORIES (Tanpa membuka angka penuh)
      case "list_available_budget_categories": {
        const subKegiatans = await prisma.subKegiatan.findMany({
          include: {
            kegiatan: true,
            rekening: true,
          },
          take: 10,
        });

        if (subKegiatans.length === 0) {
          return JSON.stringify({ found: false, message: "Belum ada anggaran terdaftar." });
        }

        const list = subKegiatans.map((sub) => ({
          subKegiatan: sub.judulSub,
          kegiatan: sub.kegiatan.judulKegiatan,
          jumlahRekening: sub.rekening.length,
        }));

        return JSON.stringify({
          found: true,
          categories: list,
          hint: "Sebutkan nama sub-kegiatan atau rekening yang ingin dicek sisa saldonya.",
        });
      }

      // 7. GET SPECIFIC BUDGET DETAIL
      case "get_specific_budget_detail": {
        const query = String(args.query || "").trim();
        const sub = await prisma.subKegiatan.findFirst({
          where: {
            OR: [
              { judulSub: { contains: query, mode: "insensitive" } },
              { rekening: { some: { judulRekening: { contains: query, mode: "insensitive" } } } },
            ],
          },
          include: { kegiatan: true, rekening: true },
        });

        if (!sub) {
          return JSON.stringify({
            found: false,
            message: `Anggaran terkait '${query}' tidak ditemukan.`,
          });
        }

        return JSON.stringify({
          found: true,
          subKegiatan: sub.judulSub,
          kegiatan: sub.kegiatan.judulKegiatan,
          rekening: sub.rekening.map((r) => ({
            kode: r.kodeRekening,
            nama: r.judulRekening,
            sisaSaldo: `Rp ${Number(r.sisaSaldo).toLocaleString("id-ID")}`,
          })),
        });
      }

      // 8. CHECK TRAVEL BUDGET FEASIBILITY
      case "check_travel_budget_feasibility": {
        const requiredAmount = BigInt(args.estimasiBiaya ? Math.round(Number(args.estimasiBiaya)) : 2000000);

        // Hanya cari rekening yang KHUSUS Perjalanan Dinas
        const allTravelReks = await prisma.kodeRekening.findMany({
          where: {
            OR: [
              { judulRekening: { contains: "perjalanan dinas", mode: "insensitive" } },
              { judulRekening: { contains: "perjadin", mode: "insensitive" } },
              { kodeRekening: { startsWith: "5.1.02.04" } },
            ],
          },
          include: {
            subKegiatan: {
              include: { kegiatan: true },
            },
          },
        });

        // Filter rekening yang saldonya benar-benar cukup
        const sufficientReks = allTravelReks.filter((r) => r.sisaSaldo >= requiredAmount);

        if (sufficientReks.length === 0) {
          // Cari saldo tertinggi yang tersedia untuk info
          const highestRek = allTravelReks.sort((a, b) => Number(b.sisaSaldo - a.sisaSaldo))[0];
          return JSON.stringify({
            sufficient: false,
            message: args.estimasiBiaya
              ? `Tidak cukup. Kebutuhan Rp ${Number(requiredAmount).toLocaleString("id-ID")}, sedangkan sisa saldo tertinggi rekening Perjalanan Dinas saat ini hanya Rp ${Number(highestRek?.sisaSaldo || 0).toLocaleString("id-ID")}.`
              : "Pagu anggaran perjalanan dinas saat ini menipis atau tidak mencukupi.",
            rekeningTertinggi: highestRek
              ? {
                  rekening: highestRek.judulRekening,
                  subKegiatan: highestRek.subKegiatan.judulSub,
                  sisaSaldo: `Rp ${Number(highestRek.sisaSaldo).toLocaleString("id-ID")}`,
                }
              : null,
          });
        }

        const options = sufficientReks.map((r) => ({
          rekening: r.judulRekening,
          subKegiatan: r.subKegiatan.judulSub,
          kegiatan: r.subKegiatan.kegiatan.judulKegiatan,
          sisaSaldo: `Rp ${Number(r.sisaSaldo).toLocaleString("id-ID")}`,
        }));

        return JSON.stringify({
          sufficient: true,
          message: `Anggaran cukup. Tersedia pada ${sufficientReks.length} rekening berikut:`,
          opsiRekening: options,
        });
      }

      // 9. LIST NASKAH DINAS
      case "list_naskah_dinas": {
        const limit = Number(args.limit) || 10;
        const jenis = args.jenisNaskah ? String(args.jenisNaskah).trim().toUpperCase() : undefined;

        const naskahs = await prisma.naskahDinas.findMany({
          where: {
            isDeleted: false,
            ...(jenis ? { jenisNaskah: jenis as any } : {}),
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: limit,
          orderBy: { tanggal: "desc" },
        });

        if (naskahs.length === 0) {
          return JSON.stringify({
            found: false,
            message: "Belum ada naskah dinas yang tercatat.",
          });
        }

        const items = naskahs.map((n, idx) => ({
          no: idx + 1,
          id: n.id.slice(0, 6),
          jenis: n.jenisNaskah.replace(/_/g, " "),
          nomorSurat: n.nomorSurat || "-",
          tanggal: n.tanggal.toISOString().slice(0, 10),
          perihal: n.perihal || n.agenda || "-",
        }));

        return JSON.stringify({
          found: true,
          total: items.length,
          data: items,
          hint: "Untuk membaca naskah lengkap, sebutkan ID (misal: 'Baca naskah a1b2c3') atau nomor surat.",
        });
      }

      // 10. GET NASKAH DINAS DETAIL
      case "get_naskah_dinas_detail": {
        const query = String(args.searchQuery || "").trim();

        const candidates = await prisma.naskahDinas.findMany({
          where: {
            isDeleted: false,
            OR: [
              { id: { startsWith: query, mode: "insensitive" } },
              { id: { contains: query, mode: "insensitive" } },
              { nomorSurat: { contains: query, mode: "insensitive" } },
              { perihal: { contains: query, mode: "insensitive" } },
              { agenda: { contains: query, mode: "insensitive" } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: 3,
        });

        if (candidates.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Naskah dinas terkait '${query}' tidak ditemukan.`,
          });
        }

        const target = candidates[0];
        const rawData: any = target.data || {};

        return JSON.stringify({
          found: true,
          id: target.id.slice(0, 6),
          jenis: target.jenisNaskah.replace(/_/g, " "),
          nomorSurat: target.nomorSurat || "-",
          tanggal: target.tanggal.toISOString().slice(0, 10),
          perihal: target.perihal || "-",
          agenda: target.agenda || "-",
          tujuan: rawData.tujuan || rawData.kepada || "-",
          isiRingkas: rawData.isiSurat || rawData.ringkasan || rawData.maksud || rawData.analisis || "-",
          pejabatPenandatangan: rawData.penandatangan || rawData.namaPejabat || "-",
        });
      }

      // 11. LIST AGENDA ABSENSI OPD
      case "list_agenda_absensi": {
        const limit = Number(args.limit) || 10;

        const agendas = await prisma.agendaAbsensi.findMany({
          where: {
            isDeleted: false,
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: limit,
          orderBy: { tanggal: "desc" },
          include: {
            peserta: true,
          },
        });

        if (agendas.length === 0) {
          return JSON.stringify({
            found: false,
            message: "Belum ada data agenda absensi OPD yang tercatat.",
          });
        }

        const items = agendas.map((a, idx) => {
          const totalPeserta = a.peserta.length;
          const hadir = a.peserta.filter((p) => p.status === "HADIR").length;
          const mewakili = a.peserta.filter((p) => p.status === "MEWAKILI").length;
          const tidakHadir = a.peserta.filter((p) => p.status === "TIDAK_HADIR").length;

          return {
            no: idx + 1,
            id: a.id.slice(0, 6),
            namaKegiatan: a.namaKegiatan,
            tanggal: a.tanggal.toISOString().slice(0, 10),
            tempat: a.tempat || "-",
            status: a.status, // BERLANGSUNG, SELESAI, DIBATALKAN
            rekapKehadiran: totalPeserta > 0
              ? `${hadir} Hadir, ${mewakili} Mewakili, ${tidakHadir} Absen (Total: ${totalPeserta})`
              : "Belum ada absensi masuk",
          };
        });

        return JSON.stringify({
          found: true,
          total: items.length,
          data: items,
        });
      }

      // 12. LIST AGENDA TIM
      case "list_agenda_tim": {
        const limit = Number(args.limit) || 10;
        const searchQuery = args.searchQuery ? String(args.searchQuery).trim() : "";
        const tanggalFilter = args.tanggal ? String(args.tanggal).trim() : "";

        const whereClause: any = {
          isDeleted: false,
          ...(contextTeamId ? { teamId: contextTeamId } : {}),
        };

        if (searchQuery) {
          whereClause.OR = [
            { judul: { contains: searchQuery, mode: "insensitive" } },
            { lokasi: { contains: searchQuery, mode: "insensitive" } },
            { pic: { contains: searchQuery, mode: "insensitive" } },
            { id: { startsWith: searchQuery, mode: "insensitive" } },
          ];
        }

        if (tanggalFilter) {
          const parsed = parseWitaDate(tanggalFilter);
          if (!isNaN(parsed.getTime())) {
            const startOfDay = new Date(parsed.getTime());
            const endOfDay = new Date(parsed.getTime() + 24 * 60 * 60 * 1000 - 1);
            whereClause.tanggalMulai = {
              gte: startOfDay,
              lte: endOfDay,
            };
          }
        }

        const agendas = await prisma.agendaTim.findMany({
          where: whereClause,
          take: limit,
          orderBy: { tanggalMulai: "asc" },
        });

        if (agendas.length === 0) {
          return JSON.stringify({
            found: false,
            message: searchQuery || tanggalFilter
              ? `Tidak ada agenda yang cocok dengan pencarian '${searchQuery || tanggalFilter}'.`
              : "Belum ada agenda kegiatan tim yang dijadwalkan.",
          });
        }

        const items = agendas.map((a, idx) => ({
          no: idx + 1,
          id: a.id.slice(0, 6),
          judul: a.judul,
          kategori: a.kategori.replace(/_/g, " "),
          tanggal: formatWitaDate(a.tanggalMulai),
          waktu: a.waktuMulai ? `${a.waktuMulai}${a.waktuSelesai ? " - " + a.waktuSelesai : ""} WITA` : "-",
          lokasi: a.lokasi || "-",
          status: a.status,
          pic: a.pic || "-",
        }));

        return JSON.stringify({
          found: true,
          total: items.length,
          data: items,
          hint: "Untuk menghapus agenda, ketik: 'Hapus agenda [Judul/ID]'",
        });
      }

      // 13. CREATE AGENDA TIM (KALENDER KERJA INTERNAL)
      case "create_agenda_tim": {
        const judul = String(args.judul || "").trim();
        let tglMulaiStr = String(args.tanggalMulai || "").trim();

        if (!tglMulaiStr) {
          tglMulaiStr = formatWitaDate(new Date());
        }

        const tglMulai = parseWitaDate(tglMulaiStr);
        const tglSelesai = args.tanggalSelesai ? parseWitaDate(args.tanggalSelesai) : null;
        const waktuMulai = args.waktuMulai ? String(args.waktuMulai).trim() : null;
        const waktuSelesai = args.waktuSelesai ? String(args.waktuSelesai).trim() : null;
        const lokasi = args.lokasi ? String(args.lokasi).trim() : null;
        const deskripsi = args.deskripsi ? String(args.deskripsi).trim() : null;
        const pic = args.pic ? String(args.pic).trim() : null;
        const kategori = inferKategoriAgenda(judul, args.kategori);

        // Ambil default Team & User jika contextTeamId belum tersedia
        const defaultTeam = await prisma.team.findFirst();
        const defaultUser = await prisma.user.findFirst();

        if (!defaultTeam || !defaultUser) {
          return JSON.stringify({
            status: "ERROR",
            message: "Data Team atau User belum tersedia di database.",
          });
        }

        const effectiveTeamId = contextTeamId || defaultTeam.id;
        const effectiveUserId = defaultUser.id;

        const createdAgendaTim = await prisma.agendaTim.create({
          data: {
            judul,
            kategori,
            tanggalMulai: tglMulai,
            tanggalSelesai: tglSelesai,
            waktuMulai,
            waktuSelesai,
            lokasi,
            deskripsi,
            pic,
            teamId: effectiveTeamId,
            createdById: effectiveUserId,
          },
        });

        const waktuTeks = waktuMulai
          ? `${waktuMulai}${waktuSelesai ? ` - ${waktuSelesai}` : ""} WITA`
          : "-";

        return JSON.stringify({
          status: "SUCCESS",
          id: createdAgendaTim.id.slice(0, 6),
          judul: createdAgendaTim.judul,
          kategori: createdAgendaTim.kategori.replace(/_/g, " "),
          tanggal: formatWitaDate(createdAgendaTim.tanggalMulai),
          waktu: waktuTeks,
          lokasi: createdAgendaTim.lokasi || "-",
          pic: createdAgendaTim.pic || "-",
          message: `Agenda internal tim '${createdAgendaTim.judul}' (${createdAgendaTim.kategori.replace(/_/g, " ")}) berhasil dicatat ke kalender kerja.`,
        });
      }

      // 13.5 CREATE AGENDA ABSENSI OPD (PRESENSI PUBLIK MANDIRI)
      case "create_agenda_absensi": {
        const namaKegiatan = String(args.namaKegiatan || "").trim();
        let tanggalStr = String(args.tanggal || "").trim();

        if (!tanggalStr) {
          tanggalStr = formatWitaDate(new Date());
        }

        const tglMulai = parseWitaDate(tanggalStr);
        const waktuMulai = args.waktuMulai ? String(args.waktuMulai).trim() : null;
        const waktuSelesai = args.waktuSelesai ? String(args.waktuSelesai).trim() : null;
        const tempat = args.tempat ? String(args.tempat).trim() : "Aula Kantor";
        const deskripsi = args.deskripsi ? String(args.deskripsi).trim() : null;
        const targetPeserta = args.targetPeserta ? String(args.targetPeserta).trim() : "Eselon II.b dan III.a";
        const targetKategori = args.targetKategori || "ESELON_2_3";
        const requirePhoto = typeof args.requirePhoto === "boolean" ? args.requirePhoto : true;
        const requireLocation = typeof args.requireLocation === "boolean" ? args.requireLocation : true;
        const allowNonPeserta = typeof args.allowNonPeserta === "boolean" ? args.allowNonPeserta : true;

        // Ambil default Team & User jika contextTeamId belum tersedia
        const defaultTeam = await prisma.team.findFirst();
        const defaultUser = await prisma.user.findFirst();

        if (!defaultTeam || !defaultUser) {
          return JSON.stringify({
            status: "ERROR",
            message: "Data Team atau User belum tersedia di database.",
          });
        }

        const effectiveTeamId = contextTeamId || defaultTeam.id;
        const effectiveUserId = defaultUser.id;

        // Generate slug rapi dari nama kegiatan + kode unik 4 karakter di ujung
        const baseSlug = generateSlug(namaKegiatan).slice(0, 40) || "absensi-kegiatan";
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const publicSlugToken = `${baseSlug}-${randomSuffix}`;

        // Base URL SIPADIN untuk link publik
        const rawBaseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sipadin.id";
        const cleanBaseUrl = rawBaseUrl.replace(/\/$/, "");
        const publicUrl = `${cleanBaseUrl}/p/absensi/${publicSlugToken}`;

        // Format label waktu
        const waktuTeks = waktuMulai
          ? `${waktuMulai}${waktuSelesai ? ` - ${waktuSelesai}` : ""} WITA`
          : "09:00 WITA";

        // Hitung nama hari dalam Bahasa Indonesia
        const hariNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const hariIndo = hariNames[tglMulai.getDay()] || "Senin";

        // 1. Simpan ke AgendaAbsensi
        const createdAbsensi = await prisma.agendaAbsensi.create({
          data: {
            publicToken: publicSlugToken,
            namaKegiatan,
            hari: hariIndo,
            tanggal: tglMulai,
            waktu: waktuTeks,
            tempat,
            deskripsi,
            targetPeserta,
            targetKategori,
            isPublicActive: true,
            status: "BERLANGSUNG",
            requireLocation,
            requirePhoto,
            allowNonPeserta,
            teamId: effectiveTeamId,
            createdById: effectiveUserId,
          },
        });

        // 2. Simpan juga ke AgendaTim untuk visibilitas kalender
        try {
          await prisma.agendaTim.create({
            data: {
              judul: namaKegiatan,
              kategori: "RAPAT",
              tanggalMulai: tglMulai,
              waktuMulai,
              waktuSelesai,
              lokasi: tempat,
              deskripsi,
              teamId: effectiveTeamId,
              createdById: effectiveUserId,
            },
          });
        } catch (calErr) {
          console.warn("[create_agenda_absensi] Sync ke kalender tim gagal:", calErr);
        }

        // 3. Pre-populate daftar pejabat eselon/OPD
        try {
          const pejabatTerdaftar = await prisma.pegawai.findMany({
            where: {
              teamId: effectiveTeamId,
              OR: [
                { eselon: { in: ["II.a", "II.b", "II", "III.a", "III.b", "III"] } },
                { kategoriPegawai: { in: ["ESELON_2", "ESELON_3"] } },
                { wajibAbsenOpd: true },
              ],
            },
            orderBy: [{ urutanOpd: "asc" }, { instansi: "asc" }, { nama: "asc" }],
          });

          if (pejabatTerdaftar.length > 0) {
            await prisma.kehadiranPeserta.createMany({
              data: pejabatTerdaftar.map((p, idx) => ({
                agendaId: createdAbsensi.id,
                pegawaiId: p.id,
                nama: p.nama,
                nip: p.nip || null,
                jabatan: p.jabatan,
                instansi: p.instansi,
                eselon: p.eselon || "II.b",
                urutan: p.urutanOpd ?? idx + 1,
                status: "TIDAK_HADIR" as any,
                isSelfInput: false,
              })),
            });
          }
        } catch (err) {
          console.warn("[create_agenda_absensi] Gagal pre-populate peserta:", err);
        }

        return JSON.stringify({
          status: "SUCCESS",
          id: createdAbsensi.id.slice(0, 6),
          namaKegiatan: createdAbsensi.namaKegiatan,
          tanggal: formatWitaDate(createdAbsensi.tanggal),
          waktu: waktuTeks,
          tempat: createdAbsensi.tempat,
          requirePhoto,
          requireLocation,
          allowNonPeserta,
          publicUrl: publicUrl,
          slugToken: publicSlugToken,
          message: `Sesi presensi OPD '${createdAbsensi.namaKegiatan}' berhasil dibuat dan link publik presensi aktif.`,
        });
      }

      // 14. DELETE AGENDA TIM
      case "delete_agenda_tim": {
        const query = String(args.searchQuery || "").trim();

        if (!query) {
          return JSON.stringify({
            status: "ERROR",
            message: "Mohon sebutkan judul atau ID agenda yang mau dihapus.",
          });
        }

        const candidates = await prisma.agendaTim.findMany({
          where: {
            isDeleted: false,
            OR: [
              { id: { startsWith: query, mode: "insensitive" } },
              { id: { contains: query, mode: "insensitive" } },
              { judul: { contains: query, mode: "insensitive" } },
              { lokasi: { contains: query, mode: "insensitive" } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: 5,
        });

        if (candidates.length === 0) {
          return JSON.stringify({
            status: "NOT_FOUND",
            message: `Agenda terkait '${query}' tidak ditemukan di kalender.`,
          });
        }

        if (candidates.length > 1) {
          const list = candidates.map(
            (c) => `• ID: [${c.id.slice(0, 6)}] - ${c.judul} (${formatWitaDate(c.tanggalMulai)}${c.waktuMulai ? ", " + c.waktuMulai : ""})`
          );
          return JSON.stringify({
            status: "AMBIGUOUS",
            message: `Ditemukan ${candidates.length} agenda yang cocok dengan '${query}':\n${list.join("\n")}\n\nSebutkan ID 6 karakter yang ingin dihapus.`,
          });
        }

        const target = candidates[0];
        await prisma.agendaTim.update({
          where: { id: target.id },
          data: { isDeleted: true },
        });

        return JSON.stringify({
          status: "SUCCESS",
          id: target.id.slice(0, 6),
          judul: target.judul,
          tanggal: formatWitaDate(target.tanggalMulai),
          message: `Agenda *${target.judul}* berhasil dihapus dari kalender.`,
        });
      }

      // 15. UPDATE AGENDA TIM
      case "update_agenda_tim": {
        const query = String(args.searchQuery || "").trim();

        if (!query) {
          return JSON.stringify({
            status: "ERROR",
            message: "Mohon sebutkan judul atau ID agenda yang mau diubah.",
          });
        }

        const candidates = await prisma.agendaTim.findMany({
          where: {
            isDeleted: false,
            OR: [
              { id: { startsWith: query, mode: "insensitive" } },
              { id: { contains: query, mode: "insensitive" } },
              { judul: { contains: query, mode: "insensitive" } },
              { lokasi: { contains: query, mode: "insensitive" } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: 5,
        });

        if (candidates.length === 0) {
          return JSON.stringify({
            status: "NOT_FOUND",
            message: `Agenda terkait '${query}' tidak ditemukan di kalender.`,
          });
        }

        if (candidates.length > 1) {
          const list = candidates.map(
            (c) => `• ID: [${c.id.slice(0, 6)}] - ${c.judul} (${formatWitaDate(c.tanggalMulai)}${c.waktuMulai ? ", " + c.waktuMulai : ""})`
          );
          return JSON.stringify({
            status: "AMBIGUOUS",
            message: `Ditemukan ${candidates.length} agenda yang cocok dengan '${query}':\n${list.join("\n")}\n\nSebutkan ID 6 karakter yang ingin diubah.`,
          });
        }

        const target = candidates[0];
        const updateData: any = {};

        if (args.judul) updateData.judul = String(args.judul).trim();
        if (args.tanggalMulai) updateData.tanggalMulai = parseWitaDate(args.tanggalMulai);
        if (args.tanggalSelesai) updateData.tanggalSelesai = parseWitaDate(args.tanggalSelesai);
        if (args.waktuMulai !== undefined) updateData.waktuMulai = String(args.waktuMulai).trim() || null;
        if (args.waktuSelesai !== undefined) updateData.waktuSelesai = String(args.waktuSelesai).trim() || null;
        if (args.lokasi !== undefined) updateData.lokasi = String(args.lokasi).trim() || null;
        if (args.pic !== undefined) updateData.pic = String(args.pic).trim() || null;
        if (args.kategori) {
          updateData.kategori = inferKategoriAgenda(args.judul || target.judul, args.kategori);
        } else if (args.judul) {
          updateData.kategori = inferKategoriAgenda(args.judul);
        }
        if (args.status) updateData.status = args.status;

        const updated = await prisma.agendaTim.update({
          where: { id: target.id },
          data: updateData,
        });

        const changeDescriptions: string[] = [];
        if (args.judul) changeDescriptions.push(`Judul: ${updated.judul}`);
        if (args.tanggalMulai) changeDescriptions.push(`Tgl: ${formatWitaDate(updated.tanggalMulai)}`);
        if (args.waktuMulai) changeDescriptions.push(`Jam: ${updated.waktuMulai} WITA`);
        if (args.lokasi) changeDescriptions.push(`Lokasi: ${updated.lokasi}`);
        if (args.pic) changeDescriptions.push(`PIC: ${updated.pic}`);
        if (args.kategori || args.judul) changeDescriptions.push(`Kategori: ${updated.kategori.replace(/_/g, " ")}`);
        if (args.status) changeDescriptions.push(`Status: ${updated.status}`);

        return JSON.stringify({
          status: "SUCCESS",
          id: updated.id.slice(0, 6),
          judul: updated.judul,
          kategori: updated.kategori.replace(/_/g, " "),
          tanggal: formatWitaDate(updated.tanggalMulai),
          waktu: updated.waktuMulai ? `${updated.waktuMulai}${updated.waktuSelesai ? " - " + updated.waktuSelesai : ""} WITA` : "-",
          lokasi: updated.lokasi || "-",
          perubahan: changeDescriptions.join(", ") || "Data berhasil diperbarui",
          message: `Agenda *${updated.judul}* berhasil diperbarui.`,
        });
      }

      default:
        return JSON.stringify({ error: `Tool ${name} tidak dikenali.` });
    }
  } catch (error: any) {
    console.error(`[AI Tool Error - ${name}]:`, error);
    return JSON.stringify({ status: "ERROR", message: error?.message || "Terjadi kesalahan." });
  }
}
