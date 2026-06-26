"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPegawais() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.pegawai.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { nama: "asc" },
  });
}

export async function createPegawai(data: {
  nip?: string;
  nama: string;
  pangkat?: string;
  golongan?: string;
  jabatan: string;
  instansi?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const res = await prisma.pegawai.create({
    data: {
      ...data,
      teamId: session.user.teamId,
    },
  });

  revalidatePath("/dashboard/pegawai");
  return res;
}

export async function deletePegawai(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.pegawai.delete({
    where: {
      id,
      teamId: session.user.teamId, // Hanya bisa menghapus milik sendiri
    },
  });

  revalidatePath("/dashboard/pegawai");
}

export async function bulkUpsertPegawai(
  upsertData: {
    id: string;
    nip?: string | null;
    nama: string;
    pangkat?: string | null;
    golongan?: string | null;
    jabatan: string;
    instansi?: string | null;
  }[],
  deleteIds: string[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    // Delete
    if (deleteIds.length > 0) {
      await tx.pegawai.deleteMany({
        where: {
          id: { in: deleteIds },
          teamId: session.user.teamId,
        },
      });
    }

    // Upsert (Update or Insert)
    for (const item of upsertData) {
      if (!item.nama.trim() || !item.jabatan.trim()) continue; // Skip invalid row

      if (item.id && !item.id.startsWith("temp-")) {
        // Update existing
        await tx.pegawai.updateMany({
          where: { id: item.id, teamId: session.user.teamId },
          data: {
            nip: item.nip || null,
            nama: item.nama,
            pangkat: item.pangkat || null,
            golongan: item.golongan || null,
            jabatan: item.jabatan,
            instansi: item.instansi || "Sekretariat Daerah",
          },
        });
      } else {
        // Insert new
        await tx.pegawai.create({
          data: {
            nip: item.nip || null,
            nama: item.nama,
            pangkat: item.pangkat || null,
            golongan: item.golongan || null,
            jabatan: item.jabatan,
            instansi: item.instansi || "Sekretariat Daerah",
            teamId: session.user.teamId,
          },
        });
      }
    }
  });

  revalidatePath("/dashboard/pegawai");
}

