"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { formatCurrency } from "@/lib/utils";

export async function updateMetaDokumen(spjId: string, docKey: string, payload: any, newTotalPengeluaran?: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // Verifikasi kepemilikan
    const spj = await tx.spj.findFirst({
      where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) },
      include: { kodeRekening: true }
    });

    if (!spj) throw new Error("SPJ tidak ditemukan atau akses ditolak.");

    // Ambil metaDokumen yang ada, atau buat object kosong jika belum ada
    const currentMeta: any = spj.metaDokumen && typeof spj.metaDokumen === 'object' 
      ? spj.metaDokumen 
      : {};

    // Update properti spesifik tanpa menghapus properti dokumen lainnya
    const updatedMeta = {
      ...currentMeta,
      [docKey]: payload
    };

    let totalPengeluaranUpdate = spj.totalPengeluaran;

    // Handle update total pengeluaran dan sisa saldo jika ada parameter newTotalPengeluaran
    if (newTotalPengeluaran !== undefined) {
      const newTotal = BigInt(newTotalPengeluaran);
      const diff = newTotal - spj.totalPengeluaran;

      if (diff > BigInt(0)) {
        if (spj.kodeRekening.sisaSaldo < diff) {
          throw new Error(`Saldo Kode Rekening tidak mencukupi. Sisa Saldo: ${formatCurrency(spj.kodeRekening.sisaSaldo)}`);
        }
      }

      if (diff !== BigInt(0)) {
        await tx.kodeRekening.update({
          where: { id: spj.kodeRekeningId },
          data: {
            sisaSaldo: {
              decrement: diff
            }
          }
        });
        totalPengeluaranUpdate = newTotal;
      }
    }

    // Simpan kembali ke DB
    await tx.spj.update({
      where: { id: spj.id },
      data: {
        metaDokumen: updatedMeta,
        totalPengeluaran: totalPengeluaranUpdate
      }
    });

    return true;
  });
}
