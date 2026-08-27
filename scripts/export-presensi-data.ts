/**
 * ==============================================================================
 * ENGINE EXPORT PRESENSI DARI SIPADIN (File-Based Export)
 * ==============================================================================
 * 
 * Skrip ini mengekstrak data presensi dari database SIPADIN dan menyimpannya
 * ke dalam satu file berkas JSON portabel (presensi-export.json).
 * 
 * Penggunaan:
 *   npx tsx scripts/export-presensi-data.ts
 * ==============================================================================
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function exportPresensiData() {
  console.log("==========================================================");
  console.log("📤 MENGEKSPOR DATA PRESENSI DARI SIPADIN KE FILE JSON");
  console.log("==========================================================\n");

  const startTime = Date.now();

  try {
    console.log("📦 1. Mengambil Master Pegawai...");
    const pegawais = await prisma.pegawai.findMany({
      select: {
        id: true,
        nip: true,
        nama: true,
        pangkat: true,
        golongan: true,
        jabatan: true,
        instansi: true,
        eselon: true,
        kategoriPegawai: true,
        wajibAbsenOpd: true,
        urutanOpd: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log(`   ✅ Ditemukan ${pegawais.length} Pegawai.`);

    console.log("📦 2. Mengambil Agenda Absensi & Rapat...");
    const agendas = await prisma.agendaAbsensi.findMany({
      where: { isDeleted: false },
    });
    console.log(`   ✅ Ditemukan ${agendas.length} Agenda Absensi.`);

    console.log("📦 3. Mengambil Sesi Agenda Rutin (Apel/Senam)...");
    const sesis = await prisma.sesiAgendaAbsensi.findMany();
    console.log(`   ✅ Ditemukan ${sesis.length} Sesi Agenda.`);

    console.log("📦 4. Mengambil Template Peserta Undangan...");
    const templates = await prisma.agendaPesertaTemplate.findMany();
    console.log(`   ✅ Ditemukan ${templates.length} Template Peserta.`);

    console.log("📦 5. Mengambil Log Kehadiran Peserta...");
    const kehadiran = await prisma.kehadiranPeserta.findMany();
    console.log(`   ✅ Ditemukan ${kehadiran.length} Log Kehadiran.`);

    const exportPayload = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      source: "SIPADIN",
      counts: {
        pegawai: pegawais.length,
        agenda: agendas.length,
        sesi: sesis.length,
        template: templates.length,
        kehadiran: kehadiran.length,
      },
      data: {
        pegawais,
        agendas,
        sesis,
        templates,
        kehadiran,
      },
    };

    const outputPath = path.join(process.cwd(), "presensi-export.json");
    fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2), "utf8");

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n==========================================================");
    console.log("🎉 EXPORT BERHASIL!");
    console.log("==========================================================");
    console.log(`📁 File hasil export disimpan di:`);
    console.log(`   👉 ${outputPath}`);
    console.log(`⏱️ Waktu Eksekusi: ${duration} detik`);
    console.log("==========================================================\n");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat export:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportPresensiData();
