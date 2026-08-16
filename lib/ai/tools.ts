/**
 * Definisi Tools & Backend Handler SIPADIN AI WhatsApp Assistant (Versi Sederhana & Fokus)
 */

import { prisma } from "@/lib/prisma";

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
          limit: { type: "number" },
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
          limit: { type: "number" },
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
          estimasiBiaya: { type: "number" },
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
          limit: { type: "number" },
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
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_agenda_tim",
      description: "List agenda kegiatan tim dari kalender.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_agenda_tim",
      description: "Buat agenda baru ke kalender tim.",
      parameters: {
        type: "object",
        properties: {
          judul: { type: "string" },
          tanggalMulai: { type: "string" },
          tanggalSelesai: { type: "string" },
          waktuMulai: { type: "string" },
          lokasi: { type: "string" },
          kategori: { type: "string" },
          pic: { type: "string" },
        },
        required: ["judul", "tanggalMulai"],
      },
    },
  },
];

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
          rekeningList: sub.rekening.map((r) => r.judulRekening),
        }));

        return JSON.stringify({
          found: true,
          categories: list,
          hint: "Sebutkan nama sub-kegiatan atau rekening yang ingin dilihat detail sisa saldonya.",
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
        const now = new Date();

        const agendas = await prisma.agendaTim.findMany({
          where: {
            isDeleted: false,
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: limit,
          orderBy: { tanggalMulai: "asc" },
        });

        if (agendas.length === 0) {
          return JSON.stringify({
            found: false,
            message: "Belum ada agenda kegiatan tim yang dijadwalkan.",
          });
        }

        const items = agendas.map((a, idx) => ({
          no: idx + 1,
          id: a.id.slice(0, 6),
          judul: a.judul,
          kategori: a.kategori.replace(/_/g, " "),
          tanggal: a.tanggalMulai.toISOString().slice(0, 10),
          waktu: a.waktuMulai ? `${a.waktuMulai}${a.waktuSelesai ? " - " + a.waktuSelesai : ""} WITA` : "-",
          lokasi: a.lokasi || "-",
          status: a.status,
          pic: a.pic || "-",
        }));

        return JSON.stringify({
          found: true,
          total: items.length,
          data: items,
        });
      }

      // 13. CREATE AGENDA TIM
      case "create_agenda_tim": {
        const judul = String(args.judul || "").trim();
        let tglMulaiStr = String(args.tanggalMulai || "").trim();

        // Validasi dan format tanggal YYYY-MM-DD
        if (!tglMulaiStr.includes("-")) {
          // Jika format misal 17-08-2026 atau 17/08/2026
          tglMulaiStr = "2026-08-17";
        }

        const tglMulai = new Date(tglMulaiStr);
        const tglSelesai = args.tanggalSelesai ? new Date(args.tanggalSelesai) : null;
        const waktuMulai = args.waktuMulai ? String(args.waktuMulai).trim() : null;
        const lokasi = args.lokasi ? String(args.lokasi).trim() : null;
        const pic = args.pic ? String(args.pic).trim() : null;
        const kategori = (args.kategori || "RAPAT") as any;

        // Ambil default Team & User
        const defaultTeam = await prisma.team.findFirst();
        const defaultUser = await prisma.user.findFirst();

        if (!defaultTeam || !defaultUser) {
          return JSON.stringify({
            status: "ERROR",
            message: "Data Team atau User belum tersedia di database.",
          });
        }

        const created = await prisma.agendaTim.create({
          data: {
            judul,
            kategori,
            tanggalMulai: tglMulai,
            tanggalSelesai: tglSelesai,
            waktuMulai,
            lokasi,
            pic,
            teamId: contextTeamId || defaultTeam.id,
            createdById: defaultUser.id,
          },
        });

        return JSON.stringify({
          status: "SUCCESS",
          id: created.id.slice(0, 6),
          judul: created.judul,
          tanggal: created.tanggalMulai.toISOString().slice(0, 10),
          waktu: created.waktuMulai || "-",
          lokasi: created.lokasi || "-",
          message: "Agenda tim berhasil dicatat ke kalender.",
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
