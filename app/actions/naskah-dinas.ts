"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getNaskahDinasList() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const list = await prisma.naskahDinas.findMany({
    where: { teamId: session.user.teamId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } }
  });

  return list;
}

export async function getNaskahDinasById(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const naskah = await prisma.naskahDinas.findFirst({
    where: { id, teamId: session.user.teamId },
  });

  return naskah;
}

export async function createNaskahDinas(payload: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const naskah = await prisma.naskahDinas.create({
    data: {
      jenisNaskah: payload.jenisNaskah,
      nomorSurat: payload.nomorSurat || null,
      tanggal: payload.tanggal ? new Date(payload.tanggal) : new Date(),
      perihal: payload.perihal || null,
      data: payload.data || {},
      teamId: session.user.teamId,
      createdById: session.user.id,
    }
  });

  revalidatePath("/dashboard/naskah-dinas");
  return naskah;
}

export async function updateNaskahDinas(id: string, payload: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const naskah = await prisma.naskahDinas.findFirst({
    where: { id, teamId: session.user.teamId },
  });

  if (!naskah) throw new Error("Naskah Dinas tidak ditemukan atau akses ditolak.");

  const updated = await prisma.naskahDinas.update({
    where: { id },
    data: {
      nomorSurat: payload.nomorSurat !== undefined ? payload.nomorSurat : naskah.nomorSurat,
      tanggal: payload.tanggal ? new Date(payload.tanggal) : naskah.tanggal,
      perihal: payload.perihal !== undefined ? payload.perihal : naskah.perihal,
      data: payload.data !== undefined ? payload.data : naskah.data,
    }
  });

  revalidatePath(`/dashboard/naskah-dinas/${id}`);
  revalidatePath("/dashboard/naskah-dinas");
  return updated;
}

export async function deleteNaskahDinas(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const naskah = await prisma.naskahDinas.findFirst({
    where: { id, teamId: session.user.teamId },
  });

  if (!naskah) throw new Error("Naskah Dinas tidak ditemukan atau akses ditolak.");

  await prisma.naskahDinas.update({ 
    where: { id },
    data: { isDeleted: true }
  });

  revalidatePath("/dashboard/naskah-dinas");
  return true;
}

export async function restoreNaskahDinas(id: string) {
  const session = await auth();
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error("Unauthorized");

  const naskah = await prisma.naskahDinas.findFirst({
    where: { id, teamId: session.user.teamId },
  });

  if (!naskah) throw new Error("Naskah Dinas tidak ditemukan atau akses ditolak.");

  await prisma.naskahDinas.update({ 
    where: { id },
    data: { isDeleted: false }
  });

  revalidatePath("/dashboard/naskah-dinas");
  revalidatePath("/dashboard/recycle-bin");
  revalidatePath("/dashboard");
  return true;
}

export async function permanentDeleteNaskahDinas(id: string) {
  const session = await auth();
  if (!session || session.user.role !== 'SUPER_ADMIN') throw new Error("Unauthorized");

  const naskah = await prisma.naskahDinas.findFirst({
    where: { id, teamId: session.user.teamId },
  });

  if (!naskah) throw new Error("Naskah Dinas tidak ditemukan atau akses ditolak.");

  await prisma.naskahDinas.delete({ where: { id } });

  revalidatePath("/dashboard/naskah-dinas");
  revalidatePath("/dashboard/recycle-bin");
  return true;
}
