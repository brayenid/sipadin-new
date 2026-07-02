import { prisma } from './lib/prisma'

async function main() {
  await prisma.$executeRawUnsafe(`UPDATE "NaskahDinas" SET "jenisNaskah" = 'SURAT_EDARAN_SEKDA' WHERE "jenisNaskah" = 'SURAT_EDARAN'`);
  console.log('Updated rows');
}

main().catch(console.error).finally(() => prisma.$disconnect());
