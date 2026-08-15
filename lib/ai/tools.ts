/**
 * Definisi Tools & Handler Backend untuk Groq AI Agent SIPADIN
 */

import { prisma } from "@/lib/prisma";
import { getSession, setPendingDraft, clearPendingDraft, PendingDraftSpj } from "./session-store";
import telaahanPresets from "@/lib/presets/telaahan.json";
import laporanPresets from "@/lib/presets/laporan.json";

// ==========================================
// 1. TOOL DEFINITIONS (OpenAI / Groq Format)
// ==========================================
export const AI_TOOLS_SCHEMA = [
  {
    type: "function",
    function: {
      name: "lookup_pegawai",
      description: "Cari data NIP, Nama, Pangkat, Golongan, Jabatan di database master pegawai.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Nama atau NIP" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_vendor",
      description: "Cari vendor (RM, Katering, NPWP, Rekening) di master vendor.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Nama vendor" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_perjadin",
      description: "Dapatkan daftar pegawai dinas luar aktif hari ini.",
      parameters: {
        type: "object",
        properties: { tanggal: { type: "string", description: "YYYY-MM-DD" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_budget_status",
      description: "Lihat pagu, realisasi, dan sisa saldo sub-kegiatan anggaran.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Nama subkegiatan / kode rekening" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_spj_perjadin",
      description: "Buat DRAFT SPJ Perjadin (hitung DOPD per orang, susun telaahan staf, cek saldo).",
      parameters: {
        type: "object",
        properties: {
          perihal: { type: "string" },
          tempatBerangkat: { type: "string" },
          tempatTujuan: { type: "string" },
          tglBerangkat: { type: "string" },
          tglKembali: { type: "string" },
          alatAngkut: { type: "string" },
          namaPegawaiList: { type: "array", items: { type: "string" } },
          kepalaJalanNama: { type: "string" },
          subKegiatanKeyword: { type: "string" },
          estimasiUangHarian: { type: "number" },
          estimasiHotelPerMalam: { type: "number" },
          estimasiTransportPP: { type: "number" },
        },
        required: ["perihal", "tempatTujuan", "tglBerangkat", "tglKembali", "namaPegawaiList", "subKegiatanKeyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_spj_mamin",
      description: "Buat DRAFT SPJ Makan Minum Rapat.",
      parameters: {
        type: "object",
        properties: {
          namaRapat: { type: "string" },
          vendorKeyword: { type: "string" },
          jumlahPeserta: { type: "number" },
          porsiMakan: { type: "number" },
          hargaMakan: { type: "number" },
          porsiSnack: { type: "number" },
          hargaSnack: { type: "number" },
          subKegiatanKeyword: { type: "string" },
        },
        required: ["namaRapat", "vendorKeyword", "jumlahPeserta", "subKegiatanKeyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_spj_honor",
      description: "Buat DRAFT SPJ Honorarium Narasumber + hitung PPh 21.",
      parameters: {
        type: "object",
        properties: {
          namaKegiatan: { type: "string" },
          namaPenerimaList: { type: "array", items: { type: "string" } },
          jamPelajaran: { type: "number" },
          tarifPerJam: { type: "number" },
          subKegiatanKeyword: { type: "string" },
        },
        required: ["namaKegiatan", "namaPenerimaList", "jamPelajaran", "tarifPerJam", "subKegiatanKeyword"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "commit_pending_spj",
      description: "Simpan resmi draft SPJ aktif ke database dan potong sisa saldo.",
      parameters: {
        type: "object",
        properties: { konfirmasi: { type: "boolean" } },
        required: ["konfirmasi"],
      },
    },
  },
];

// ==========================================
// 2. TOOL HANDLER IMPLEMENTATION
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
      case "lookup_pegawai": {
        const query = String(args.query || "").trim();
        const pegawais = await prisma.pegawai.findMany({
          where: {
            OR: [
              { nama: { contains: query, mode: "insensitive" } },
              { nip: { contains: query } },
              { jabatan: { contains: query, mode: "insensitive" } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: 5,
          select: {
            id: true,
            nama: true,
            nip: true,
            pangkat: true,
            golongan: true,
            jabatan: true,
            instansi: true,
          },
        });

        if (pegawais.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Pegawai dengan kata kunci '${query}' tidak ditemukan di database.`,
          });
        }

        return JSON.stringify({
          found: true,
          count: pegawais.length,
          pegawais: pegawais.map((p) => ({
            id: p.id,
            nama: p.nama,
            nip: p.nip || "-",
            pangkatGolongan: `${p.pangkat || "-"} (${p.golongan || "-"})`,
            jabatan: p.jabatan,
          })),
        });
      }

      case "lookup_vendor": {
        const query = String(args.query || "").trim();
        const vendors = await prisma.vendorPihakKetiga.findMany({
          where: {
            OR: [
              { namaVendor: { contains: query, mode: "insensitive" } },
              { namaPemilik: { contains: query, mode: "insensitive" } },
            ],
            ...(contextTeamId ? { teamId: contextTeamId } : {}),
          },
          take: 5,
        });

        if (vendors.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Vendor dengan kata kunci '${query}' tidak ditemukan di database.`,
          });
        }

        return JSON.stringify({
          found: true,
          count: vendors.length,
          vendors: vendors.map((v) => ({
            id: v.id,
            namaVendor: v.namaVendor,
            namaPemilik: v.namaPemilik || "-",
            npwp: v.npwp || "-",
            rekeningBank: v.rekeningBank || "-",
            alamat: v.alamat || "-",
          })),
        });
      }

      case "get_active_perjadin": {
        const targetDate = args.tanggal ? new Date(args.tanggal) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const activeDetails = await prisma.spjPerjadinDetail.findMany({
          where: {
            AND: [
              { tglBerangkat: { lte: endOfDay } },
              { tglKembali: { gte: startOfDay } },
            ],
            spj: {
              isDeleted: false,
              ...(contextTeamId ? { teamId: contextTeamId } : {}),
            },
          },
          include: {
            spj: {
              include: {
                roster: true,
                team: true,
              },
            },
          },
        });

        if (activeDetails.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Tidak ada personel yang tercatat melaksanakan dinas luar pada tanggal ${startOfDay.toISOString().slice(0, 10)}.`,
          });
        }

        const list = activeDetails.map((item) => ({
          nomorSpj: item.spj.nomorBku || item.spj.id.slice(0, 8),
          maksudDinas: item.spj.perihal,
          tujuan: item.tempatTujuan,
          rentangTanggal: `${item.tglBerangkat.toISOString().slice(0, 10)} s/d ${item.tglKembali.toISOString().slice(0, 10)} (${item.lamaPerjalanan} hari)`,
          personel: item.spj.roster.map((r) => `${r.nama} (${r.role === "KEPALA_JALAN" ? "Kepala Jalan" : "Pengikut"})`),
        }));

        return JSON.stringify({
          found: true,
          totalTrip: list.length,
          trips: list,
        });
      }

      case "get_budget_status": {
        const query = String(args.query || "").trim();
        const subKegiatans = await prisma.subKegiatan.findMany({
          where: query
            ? {
                OR: [
                  { judulSub: { contains: query, mode: "insensitive" } },
                  { kodeSub: { contains: query, mode: "insensitive" } },
                ],
              }
            : undefined,
          include: {
            kegiatan: {
              include: { tahunAnggaran: true },
            },
            rekening: true,
          },
          take: 5,
        });

        if (subKegiatans.length === 0) {
          return JSON.stringify({
            found: false,
            message: `Sub-kegiatan anggaran '${query}' tidak ditemukan.`,
          });
        }

        const results = subKegiatans.map((sub) => {
          let totalAwal = BigInt(0);
          let totalSisa = BigInt(0);
          const rekList = sub.rekening.map((r) => {
            totalAwal += r.saldoAwal;
            totalSisa += r.sisaSaldo;
            return {
              id: r.id,
              kodeRekening: r.kodeRekening,
              judulRekening: r.judulRekening,
              saldoAwal: Number(r.saldoAwal),
              sisaSaldo: Number(r.sisaSaldo),
            };
          });

          return {
            subKegiatanId: sub.id,
            kodeSub: sub.kodeSub,
            judulSub: sub.judulSub,
            tahun: sub.kegiatan.tahunAnggaran.tahun,
            totalPaguAwal: Number(totalAwal),
            totalSisaSaldo: Number(totalSisa),
            totalTerpakai: Number(totalAwal - totalSisa),
            rekening: rekList,
          };
        });

        return JSON.stringify({
          found: true,
          items: results,
        });
      }

      case "draft_spj_perjadin": {
        // 1. Cari Sub-kegiatan dan Kode Rekening
        const subQuery = String(args.subKegiatanKeyword || "").trim();
        const subKeg = await prisma.subKegiatan.findFirst({
          where: {
            OR: [
              { judulSub: { contains: subQuery, mode: "insensitive" } },
              { kodeSub: { contains: subQuery, mode: "insensitive" } },
            ],
          },
          include: {
            rekening: true,
          },
        });

        if (!subKeg || subKeg.rekening.length === 0) {
          return JSON.stringify({
            status: "ERROR",
            message: `Sub-kegiatan / Kode Rekening '${subQuery}' tidak ditemukan di anggaran.`,
          });
        }

        const kodeRek = subKeg.rekening[0]; // ambil rekening pertama

        // 2. Cari Semua Pegawai
        const namaList: string[] = args.namaPegawaiList || [];
        const rosterMatched: Array<{
          pegawaiId: string;
          nama: string;
          nip: string | null;
          jabatan: string;
          golongan: string | null;
          pangkat: string | null;
          role: "KEPALA_JALAN" | "PENGIKUT";
          order: number;
        }> = [];

        for (let i = 0; i < namaList.length; i++) {
          const rawName = namaList[i].trim();
          const p = await prisma.pegawai.findFirst({
            where: {
              nama: { contains: rawName, mode: "insensitive" },
            },
          });

          if (!p) {
            return JSON.stringify({
              status: "ERROR",
              message: `Pegawai '${rawName}' tidak ditemukan di Master Pegawai. Mohon pastikan nama sudah terdaftar.`,
            });
          }

          const isKepala = args.kepalaJalanNama
            ? p.nama.toLowerCase().includes(args.kepalaJalanNama.toLowerCase())
            : i === 0;

          rosterMatched.push({
            pegawaiId: p.id,
            nama: p.nama,
            nip: p.nip,
            jabatan: p.jabatan,
            golongan: p.golongan,
            pangkat: p.pangkat,
            role: isKepala ? "KEPALA_JALAN" : "PENGIKUT",
            order: isKepala ? 0 : i + 1,
          });
        }

        // Urutkan: Kepala Jalan di urutan 0
        rosterMatched.sort((a, b) => a.order - b.order);

        // 3. Hitung Durasi & Komponen DOPD
        const tglBerangkat = new Date(args.tglBerangkat);
        const tglKembali = new Date(args.tglKembali);
        const diffDays = Math.max(
          1,
          Math.ceil((tglKembali.getTime() - tglBerangkat.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );
        const malamHotel = Math.max(0, diffDays - 1);

        const uangHarianRate = BigInt(args.estimasiUangHarian || 430000);
        const hotelRate = BigInt(args.estimasiHotelPerMalam || 700000);
        const transportPPRate = BigInt(args.estimasiTransportPP || 1200000);

        let grandTotal = BigInt(0);
        const pengeluaranDetails: PendingDraftSpj["pengeluaranDetails"] = [];

        rosterMatched.forEach((r, idx) => {
          // Uang Harian
          const totalHarian = uangHarianRate * BigInt(diffDays);
          pengeluaranDetails.push({
            spjRosterItemId: String(idx),
            kategori: "UANG HARIAN",
            uraian: `Uang Harian (${r.nama})`,
            hargaSatuan: uangHarianRate.toString(),
            qty: diffDays,
            satuan: "Hari",
            total: totalHarian.toString(),
          });
          grandTotal += totalHarian;

          // Hotel
          if (malamHotel > 0) {
            const totalHotel = hotelRate * BigInt(malamHotel);
            pengeluaranDetails.push({
              spjRosterItemId: String(idx),
              kategori: "PENGINAPAN",
              uraian: `Penginapan Hotel (${r.nama})`,
              hargaSatuan: hotelRate.toString(),
              qty: malamHotel,
              satuan: "Malam",
              total: totalHotel.toString(),
            });
            grandTotal += totalHotel;
          }

          // Transportasi PP
          pengeluaranDetails.push({
            spjRosterItemId: String(idx),
            kategori: "TRANSPORTASI",
            uraian: `Transportasi: ${args.tempatBerangkat || "Sendawar"} - ${args.tempatTujuan} (PP) (${r.nama})`,
            hargaSatuan: transportPPRate.toString(),
            qty: 1,
            satuan: "Orang",
            total: transportPPRate.toString(),
          });
          grandTotal += transportPPRate;
        });

        // 4. Validasi Sisa Saldo
        if (kodeRek.sisaSaldo < grandTotal) {
          return JSON.stringify({
            status: "ERROR",
            message: `Saldo tidak mencukupi! Kebutuhan SPJ: Rp ${grandTotal.toLocaleString("id-ID")}, namun Sisa Saldo rekening '${kodeRek.judulRekening}' hanya Rp ${kodeRek.sisaSaldo.toLocaleString("id-ID")}.`,
          });
        }

        // 5. Sintesis Naskah Telaahan Staf & Laporan dari Preset
        const dasarPreset = telaahanPresets.dasar[0]?.text || "Guna memelihara standar mutu pelayanan publik...";
        const faktaPreset = telaahanPresets.fakta[0]?.text || "Perlu koordinasi intensif ke instansi terkait...";
        const analisisPreset = telaahanPresets.analisis[0]?.text || "Koordinasi langsung diperlukan untuk percepatan...";
        const kesimpulanPreset = telaahanPresets.kesimpulan[0]?.text || "Dipandang perlu menugaskan personel...";
        const saranPreset = telaahanPresets.saran[0]?.text || "Menugaskan pegawai terkait untuk dinas...";

        const metaDokumen = {
          telaahan: {
            dasar: dasarPreset,
            praAnggapan: ["Koordinasi ini mendesak untuk sinkronisasi data daerah."],
            fakta: [faktaPreset],
            analisis: analisisPreset,
            kesimpulan: kesimpulanPreset,
            saran: saranPreset,
          },
          laporan: {
            dasar: `Surat Perintah Tugas tanggal ${args.tglBerangkat}`,
            hasilPembuka: laporanPresets.hasilPembuka[0]?.text || "Pelaksanaan tugas berjalan lancar.",
            hasilPoin: [
              `Telah dilaksanakan koordinasi mengenai ${args.perihal} di ${args.tempatTujuan}.`,
              "Diperoleh arahan teknis dan data pendukung untuk implementasi lanjutan.",
            ],
            hasilNarasi: laporanPresets.hasilNarasi[0]?.text || "Rekomendasi tindak lanjut segera dilaporkan ke pimpinan.",
          },
        };

        // Ambil User & Team Pertama sebagai Default Operator
        const defaultUser = await prisma.user.findFirst({
          include: { team: true },
        });

        if (!defaultUser) {
          return JSON.stringify({
            status: "ERROR",
            message: "Tidak ada user operator terdaftar di database.",
          });
        }

        const draft: PendingDraftSpj = {
          id: `draft_${Date.now()}`,
          jenisSpj: "PERJADIN",
          teamId: defaultUser.teamId,
          createdById: defaultUser.id,
          kodeRekeningId: kodeRek.id,
          perihal: args.perihal,
          totalPengeluaran: grandTotal.toString(),
          metaDokumen,
          perjadinDetail: {
            tempatBerangkat: args.tempatBerangkat || "Sendawar",
            tempatTujuan: args.tempatTujuan,
            tglBerangkat: tglBerangkat.toISOString(),
            tglKembali: tglKembali.toISOString(),
            lamaPerjalanan: diffDays,
            alatAngkut: args.alatAngkut || "Darat",
            tingkatPerjadin: "Tingkat C",
          },
          rosterItems: rosterMatched,
          pengeluaranDetails,
          createdAt: Date.now(),
        };

        // Simpan ke Session Store untuk konfirmasi
        setPendingDraft(sessionKey, draft);

        return JSON.stringify({
          status: "DRAFT_READY",
          draftId: draft.id,
          perihal: draft.perihal,
          tujuan: draft.perjadinDetail?.tempatTujuan,
          durasi: `${diffDays} Hari (${malamHotel} Malam)`,
          subKegiatan: `${subKeg.judulSub} (${kodeRek.judulRekening})`,
          sisaSaldoSaatIni: Number(kodeRek.sisaSaldo),
          totalKebutuhan: Number(grandTotal),
          sisaSaldoSetelahSpj: Number(kodeRek.sisaSaldo - grandTotal),
          personel: rosterMatched.map((r) => ({
            nama: r.nama,
            role: r.role === "KEPALA_JALAN" ? "Kepala Rombongan" : "Pengikut",
            pangkatGol: `${r.pangkat || "-"} (${r.golongan || "-"})`,
          })),
          pesanInstruksi: "Draft telah berhasil dibuat. Silakan instruksikan pengguna untuk membalas 'SIMPAN' guna mencatat data secara permanen.",
        });
      }

      case "draft_spj_mamin": {
        const subQuery = String(args.subKegiatanKeyword || "").trim();
        const subKeg = await prisma.subKegiatan.findFirst({
          where: {
            OR: [
              { judulSub: { contains: subQuery, mode: "insensitive" } },
              { kodeSub: { contains: subQuery, mode: "insensitive" } },
            ],
          },
          include: { rekening: true },
        });

        if (!subKeg || subKeg.rekening.length === 0) {
          return JSON.stringify({
            status: "ERROR",
            message: `Sub-kegiatan '${subQuery}' tidak ditemukan.`,
          });
        }
        const kodeRek = subKeg.rekening[0];

        const vendorQuery = String(args.vendorKeyword || "").trim();
        const vendor = await prisma.vendorPihakKetiga.findFirst({
          where: {
            namaVendor: { contains: vendorQuery, mode: "insensitive" },
          },
        });

        if (!vendor) {
          return JSON.stringify({
            status: "ERROR",
            message: `Vendor katering '${vendorQuery}' tidak ditemukan di database master vendor.`,
          });
        }

        const jmlPeserta = Number(args.jumlahPeserta || 1);
        const porsiMakan = Number(args.porsiMakan || jmlPeserta);
        const hargaMakan = BigInt(args.hargaMakan || 45000);
        const porsiSnack = Number(args.porsiSnack || jmlPeserta);
        const hargaSnack = BigInt(args.hargaSnack || 20000);

        const totalMakan = hargaMakan * BigInt(porsiMakan);
        const totalSnack = hargaSnack * BigInt(porsiSnack);
        const grandTotal = totalMakan + totalSnack;

        if (kodeRek.sisaSaldo < grandTotal) {
          return JSON.stringify({
            status: "ERROR",
            message: `Saldo tidak mencukupi! Kebutuhan: Rp ${grandTotal.toLocaleString("id-ID")}, Sisa Saldo: Rp ${kodeRek.sisaSaldo.toLocaleString("id-ID")}.`,
          });
        }

        const defaultUser = await prisma.user.findFirst({ include: { team: true } });
        if (!defaultUser) throw new Error("Operator tidak ditemukan.");

        const draft: PendingDraftSpj = {
          id: `draft_${Date.now()}`,
          jenisSpj: "MAKAN_MINUM",
          teamId: defaultUser.teamId,
          createdById: defaultUser.id,
          kodeRekeningId: kodeRek.id,
          perihal: `Belanja Makan Minum Rapat: ${args.namaRapat}`,
          totalPengeluaran: grandTotal.toString(),
          metaDokumen: {
            namaRapat: args.namaRapat,
            jumlahPeserta: jmlPeserta,
            vendorName: vendor.namaVendor,
            npwp: vendor.npwp,
          },
          maminDetail: {
            vendorId: vendor.id,
            namaRapat: args.namaRapat,
            jumlahPeserta: jmlPeserta,
          },
          pengeluaranDetails: [
            {
              kategori: "MAKAN_BERAT",
              uraian: `Belanja Makanan (${porsiMakan} Porsi)`,
              hargaSatuan: hargaMakan.toString(),
              qty: porsiMakan,
              satuan: "Porsi",
              total: totalMakan.toString(),
            },
            {
              kategori: "SNACK",
              uraian: `Belanja Snack Kotak (${porsiSnack} Kotak)`,
              hargaSatuan: hargaSnack.toString(),
              qty: porsiSnack,
              satuan: "Kotak",
              total: totalSnack.toString(),
            },
          ],
          createdAt: Date.now(),
        };

        setPendingDraft(sessionKey, draft);

        return JSON.stringify({
          status: "DRAFT_READY",
          agenda: args.namaRapat,
          vendor: vendor.namaVendor,
          jumlahPeserta: jmlPeserta,
          rincian: [
            `Makan: ${porsiMakan} porsi @ Rp ${Number(hargaMakan).toLocaleString("id-ID")} = Rp ${Number(totalMakan).toLocaleString("id-ID")}`,
            `Snack: ${porsiSnack} kotak @ Rp ${Number(hargaSnack).toLocaleString("id-ID")} = Rp ${Number(totalSnack).toLocaleString("id-ID")}`,
          ],
          totalKebutuhan: Number(grandTotal),
          sisaSaldoSetelahSpj: Number(kodeRek.sisaSaldo - grandTotal),
          pesanInstruksi: "Draft Mamin siap. Minta pengguna mengetik 'SIMPAN' untuk mengonfirmasi.",
        });
      }

      case "draft_spj_honor": {
        const subQuery = String(args.subKegiatanKeyword || "").trim();
        const subKeg = await prisma.subKegiatan.findFirst({
          where: {
            OR: [
              { judulSub: { contains: subQuery, mode: "insensitive" } },
              { kodeSub: { contains: subQuery, mode: "insensitive" } },
            ],
          },
          include: { rekening: true },
        });

        if (!subKeg || subKeg.rekening.length === 0) {
          return JSON.stringify({
            status: "ERROR",
            message: `Sub-kegiatan '${subQuery}' tidak ditemukan.`,
          });
        }
        const kodeRek = subKeg.rekening[0];

        const penerimaList: string[] = args.namaPenerimaList || [];
        const jam = Number(args.jamPelajaran || 1);
        const tarif = BigInt(args.tarifPerJam || 300000);
        const totalBrutoPerOrang = tarif * BigInt(jam);

        let totalBrutoSemua = BigInt(0);
        let totalPajakSemua = BigInt(0);
        let totalNettoSemua = BigInt(0);

        const rincianHonor: any[] = [];
        const pengeluaranDetails: PendingDraftSpj["pengeluaranDetails"] = [];

        for (const rawName of penerimaList) {
          const p = await prisma.pegawai.findFirst({
            where: { nama: { contains: rawName, mode: "insensitive" } },
          });

          // Logika Pajak PPh 21
          let pajakPct = 5;
          if (p?.golongan?.toUpperCase().startsWith("IV")) {
            pajakPct = 15;
          } else if (p?.golongan?.toUpperCase().startsWith("III")) {
            pajakPct = 5;
          } else if (p?.golongan?.toUpperCase().startsWith("II") || p?.golongan?.toUpperCase().startsWith("I")) {
            pajakPct = 0;
          }

          const potonganPajak = (totalBrutoPerOrang * BigInt(pajakPct)) / BigInt(100);
          const diterimaNetto = totalBrutoPerOrang - potonganPajak;

          totalBrutoSemua += totalBrutoPerOrang;
          totalPajakSemua += potonganPajak;
          totalNettoSemua += diterimaNetto;

          rincianHonor.push({
            nama: p?.nama || rawName,
            status: p ? `PNS Gol. ${p.golongan || "-"}` : "Non-PNS",
            jam,
            tarifPerJam: Number(tarif),
            bruto: Number(totalBrutoPerOrang),
            pajakPct: `${pajakPct}%`,
            potonganPajak: Number(potonganPajak),
            diterimaNetto: Number(diterimaNetto),
          });

          pengeluaranDetails.push({
            kategori: "HONORARIUM",
            uraian: `Honorarium ${args.namaKegiatan} (${p?.nama || rawName})`,
            hargaSatuan: totalBrutoPerOrang.toString(),
            qty: 1,
            satuan: "Orang",
            total: totalBrutoPerOrang.toString(),
          });
        }

        if (kodeRek.sisaSaldo < totalBrutoSemua) {
          return JSON.stringify({
            status: "ERROR",
            message: `Saldo tidak mencukupi! Kebutuhan: Rp ${totalBrutoSemua.toLocaleString("id-ID")}, Sisa Saldo: Rp ${kodeRek.sisaSaldo.toLocaleString("id-ID")}.`,
          });
        }

        const defaultUser = await prisma.user.findFirst({ include: { team: true } });
        if (!defaultUser) throw new Error("Operator tidak ditemukan.");

        const draft: PendingDraftSpj = {
          id: `draft_${Date.now()}`,
          jenisSpj: "HONORARIUM",
          teamId: defaultUser.teamId,
          createdById: defaultUser.id,
          kodeRekeningId: kodeRek.id,
          perihal: `Honorarium: ${args.namaKegiatan}`,
          totalPengeluaran: totalBrutoSemua.toString(),
          metaDokumen: {
            namaKegiatan: args.namaKegiatan,
            rincianHonor,
          },
          pengeluaranDetails,
          createdAt: Date.now(),
        };

        setPendingDraft(sessionKey, draft);

        return JSON.stringify({
          status: "DRAFT_READY",
          kegiatan: args.namaKegiatan,
          penerima: rincianHonor,
          totalBruto: Number(totalBrutoSemua),
          totalPajak: Number(totalPajakSemua),
          totalNetto: Number(totalNettoSemua),
          sisaSaldoSetelahSpj: Number(kodeRek.sisaSaldo - totalBrutoSemua),
          pesanInstruksi: "Draft Honorarium siap. Minta pengguna membalas 'SIMPAN' untuk memasukkan ke database.",
        });
      }

      case "commit_pending_spj": {
        const session = getSession(sessionKey);
        const draft = session.pendingDraft;

        if (!draft) {
          return JSON.stringify({
            status: "NO_DRAFT",
            message: "Tidak ada draft SPJ yang sedang aktif. Silakan instruksikan pembuatan SPJ terlebih dahulu.",
          });
        }

        const totalNominal = BigInt(draft.totalPengeluaran);

        // Eksekusi Atomic Transaction via Prisma $transaction
        const createdSpj = await prisma.$transaction(async (tx) => {
          // 1. Kunci dan Validasi Saldo
          const rek = await tx.kodeRekening.findUnique({
            where: { id: draft.kodeRekeningId },
          });

          if (!rek || rek.sisaSaldo < totalNominal) {
            throw new Error(
              `Gagal menyimpan: Saldo tidak mencukupi (Sisa: Rp ${rek?.sisaSaldo.toLocaleString("id-ID") || 0})`
            );
          }

          // 2. Potong Saldo Rekening
          await tx.kodeRekening.update({
            where: { id: draft.kodeRekeningId },
            data: {
              sisaSaldo: {
                decrement: totalNominal,
              },
            },
          });

          // 3. Generate Nomor BKU Otomatis
          const spjCount = await tx.spj.count({ where: { teamId: draft.teamId } });
          const year = new Date().getFullYear();
          const nomorBku = `SPJ/${year}/${draft.jenisSpj.slice(0, 3)}/${String(spjCount + 1).padStart(4, "0")}`;

          // 4. Insert Induk SPJ
          const spj = await tx.spj.create({
            data: {
              nomorBku,
              jenisSpj: draft.jenisSpj,
              perihal: draft.perihal,
              kodeRekeningId: draft.kodeRekeningId,
              teamId: draft.teamId,
              createdById: draft.createdById,
              totalPengeluaran: totalNominal,
              metaDokumen: draft.metaDokumen,
            },
          });

          // 5. Insert Detail Berdasarkan Jenis
          if (draft.jenisSpj === "PERJADIN" && draft.perjadinDetail) {
            await tx.spjPerjadinDetail.create({
              data: {
                spjId: spj.id,
                tempatBerangkat: draft.perjadinDetail.tempatBerangkat,
                tempatTujuan: draft.perjadinDetail.tempatTujuan,
                tglBerangkat: new Date(draft.perjadinDetail.tglBerangkat),
                tglKembali: new Date(draft.perjadinDetail.tglKembali),
                lamaPerjalanan: draft.perjadinDetail.lamaPerjalanan,
                alatAngkut: draft.perjadinDetail.alatAngkut,
                tingkatPerjadin: draft.perjadinDetail.tingkatPerjadin,
              },
            });

            // Insert Roster Items
            if (draft.rosterItems) {
              const rosterMap = new Map<string, string>(); // index ➔ id
              for (const r of draft.rosterItems) {
                const rosterCreated = await tx.spjRosterItem.create({
                  data: {
                    spjId: spj.id,
                    pegawaiId: r.pegawaiId,
                    order: r.order,
                    role: r.role,
                    nama: r.nama,
                    nip: r.nip,
                    jabatan: r.jabatan,
                    golongan: r.golongan,
                    pangkat: r.pangkat,
                  },
                });
                rosterMap.set(String(r.order === 0 ? 0 : r.order - 1), rosterCreated.id);
              }

              // Insert Pengeluaran Detail
              for (const item of draft.pengeluaranDetails) {
                const rosterDbId = item.spjRosterItemId ? rosterMap.get(item.spjRosterItemId) : undefined;
                await tx.spjPengeluaranDetail.create({
                  data: {
                    spjId: spj.id,
                    spjRosterItemId: rosterDbId,
                    kategori: item.kategori,
                    uraian: item.uraian,
                    hargaSatuan: BigInt(item.hargaSatuan),
                    qty: item.qty,
                    satuan: item.satuan,
                    total: BigInt(item.total),
                  },
                });
              }
            }
          } else if (draft.jenisSpj === "MAKAN_MINUM" && draft.maminDetail) {
            await tx.spjMaminDetail.create({
              data: {
                spjId: spj.id,
                vendorId: draft.maminDetail.vendorId,
                namaRapat: draft.maminDetail.namaRapat,
                jumlahPeserta: draft.maminDetail.jumlahPeserta,
              },
            });

            for (const item of draft.pengeluaranDetails) {
              await tx.spjPengeluaranDetail.create({
                data: {
                  spjId: spj.id,
                  kategori: item.kategori,
                  uraian: item.uraian,
                  hargaSatuan: BigInt(item.hargaSatuan),
                  qty: item.qty,
                  satuan: item.satuan,
                  total: BigInt(item.total),
                },
              });
            }
          } else {
            // Honorarium / Operasional
            for (const item of draft.pengeluaranDetails) {
              await tx.spjPengeluaranDetail.create({
                data: {
                  spjId: spj.id,
                  kategori: item.kategori,
                  uraian: item.uraian,
                  hargaSatuan: BigInt(item.hargaSatuan),
                  qty: item.qty,
                  satuan: item.satuan,
                  total: BigInt(item.total),
                },
              });
            }
          }

          return spj;
        });

        // Bersihkan draft setelah sukses
        clearPendingDraft(sessionKey);

        return JSON.stringify({
          status: "SUCCESS",
          spjId: createdSpj.id,
          nomorBku: createdSpj.nomorBku,
          totalPengeluaran: Number(createdSpj.totalPengeluaran),
          message: `SPJ berhasil disimpan secara resmi ke buku kas dengan Nomor ${createdSpj.nomorBku}.`,
        });
      }

      default:
        return JSON.stringify({ error: `Tool ${name} tidak dikenali.` });
    }
  } catch (error: any) {
    console.error(`[AI Tool Error - ${name}]:`, error);
    return JSON.stringify({
      status: "ERROR",
      message: error?.message || "Terjadi kesalahan internal saat mengeksekusi data.",
    });
  }
}
