"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function savePengeluaranUmumTransaction(spjId: string, items: any[]) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // 1. Ambil data SPJ
    const spj = await tx.spj.findUnique({
      where: { id: spjId, teamId: session.user.teamId },
      include: { subKegiatan: true }
    });

    if (!spj) throw new Error("SPJ tidak ditemukan.");

    // 2. Hitung total biaya yang baru
    let newTotal = BigInt(0);
    const validItemsToInsert = items.map(item => {
      const hargaSatuan = BigInt(item.hargaSatuan);
      const qty = parseInt(item.qty, 10) || 1;
      const itemTotal = hargaSatuan * BigInt(qty);
      
      newTotal += itemTotal;

      return {
        spjId: spj.id,
        uraian: item.uraian,
        hargaSatuan,
        qty,
        satuan: item.satuan,
        total: itemTotal,
      };
    });

    // 3. Validasi Saldo Pagu
    const oldTotal = spj.totalPengeluaran;
    const diff = newTotal - oldTotal;

    if (diff > BigInt(0)) {
      if (spj.subKegiatan.sisaSaldo < diff) {
        throw new Error(`Saldo Sub-Kegiatan tidak mencukupi. Sisa Saldo: Rp ${spj.subKegiatan.sisaSaldo.toString()}`);
      }
    }

    // 4. Update Saldo
    await tx.subKegiatan.update({
      where: { id: spj.subKegiatanId },
      data: {
        sisaSaldo: {
          decrement: diff,
        }
      }
    });

    // 5. Update Total Pengeluaran di SPJ Induk
    await tx.spj.update({
      where: { id: spj.id },
      data: { totalPengeluaran: newTotal }
    });

    // 6. Hapus pengeluaran lama yang bukan milik roster (pengeluaran umum)
    await tx.spjPengeluaranDetail.deleteMany({
      where: { 
        spjId: spj.id,
        spjRosterItemId: null // Pastikan hanya menghapus pengeluaran umum
      }
    });

    // 7. Insert pengeluaran baru
    if (validItemsToInsert.length > 0) {
      await tx.spjPengeluaranDetail.createMany({
        data: validItemsToInsert
      });
    }

    return true;
  });
}
