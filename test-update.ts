import { config } from 'dotenv';
config({ path: '.env' }); // Load env vars
import { prisma } from './lib/prisma';

async function main() {
  const spj = await prisma.spj.findFirst();
  console.log('Target SPJ ID:', spj?.id);
  
  if (!spj) {
    console.log('No SPJ found to test.');
    return;
  }

  try {
    const updated = await prisma.spj.update({
      where: { id: spj.id },
      data: {
        tanggalSpj: new Date("2026-06-26"),
        nomorBku: null,
        perihal: "Menghadiri kegiatan A",
        driveUrl: null,
      }
    });
    console.log('Update Success!', updated.id);
  } catch (e: any) {
    console.error('Update Failed!', e.message);
  }
}

main().finally(() => prisma.$disconnect());
