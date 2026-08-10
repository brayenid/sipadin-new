"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function executeImportMigration(payload: {
  jsonData: any;
  mappings: {
    teamId: string;
    userMapping: Record<string, string>; // v1_user_id -> v2_user_id
    pegawaiMapping: Record<
      string,
      { action: "USE_EXISTING" | "CREATE_NEW" | "OVERWRITE"; v2Id?: string }
    >; // v1_pegawai_id -> resolution
    rekeningPagu: Record<string, number>; // kodeRekening -> paguAmount
    spjOverwrite: Record<string, "OVERWRITE" | "SKIP" | "KEEP_DUPLICATE">; // nomorBku -> resolution
  };
}) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Hanya Super Admin yang dapat mengimpor data.");
  }

  const { jsonData, mappings } = payload;
  const { teamId, userMapping, pegawaiMapping, rekeningPagu, spjOverwrite } = mappings;

  if (!teamId) {
    throw new Error("Target Team ID wajib ditentukan.");
  }

  const logs: string[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Jalankan dalam satu transaksi untuk menjamin integritas data finansial
  const result = await prisma.$transaction(async (tx) => {
    // 1. RESOLUSI PEGAWAI
    logs.push("=== Memulai Pemetaan Master Pegawai ===");
    const pegawaiIdMap: Record<string, string> = {}; // v1_id -> v2_id

    for (const p of jsonData.pegawais || []) {
      const resolution = pegawaiMapping[p.id];
      if (resolution && resolution.action === "USE_EXISTING" && resolution.v2Id) {
        // Gunakan pegawai V2 yang sudah ada
        pegawaiIdMap[p.id] = resolution.v2Id;
        logs.push(`Pegawai [${p.nama}] dipetakan ke data V2 yang ada (ID: ${resolution.v2Id})`);
      } else if (resolution && resolution.action === "OVERWRITE" && resolution.v2Id) {
        // Timpa data pegawai V2
        const updated = await tx.pegawai.update({
          where: { id: resolution.v2Id },
          data: {
            nama: p.nama,
            nip: p.nip || null,
            pangkat: p.pangkat || null,
            golongan: p.golongan || null,
            jabatan: p.jabatan,
            instansi: p.instansi || "Sekretariat Daerah Kabupaten Kutai Barat",
          },
        });
        pegawaiIdMap[p.id] = updated.id;
        logs.push(`Pegawai [${p.nama}] menimpa data V2 yang ada (ID: ${updated.id})`);
      } else {
        // CREATE NEW: Buat pegawai baru di V2
        // Cek dulu apakah pegawai dengan NIP yang sama sudah ada di Team ini untuk mencegah error unique constraint
        let existingPeg = null;
        if (p.nip) {
          existingPeg = await tx.pegawai.findUnique({
            where: { nip_teamId: { nip: p.nip, teamId } },
          });
        }

        if (existingPeg) {
          pegawaiIdMap[p.id] = existingPeg.id;
          logs.push(
            `Pegawai [${p.nama}] terdeteksi memiliki NIP sama [${p.nip}] di target Team, otomatis dipetakan ke ID V2: ${existingPeg.id}`
          );
        } else {
          const newPeg = await tx.pegawai.create({
            data: {
              nama: p.nama,
              nip: p.nip || null,
              pangkat: p.pangkat || null,
              golongan: p.golongan || null,
              jabatan: p.jabatan,
              instansi: p.instansi || "Sekretariat Daerah Kabupaten Kutai Barat",
              teamId,
            },
          });
          pegawaiIdMap[p.id] = newPeg.id;
          logs.push(`Pegawai baru [${p.nama}] dibuat di V2 (ID: ${newPeg.id})`);
        }
      }
    }

    // 2. RESOLUSI STRUKTUR ANGGARAN
    logs.push("\n=== Memulai Pemetaan Struktur Anggaran ===");
    const rekeningIdMap: Record<string, string> = {}; // kodeRekening -> v2_rekening_id

    // Kumpulkan kombinasi anggaran unik dari SPJ V1
    const uniqueAnggaran: Record<string, any> = {};
    for (const spj of jsonData.spjs || []) {
      if (spj.kodeRekening) {
        uniqueAnggaran[spj.kodeRekening] = {
          tahunAnggaran: spj.tahunAnggaran || new Date(spj.tglBerangkat).getFullYear().toString(),
          kodeKegiatan: spj.kodeKegiatan || "0.00",
          judulKegiatan: spj.judulKegiatan || "Kegiatan Hasil Migrasi",
          kodeSubKegiatan: spj.kodeSubKegiatan || "0.00.00",
          judulSubKegiatan: spj.judulSubKegiatan || "Sub Kegiatan Hasil Migrasi",
          kodeRekening: spj.kodeRekening,
          judulRekening: spj.judulRekening || "Rekening Hasil Migrasi",
        };
      }
    }

    for (const key of Object.keys(uniqueAnggaran)) {
      const item = uniqueAnggaran[key];

      // a. Tahun Anggaran
      const tahunRecord = await tx.tahunAnggaran.upsert({
        where: { tahun: item.tahunAnggaran },
        update: {},
        create: { tahun: item.tahunAnggaran },
      });

      // b. Kegiatan
      let kegRecord = await tx.kegiatan.findFirst({
        where: { kodeKegiatan: item.kodeKegiatan, tahunAnggaranId: tahunRecord.id },
      });
      if (!kegRecord) {
        kegRecord = await tx.kegiatan.create({
          data: {
            tahunAnggaranId: tahunRecord.id,
            kodeKegiatan: item.kodeKegiatan,
            judulKegiatan: item.judulKegiatan,
          },
        });
      }

      // c. Sub Kegiatan
      let subKegRecord = await tx.subKegiatan.findFirst({
        where: { kodeSub: item.kodeSubKegiatan, kegiatanId: kegRecord.id },
      });
      if (!subKegRecord) {
        subKegRecord = await tx.subKegiatan.create({
          data: {
            kegiatanId: kegRecord.id,
            kodeSub: item.kodeSubKegiatan,
            judulSub: item.judulSubKegiatan,
          },
        });
      }

      // d. Kode Rekening (dengan inisialisasi pagu)
      let rekRecord = await tx.kodeRekening.findFirst({
        where: { kodeRekening: item.kodeRekening, subKegiatanId: subKegRecord.id },
      });

      const paguInputVal = rekeningPagu[item.kodeRekening] !== undefined ? Number(rekeningPagu[item.kodeRekening]) : 0;
      const enteredPagu = BigInt(paguInputVal);

      if (!rekRecord) {
        rekRecord = await tx.kodeRekening.create({
          data: {
            subKegiatanId: subKegRecord.id,
            kodeRekening: item.kodeRekening,
            judulRekening: item.judulRekening,
            saldoAwal: enteredPagu,
            sisaSaldo: enteredPagu,
          },
        });
        logs.push(
          `Kode Rekening baru dibuat: [${item.kodeRekening}] ${item.judulRekening} dengan Pagu Saldo: Rp ${paguInputVal.toLocaleString("id-ID")}`
        );
      } else {
        // Jika rekening sudah ada, update saldoAwal dan sisaSaldo sesuai nominal pagu baru yang diinput user
        rekRecord = await tx.kodeRekening.update({
          where: { id: rekRecord.id },
          data: {
            saldoAwal: enteredPagu,
            sisaSaldo: enteredPagu,
          },
        });
        logs.push(
          `Kode Rekening yang sudah ada [${item.kodeRekening}] disetel ulang dengan Pagu Saldo baru: Rp ${paguInputVal.toLocaleString("id-ID")}`
        );
      }

      rekeningIdMap[item.kodeRekening] = rekRecord.id;
    }

    // 3. MAPPING USER CREATOR
    const defaultCreatorId = session.user.id; // Fallback ke user yang mengeksekusi import

    // 4. MIGRATING INDIVIDUAL SPJS
    logs.push("\n=== Memulai Migrasi SPJ ===");

    for (const spj of jsonData.spjs || []) {
      try {
        const v2RekeningId = spj.kodeRekening ? rekeningIdMap[spj.kodeRekening] : null;
        if (!v2RekeningId) {
          throw new Error(`Kode rekening '${spj.kodeRekening}' tidak terdaftar.`);
        }

        // Resolusi konflik duplikasi SPJ berdasarkan Nomor BKU
        let resolvedBku = spj.nomorBku || null;
        if (resolvedBku) {
          const existingSpj = await tx.spj.findFirst({
            where: { nomorBku: resolvedBku },
          });

          if (existingSpj) {
            const action = spjOverwrite[spj.id] || "KEEP_DUPLICATE";
            if (action === "SKIP") {
              logs.push(`⚠️ SPJ Skip: Nomor BKU [${resolvedBku}] sudah terdaftar di V2. SPJ diabaikan.`);
              skippedCount++;
              continue;
            } else if (action === "OVERWRITE") {
              // Hapus SPJ lama beserta relasi cascade-nya terlebih dahulu
              await tx.spj.delete({
                where: { id: existingSpj.id },
              });
              logs.push(`🔥 SPJ Overwrite: SPJ lama dengan BKU [${resolvedBku}] dihapus.`);
            } else {
              // KEEP_DUPLICATE: Tambahkan suffix agar BKU unik
              const suffix = Math.floor(100 + Math.random() * 900).toString();
              resolvedBku = `${resolvedBku}-MIG-${suffix}`;
              logs.push(`📝 SPJ Duplikat: BKU diganti menjadi [${resolvedBku}] agar unik.`);
            }
          }
        }

        // Hitung total pengeluaran
        const totalBiaya = spj.rincian?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        const totalPengeluaran = BigInt(totalBiaya);

        // Cari pencipta dokumen
        const createdById = userMapping[spj.createdById] || defaultCreatorId;

        // Cari penandatangan dari list signers V1
        const findMappedPegId = (v1PegId: string | null) => {
          if (!v1PegId) return "";
          return pegawaiIdMap[v1PegId] || "";
        };

        const signerTelaahanId = findMappedPegId(spj.telaahan?.signerPegawaiId);
        const signerSuratTugasId = findMappedPegId(spj.spjSuratTugas?.signerPegawaiId);

        const spdSignerV1 = spj.signers?.find((s: any) => s.docType === "SPD");
        const signerSpdId = spdSignerV1 ? findMappedPegId(spdSignerV1.pegawaiId) : "";

        const kpaSignerV1 = spj.signers?.find(
          (s: any) => s.docType === "KUITANSI" && s.roleKey?.includes("PPK")
        ) || spj.signers?.find((s: any) => s.docType === "DOPD" && s.order === 1);
        const bppSignerV1 = spj.signers?.find(
          (s: any) => s.docType === "KUITANSI" && s.roleKey?.includes("BENDAHARA")
        ) || spj.signers?.find((s: any) => s.docType === "DOPD" && s.order === 2);

        const kpaId = kpaSignerV1 ? findMappedPegId(kpaSignerV1.pegawaiId) : "";
        const bppId = bppSignerV1 ? findMappedPegId(bppSignerV1.pegawaiId) : "";

        // Buat metaDokumen JSON
        const metaDokumen: any = {
          driveUrl: spj.buktiDukungUrl || "",
          telaahan: spj.telaahan
            ? {
                nomorPrefix: "000.8 / ",
                nomorTengah: spj.noTelaahan || "",
                nomorSuffix: " /Org-TU.P",
                tanggal: spj.telaahan.tglTelaahan
                  ? spj.telaahan.tglTelaahan.split("T")[0]
                  : "",
                kepada: spj.telaahan.kepada || "Bupati Kutai Barat",
                perihal: spj.telaahan.perihal || spj.maksudDinas,
                sifat: spj.telaahan.sifat || "Penting",
                lampiran: spj.telaahan.lampiran || "-",
                dasar: spj.telaahan.dasar || "",
                praAnggapan: spj.telaahan.praAnggapan || [],
                fakta: spj.telaahan.fakta || [],
                analisis: spj.telaahan.analisis || "",
                kesimpulan: spj.telaahan.kesimpulan || "",
                saran: spj.telaahan.saran || "",
                penandatanganId: signerTelaahanId,
              }
            : null,
          suratTugas: {
            penandatanganId: signerSuratTugasId,
            nomorPrefix: "800.1.11.1/",
            nomorTengah: spj.noSuratTugas || "",
            nomorSuffix: " /Org-TU.P",
            tanggalSurat: spj.tglSuratTugas ? spj.tglSuratTugas.split("T")[0] : "",
          },
          spd: {
            nomorPrefix: "090/",
            nomorTengah: spj.noSpd || "",
            nomorSuffix: " /Org-TU.P",
            tanggalSurat: spj.tglSpd ? spj.tglSpd.split("T")[0] : "",
            penandatanganId: signerSpdId,
            tingkatBiaya: spj.tingkatPerjalanan || "",
            keteranganLain: "",
          },
          visum: {
            stageCount: spj.visum?.stageCount || 3,
          },
          kuitansi: {
            tanggal: spj.kuitansi?.tanggalKuitansi
              ? spj.kuitansi.tanggalKuitansi.split("T")[0]
              : "",
            kpaId,
            bppId,
            kotaTandaTangan: spj.kotaTandaTangan || "Sendawar",
          },
          dopd: {
            kpaId,
            bppId,
            kotaTandaTangan: spj.kotaTandaTangan || "Sendawar",
          },
          laporan: spj.laporan
            ? {
                dasarLaporan: spj.laporan.dasarLaporan || "",
                kegiatan: spj.laporan.kegiatan || "",
                waktu: spj.laporan.waktu || "",
                lokasi: spj.laporan.lokasi || "",
                tujuan: spj.laporan.tujuan || "",
                hasilMode: spj.laporan.hasilMode || "POINTS",
                hasilPembuka: spj.laporan.hasilPembuka || "",
                hasilPoin: spj.laporan.hasilPoin || [],
                hasilNarasi: spj.laporan.hasilNarasi || "",
              }
            : null,
        };

        // Buat SPJ Induk di V2
        const createdSpj = await tx.spj.create({
          data: {
            nomorBku: resolvedBku,
            tanggalSpj: new Date(spj.tglBerangkat),
            jenisSpj: "PERJADIN",
            perihal: spj.maksudDinas,
            tanggalPelaksanaan: new Date(spj.tglBerangkat),
            kodeRekeningId: v2RekeningId,
            teamId,
            createdById,
            totalPengeluaran,
            driveUrl: spj.buktiDukungUrl || null,
            terbayar: spj.pencairan || false,
            metaDokumen,
          },
        });

        // Kurangi Sisa Saldo Rekening
        await tx.kodeRekening.update({
          where: { id: v2RekeningId },
          data: {
            sisaSaldo: {
              decrement: totalPengeluaran,
            },
          },
        });

        // Buat SPJ Perjadin Detail
        await tx.spjPerjadinDetail.create({
          data: {
            spjId: createdSpj.id,
            tempatBerangkat: spj.tempatBerangkat || "Sendawar",
            tempatTujuan: spj.tempatTujuan || "-",
            tglBerangkat: new Date(spj.tglBerangkat),
            tglKembali: new Date(spj.tglKembali),
            lamaPerjalanan: spj.lamaPerjalanan || 1,
            alatAngkut: spj.alatAngkut || "Darat",
            tingkatPerjadin: spj.tingkatPerjalanan || null,
          },
        });

        // Buat Roster Pegawai
        const rosterIdMap: Record<string, string> = {}; // v1_roster_id -> v2_roster_id

        for (const r of spj.roster || []) {
          const v2PegawaiId = pegawaiIdMap[r.pegawaiId];
          if (!v2PegawaiId) continue;

          const createdRoster = await tx.spjRosterItem.create({
            data: {
              spjId: createdSpj.id,
              pegawaiId: v2PegawaiId,
              order: r.order,
              role: r.role, // 'KEPALA_JALAN' | 'PENGIKUT'
              nama: r.nama,
              nip: r.nip || null,
              jabatan: r.jabatan,
              golongan: r.golongan || null,
              pangkat: r.pangkat || null,
            },
          });
          rosterIdMap[r.id] = createdRoster.id;
        }

        // Buat Rincian Biaya Pengeluaran (DOPD)
        for (const item of spj.rincian || []) {
          const v2RosterItemId = rosterIdMap[item.rosterItemId] || null;

          // Hitung total pengali dan susun JSON faktorPengali
          const qty = item.factors?.reduce((acc: number, f: any) => acc * (f.qty || 1), 1) || 1;
          const labelSatuan = item.factors?.map((f: any) => f.label).join(" x ") || "Orang";

          await tx.spjPengeluaranDetail.create({
            data: {
              spjId: createdSpj.id,
              spjRosterItemId: v2RosterItemId,
              kategori: item.kategori,
              uraian: item.uraian,
              hargaSatuan: BigInt(item.hargaSatuan || 0),
              qty,
              satuan: labelSatuan,
              total: BigInt(item.total || 0),
              faktorPengali: item.factors
                ? item.factors.map((f: any) => ({ label: f.label, value: f.qty }))
                : [],
            },
          });
        }

        logs.push(`✅ SPJ Berhasil Diimpor: BKU [${resolvedBku || createdSpj.id}] - Perihal: ${spj.maksudDinas.substring(0, 40)}...`);
        successCount++;
      } catch (err: any) {
        console.error("SPJ_IMPORT_ROW_ERROR", err);
        logs.push(`❌ Gagal mengimpor SPJ [BKU: ${spj.nomorBku || "N/A"}]: ${err.message || err}`);
        errorCount++;
      }
    }

    return {
      success: true,
      successCount,
      skippedCount,
      errorCount,
      logs,
    };
  });

  revalidatePath("/dashboard/spj");
  revalidatePath("/dashboard/tahun-anggaran");
  return result;
}
