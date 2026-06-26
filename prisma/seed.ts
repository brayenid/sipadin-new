import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Load .env
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Memulai proses seeding database...\n");

  // 1. Buat Team
  const team = await prisma.team.upsert({
    where: { name: "Sekretariat Daerah" },
    update: {},
    create: { name: "Sekretariat Daerah" },
  });
  console.log(`✅ Team dibuat: ${team.name} (ID: ${team.id})`);

  // 2. Buat Super Admin
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      name: "Super Administrator",
      username: "superadmin",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      teamId: team.id,
    },
  });
  console.log(`✅ Super Admin dibuat: ${admin.username}`);

  // 3. Buat User Tim Kerja
  const timPassword = await bcrypt.hash("Tim@123", 12);
  const timUser = await prisma.user.upsert({
    where: { username: "tim.sekda" },
    update: {},
    create: {
      name: "Operator Tim Sekda",
      username: "tim.sekda",
      passwordHash: timPassword,
      role: "TIM_KERJA",
      teamId: team.id,
    },
  });
  console.log(`✅ User Tim Kerja dibuat: ${timUser.username}`);

  // 4. Buat contoh Tahun Anggaran
  const tahun = await prisma.tahunAnggaran.upsert({
    where: { tahun_teamId: { tahun: "2026", teamId: team.id } },
    update: {},
    create: { tahun: "2026", teamId: team.id },
  });
  console.log(`✅ Tahun Anggaran dibuat: ${tahun.tahun}`);

  // 5. Buat contoh Kegiatan
  const kegiatan = await prisma.kegiatan.upsert({
    where: { id: "seed-kegiatan-001" },
    update: {},
    create: {
      id: "seed-kegiatan-001",
      tahunAnggaranId: tahun.id,
      kodeKegiatan: "4.01.4.01.0.00.0.000.001",
      judulKegiatan: "Koordinasi dan Konsultasi Kepala Daerah",
    },
  });
  console.log(`✅ Kegiatan dibuat: ${kegiatan.judulKegiatan}`);

  // 6. Buat contoh Sub-Kegiatan dengan saldo awal
  const saldoAwal = BigInt(50_000_000); // Rp 50.000.000
  const subKegiatan = await prisma.subKegiatan.upsert({
    where: { id: "seed-sub-kegiatan-001" },
    update: {},
    create: {
      id: "seed-sub-kegiatan-001",
      kegiatanId: kegiatan.id,
      kodeSub: "4.01.4.01.0.00.0.000.001.001",
      judulSub: "Perjalanan Dinas Dalam Daerah",
      saldoAwal: saldoAwal,
      sisaSaldo: saldoAwal,
    },
  });
  console.log(
    `✅ Sub-Kegiatan dibuat: ${subKegiatan.judulSub} (Saldo: Rp ${saldoAwal.toLocaleString("id-ID")})`
  );

  console.log("\n🎉 Seeding selesai! Akun login siap digunakan:\n");
  console.log("┌─────────────────────────────────────────────┐");
  console.log("│           AKUN LOGIN SIPADIN                │");
  console.log("├───────────────────┬─────────────────────────┤");
  console.log("│ Role              │ Credentials             │");
  console.log("├───────────────────┼─────────────────────────┤");
  console.log("│ Super Admin       │ superadmin / Admin@123  │");
  console.log("│ Tim Kerja         │ tim.sekda  / Tim@123    │");
  console.log("└───────────────────┴─────────────────────────┘");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("❌ Error saat seeding:", e);
  process.exit(1);
});
