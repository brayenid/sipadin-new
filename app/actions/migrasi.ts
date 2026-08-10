"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. ACTION UNTUK MENGIMPOR PEGAWAI
export async function importPegawaisAction(payload: {
  teamId: string;
  pegawais: any[];
  pegawaiMapping: Record<
    string,
    { action: "USE_EXISTING" | "CREATE_NEW" | "OVERWRITE"; v2Id?: string }
  >;
}) {
  const logs: string[] = [];
  const pegawaiIdMap: Record<string, string> = {}; // v1_id -> v2_id

  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized: Hanya Super Admin yang dapat mengimpor data.");
    }

    const { teamId, pegawais, pegawaiMapping } = payload;
    if (!teamId) throw new Error("Target Team ID wajib ditentukan.");

    logs.push("=== Memulai Pemetaan Master Pegawai ===");

    // Gunakan satu transaksi kecil untuk pegawai agar konsisten
    await prisma.$transaction(async (tx) => {
      for (const p of pegawais || []) {
        const resolution = pegawaiMapping[p.id];
        if (resolution && resolution.action === "USE_EXISTING" && resolution.v2Id) {
          pegawaiIdMap[p.id] = resolution.v2Id;
          logs.push(`Pegawai [${p.nama}] dipetakan ke data V2 yang ada (ID: ${resolution.v2Id})`);
        } else if (resolution && resolution.action === "OVERWRITE" && resolution.v2Id) {
          const updated = await tx.pegawai.update({
            where: { id: resolution.v2Id },
            data: {
              nama: p.nama,
              nip: p.nip ? p.nip.trim() : null,
              pangkat: p.pangkat || null,
              golongan: p.golongan || null,
              jabatan: p.jabatan,
              instansi: p.instansi || "Sekretariat Daerah Kabupaten Kutai Barat",
            },
          });
          pegawaiIdMap[p.id] = updated.id;
          logs.push(`Pegawai [${p.nama}] menimpa data V2 yang ada (ID: ${updated.id})`);
        } else {
          const cleanNip = p.nip ? p.nip.trim() : null;
          let existingPeg = null;
          if (cleanNip) {
            existingPeg = await tx.pegawai.findUnique({
              where: { nip_teamId: { nip: cleanNip, teamId } },
            });
          }

          if (existingPeg) {
            pegawaiIdMap[p.id] = existingPeg.id;
            logs.push(
              `Pegawai [${p.nama}] terdeteksi memiliki NIP sama [${cleanNip}] di target Team, dipetakan ke ID V2: ${existingPeg.id}`
            );
          } else {
            const newPeg = await tx.pegawai.create({
              data: {
                nama: p.nama,
                nip: cleanNip,
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
    }, { timeout: 15000 });

    return { success: true, pegawaiIdMap, logs, error: null };
  } catch (err: any) {
    console.error("PEGAWAI_IMPORT_ERROR", err);
    return {
      success: false,
      pegawaiIdMap: {},
      logs: ["❌ Gagal mengimpor master pegawai:", err.message || String(err)],
      error: err.message || String(err),
    };
  }
}

// 2. ACTION UNTUK MENGIMPOR STRUKTUR ANGGARAN
export async function importStructureAction(payload: {
  teamId: string;
  uniqueAnggaran: Record<string, any>;
  rekeningPagu: Record<string, number>;
}) {
  const logs: string[] = [];
  const rekeningIdMap: Record<string, string> = {}; // kodeRekening -> v2_rekening_id

  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized: Hanya Super Admin yang dapat mengimpor data.");
    }

    const { teamId, uniqueAnggaran, rekeningPagu } = payload;
    if (!teamId) throw new Error("Target Team ID wajib ditentukan.");

    logs.push("=== Memulai Pemetaan Struktur Anggaran ===");

    await prisma.$transaction(async (tx) => {
      for (const key of Object.keys(uniqueAnggaran)) {
        const item = uniqueAnggaran[key];

        const tahunRecord = await tx.tahunAnggaran.upsert({
          where: { tahun: item.tahunAnggaran },
          update: {},
          create: { tahun: item.tahunAnggaran },
        });

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
            `Kode Rekening baru dibuat: [${item.kodeRekening}] ${item.judulRekening} dengan Pagu: Rp ${paguInputVal.toLocaleString("id-ID")}`
          );
        } else {
          rekRecord = await tx.kodeRekening.update({
            where: { id: rekRecord.id },
            data: {
              saldoAwal: enteredPagu,
              sisaSaldo: enteredPagu,
            },
          });
          logs.push(
            `Kode Rekening [${item.kodeRekening}] disetel ulang dengan Pagu baru: Rp ${paguInputVal.toLocaleString("id-ID")}`
          );
        }

        rekeningIdMap[item.kodeRekening] = rekRecord.id;
      }
    }, { timeout: 15000 });

    revalidatePath("/dashboard/tahun-anggaran");
    return { success: true, rekeningIdMap, logs, error: null };
  } catch (err: any) {
    console.error("STRUCTURE_IMPORT_ERROR", err);
    return {
      success: false,
      rekeningIdMap: {},
      logs: ["❌ Gagal mengimpor struktur anggaran:", err.message || String(err)],
      error: err.message || String(err),
    };
  }
}

