/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.naskahDinas.updateMany({
    where: { jenisNaskah: 'SURAT_EDARAN' },
    data: { jenisNaskah: 'SURAT_EDARAN_SEKDA' }
  });
  console.log('Updated rows');
}

main().catch(console.error).finally(() => prisma.$disconnect());
