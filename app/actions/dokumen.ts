"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateMetaDokumen(spjId: string, docKey: string, payload: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Verifikasi kepemilikan
  const spj = await prisma.spj.findFirst({
    where: { id: spjId, teamId: session.user.teamId }
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

  // Simpan kembali ke DB
  await prisma.spj.update({
    where: { id: spj.id },
    data: {
      metaDokumen: updatedMeta
    }
  });

  // Revalidate agar UI langsung merefleksikan data baru
  revalidatePath(`/dashboard/spj/${spj.id}`);
  
  return true;
}