// 3. ACTION UNTUK MENGIMPOR SATU CHUNK SPJ
export async function importSpjChunkAction(payload: {
  teamId: string;
  spjs: any[];
  userMapping: Record<string, string>;
  pegawaiIdMap: Record<string, string>;
  rekeningIdMap: Record<string, string>;
  spjOverwrite: Record<string, "OVERWRITE" | "SKIP" | "KEEP_DUPLICATE">;
}) {
  const logs: string[] = [];
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    const session = await auth();
    if (!session || session.user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized: Hanya Super Admin yang dapat mengimpor data.");
    }

    const { teamId, spjs, userMapping, pegawaiIdMap, rekeningIdMap, spjOverwrite } = payload;
    const defaultCreatorId = session.user.id;

    // Proses setiap SPJ secara individual dalam transaksi mandiri kecil
    for (const spj of spjs || []) {
      try {
        await prisma.$transaction(async (tx) => {
          const spjRek = spj.kodeRekening ? spj.kodeRekening.trim() : "00.00.00";
          const v2RekeningId = rekeningIdMap[spjRek];
          if (!v2RekeningId) {
            throw new Error(`Kode rekening '${spjRek}' tidak terdaftar.`);
          }

          let resolvedBku = spj.nomorBku || null;
          if (resolvedBku) {
            const existingSpj = await tx.spj.findFirst({
              where: { nomorBku: resolvedBku },
            });

            if (existingSpj) {
              const action = spjOverwrite[spj.id] || "KEEP_DUPLICATE";
              if (action === "SKIP") {
                logs.push(`⚠️ SPJ Skip: BKU [${resolvedBku}] sudah terdaftar. SPJ dilewati.`);
                skippedCount++;
                return; // Keluar dari transaksi kecil ini dengan sukses (skip)
              } else if (action === "OVERWRITE") {
                await tx.spj.delete({
                  where: { id: existingSpj.id },
                });
                logs.push(`🔥 SPJ Overwrite: SPJ BKU [${resolvedBku}] lama dihapus.`);
              } else {
                const suffix = Math.floor(100 + Math.random() * 900).toString();
                resolvedBku = `${resolvedBku}-MIG-${suffix}`;
                logs.push(`📝 SPJ Duplikat: BKU diganti menjadi [${resolvedBku}] agar unik.`);
              }
            }
          }

          const totalBiaya = spj.rincian?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
          const totalPengeluaran = BigInt(totalBiaya);
          const createdById = userMapping[spj.createdById] || defaultCreatorId;

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

          const metaDokumen: any = {
            driveUrl: spj.buktiDukungUrl || "",
            telaahan: spj.telaahan
              ? {
                  nomorPrefix: "000.8 / ",
                  nomorTengah: spj.noTelaahan || "",
                  nomorSuffix: " /Org-TU.P",
                  tanggal: spj.telaahan.tglTelaahan ? spj.telaahan.tglTelaahan.split("T")[0] : "",
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
              tanggal: spj.kuitansi?.tanggalKuitansi ? spj.kuitansi.tanggalKuitansi.split("T")[0] : "",
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

          await tx.kodeRekening.update({
            where: { id: v2RekeningId },
            data: {
              sisaSaldo: { decrement: totalPengeluaran },
            },
          });

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

          const rosterIdMap: Record<string, string> = {};
          for (const r of spj.roster || []) {
            const v2PegawaiId = pegawaiIdMap[r.pegawaiId];
            if (!v2PegawaiId) continue;

            const createdRoster = await tx.spjRosterItem.create({
              data: {
                spjId: createdSpj.id,
                pegawaiId: v2PegawaiId,
                order: r.order,
                role: r.role,
                nama: r.nama,
                nip: r.nip || null,
                jabatan: r.jabatan,
                golongan: r.golongan || null,
                pangkat: r.pangkat || null,
              },
            });
            rosterIdMap[r.id] = createdRoster.id;
          }

          for (const item of spj.rincian || []) {
            const v2RosterItemId = rosterIdMap[item.rosterItemId] || null;
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

          logs.push(`✅ SPJ Berhasil Diimpor: BKU [${resolvedBku || createdSpj.id}] - Perihal: ${spj.maksudDinas.substring(0, 45)}...`);
          successCount++;
        });
      } catch (err: any) {
        console.error("SPJ_IMPORT_ROW_ERROR", err);
        logs.push(`❌ Gagal mengimpor SPJ [BKU: ${spj.nomorBku || "N/A"}]: ${err.message || err}`);
        errorCount++;
      }
    }

    revalidatePath("/dashboard/spj");
    return { success: true, successCount, skippedCount, errorCount, logs, error: null as string | null };
  } catch (err: any) {
    console.error("SPJ_CHUNK_IMPORT_ERROR", err);
    return {
      success: false,
      successCount: 0,
      skippedCount: 0,
      errorCount: 0,
      logs: ["❌ Gagal mengimpor chunk SPJ:", err.message || String(err)],
      error: err.message || String(err),
    };
  }
}
