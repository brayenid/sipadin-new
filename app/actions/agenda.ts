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

export async function importAgendasFromExcel(
  items: Array<{
    judul: string;
    kategori?: string;
    tanggalMulai: string;
    tanggalSelesai?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    lokasi?: string | null;
    deskripsi?: string | null;
    pic?: string | null;
    status?: string;
  }>
) {
  const session = await auth();
  if (!session?.user?.teamId || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const validCategories: Record<string, KategoriAgenda> = {
    RAPAT: "RAPAT",
    PERJALANAN_DINAS: "PERJALANAN_DINAS",
    "PERJALANAN DINAS": "PERJALANAN_DINAS",
    PERJADIN: "PERJALANAN_DINAS",
    SOSIALISASI: "SOSIALISASI",
    "SOSIALISASI / BIMTEK": "SOSIALISASI",
    BIMTEK: "SOSIALISASI",
    MONITORING_EVALUASI: "MONITORING_EVALUASI",
    "MONITORING EVALUASI": "MONITORING_EVALUASI",
    MONEV: "MONITORING_EVALUASI",
    ACARA_INTERNAL: "ACARA_INTERNAL",
    "ACARA INTERNAL": "ACARA_INTERNAL",
    PENGINGAT: "PENGINGAT",
    LAINNYA: "LAINNYA",
  };

  const validStatuses: Record<string, StatusAgenda> = {
    DIRENCANAKAN: "DIRENCANAKAN",
    BERLANGSUNG: "BERLANGSUNG",
    "SEDANG BERLANGSUNG": "BERLANGSUNG",
    SELESAI: "SELESAI",
    DIBATALKAN: "DIBATALKAN",
  };

  const dataToInsert = items
    .filter((item) => item.judul && item.tanggalMulai)
    .map((item) => {
      const katKey = (item.kategori || "PENGINGAT").toUpperCase().trim();
      const kategori: KategoriAgenda = validCategories[katKey] || "PENGINGAT";

      const stKey = (item.status || "DIRENCANAKAN").toUpperCase().trim();
      const status: StatusAgenda = validStatuses[stKey] || "DIRENCANAKAN";

      return {
        judul: item.judul.trim(),
        kategori,
        tanggalMulai: new Date(item.tanggalMulai),
        tanggalSelesai: item.tanggalSelesai ? new Date(item.tanggalSelesai) : null,
        waktuMulai: item.waktuMulai || null,
        waktuSelesai: item.waktuSelesai || null,
        lokasi: item.lokasi || null,
        deskripsi: item.deskripsi || null,
        pic: item.pic || null,
        status,
        teamId: session.user.teamId,
        createdById: session.user.id,
      };
    });

  if (dataToInsert.length === 0) {
    return { success: false, count: 0, message: "Tidak ada baris data valid yang dapat diimpor." };
  }

  // Batch insert
  await prisma.agendaTim.createMany({
    data: dataToInsert,
  });

  revalidatePath("/dashboard/agenda");
  return { success: true, count: dataToInsert.length };
}
