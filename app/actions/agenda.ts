"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { KategoriAgenda, StatusAgenda } from "@prisma/client";

export async function getAgendaList(month?: number, year?: number) {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Unauthorized");
  }

  const now = new Date();
  const currentYear = year || now.getFullYear();
  const currentMonth = month !== undefined ? month : now.getMonth();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  const agendas = await prisma.agendaTim.findMany({
    where: {
      teamId: session.user.teamId,
      isDeleted: false,
      tanggalMulai: {
        gte: new Date(currentYear, currentMonth - 1, 1), // load 1 month buffer
        lte: new Date(currentYear, currentMonth + 2, 0),
      },
    },
    orderBy: { tanggalMulai: "asc" },
  });

  return agendas.map((a) => ({
    ...a,
    tanggalMulai: a.tanggalMulai.toISOString(),
    tanggalSelesai: a.tanggalSelesai?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
}

export async function createAgenda(formData: {
  judul: string;
  kategori: KategoriAgenda;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  pic?: string | null;
  status?: StatusAgenda;
}) {
  const session = await auth();
  if (!session?.user?.teamId || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const created = await prisma.agendaTim.create({
    data: {
      judul: formData.judul,
      kategori: formData.kategori || "RAPAT",
      tanggalMulai: new Date(formData.tanggalMulai),
      tanggalSelesai: formData.tanggalSelesai ? new Date(formData.tanggalSelesai) : null,
      waktuMulai: formData.waktuMulai || null,
      waktuSelesai: formData.waktuSelesai || null,
      lokasi: formData.lokasi || null,
      deskripsi: formData.deskripsi || null,
      pic: formData.pic || null,
      status: formData.status || "DIRENCANAKAN",
      teamId: session.user.teamId,
      createdById: session.user.id,
    },
  });

  revalidatePath("/dashboard/agenda");
  return { success: true, id: created.id };
}

export async function updateAgenda(
  id: string,
  formData: {
    judul: string;
    kategori: KategoriAgenda;
    tanggalMulai: string;
    tanggalSelesai?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    lokasi?: string | null;
    deskripsi?: string | null;
    pic?: string | null;
    status?: StatusAgenda;
  }
) {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Unauthorized");
  }

  await prisma.agendaTim.update({
    where: { id, teamId: session.user.teamId },
    data: {
      judul: formData.judul,
      kategori: formData.kategori,
      tanggalMulai: new Date(formData.tanggalMulai),
      tanggalSelesai: formData.tanggalSelesai ? new Date(formData.tanggalSelesai) : null,
      waktuMulai: formData.waktuMulai || null,
      waktuSelesai: formData.waktuSelesai || null,
      lokasi: formData.lokasi || null,
      deskripsi: formData.deskripsi || null,
      pic: formData.pic || null,
      status: formData.status || "DIRENCANAKAN",
    },
  });

  revalidatePath("/dashboard/agenda");
  return { success: true };
}

export async function deleteAgenda(id: string) {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Unauthorized");
  }

  await prisma.agendaTim.update({
    where: { id, teamId: session.user.teamId },
    data: { isDeleted: true },
  });

  revalidatePath("/dashboard/agenda");
  return { success: true };
}
