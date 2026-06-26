"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- GETTERS ---
export async function getTahunAnggaran() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.tahunAnggaran.findMany({
    where: { teamId: session.user.teamId },
    include: {
      kegiatan: {
        include: { subKegiatan: true },
      },
    },
    orderBy: { tahun: "desc" },
  });
}

// --- TAHUN ANGGARAN ---
export async function createTahunAnggaran(tahun: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const res = await prisma.tahunAnggaran.create({
    data: {
      tahun,
      teamId: session.user.teamId,
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteTahunAnggaran(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Hanya bisa menghapus jika dimiliki team yang sama
  await prisma.tahunAnggaran.delete({
    where: {
      id,
      teamId: session.user.teamId,
    },
  });
  revalidatePath("/dashboard/tahun-anggaran");
}

// --- KEGIATAN ---
export async function createKegiatan(tahunAnggaranId: string, kodeKegiatan: string, judulKegiatan: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Pastikan TahunAnggaran milik team ini
  const tahun = await prisma.tahunAnggaran.findUnique({
    where: { id: tahunAnggaranId, teamId: session.user.teamId },
  });
  if (!tahun) throw new Error("Tahun Anggaran tidak ditemukan atau bukan milik tim Anda");

  const res = await prisma.kegiatan.create({
    data: {
      tahunAnggaranId,
      kodeKegiatan,
      judulKegiatan,
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteKegiatan(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Validasi pemilik via TahunAnggaran
  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id },
    include: { tahunAnggaran: true },
  });

  if (!kegiatan || kegiatan.tahunAnggaran.teamId !== session.user.teamId) {
    throw new Error("Tidak memiliki akses");
  }

  await prisma.kegiatan.delete({ where: { id } });
  revalidatePath("/dashboard/tahun-anggaran");
}

// --- SUB-KEGIATAN ---
export async function createSubKegiatan(
  kegiatanId: string,
  kodeSub: string,
  judulSub: string,
  saldoAwal: bigint
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id: kegiatanId },
    include: { tahunAnggaran: true },
  });

  if (!kegiatan || kegiatan.tahunAnggaran.teamId !== session.user.teamId) {
    throw new Error("Tidak memiliki akses");
  }

  const res = await prisma.subKegiatan.create({
    data: {
      kegiatanId,
      kodeSub,
      judulSub,
      saldoAwal,
      sisaSaldo: saldoAwal, // Pada awal pembuatan, sisa saldo = saldo awal
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteSubKegiatan(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const sub = await prisma.subKegiatan.findUnique({
    where: { id },
    include: { kegiatan: { include: { tahunAnggaran: true } } },
  });

  if (!sub || sub.kegiatan.tahunAnggaran.teamId !== session.user.teamId) {
    throw new Error("Tidak memiliki akses");
  }

  await prisma.subKegiatan.delete({ where: { id } });
  revalidatePath("/dashboard/tahun-anggaran");
}
