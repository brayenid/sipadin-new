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
    select: {
      id: true,
      nip: true,
      nama: true,
      pangkat: true,
      golongan: true,
      jabatan: true,
      instansi: true,
      eselon: true,
    }
  });
}

export async function createPegawai(data: {
  nip?: string;
  nama: string;
  pangkat?: string;
  golongan?: string;
  jabatan: string;
  instansi?: string;
  eselon?: string;
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

  const usedPegawai = await prisma.spjRosterItem.findFirst({
    where: { pegawaiId: id }
  });

  if (usedPegawai) {
    throw new Error("Pegawai ini tidak bisa dihapus karena sudah dipakai dalam pembuatan SPJ. Hapus SPJ terkait terlebih dahulu.");
  }

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
    eselon?: string | null;
  }[],
  deleteIds: string[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    // Delete
    if (deleteIds.length > 0) {
      const usedPegawai = await tx.spjRosterItem.findFirst({
        where: { pegawaiId: { in: deleteIds } }
      });

      if (usedPegawai) {
        throw new Error("Beberapa pegawai tidak bisa dihapus karena sudah dipakai dalam pembuatan SPJ. Hapus SPJ terkait terlebih dahulu.");
      }

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
            eselon: item.eselon || null,
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
            eselon: item.eselon || null,
            teamId: session.user.teamId,
          },
        });
      }
    }
  }, {
    maxWait: 5000,
    timeout: 30000
  });

  revalidatePath("/dashboard/pegawai");
}

export async function importPegawaiExcel(
  data: {
    nip?: string | null;
    nama: string;
    pangkat?: string | null;
    golongan?: string | null;
    jabatan: string;
    instansi?: string | null;
    eselon?: string | null;
  }[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const validData = data.filter((item) => item.nama?.trim() && item.jabatan?.trim());
  const skipped = data.length - validData.length;

  if (validData.length === 0) {
    return { inserted: 0, updated: 0, skipped };
  }

  // 1. Kumpulkan semua NIP unik yang ada di batch ini untuk single bulk query
  const nips = Array.from(
    new Set(validData.map((d) => d.nip?.trim()).filter((nip): nip is string => Boolean(nip)))
  );

  // 2. Ambil data pegawai eksisting berdasarkan NIP dalam 1 query (High Performance)
  const existingPegawais = nips.length > 0
    ? await prisma.pegawai.findMany({
        where: {
          teamId: session.user.teamId,
          nip: { in: nips },
        },
        select: { id: true, nip: true },
      })
    : [];

  const existingMap = new Map<string, string>();
  existingPegawais.forEach((p) => {
    if (p.nip) existingMap.set(p.nip, p.id);
  });

  const toInsert: any[] = [];
  const toUpdate: { id: string; data: any }[] = [];
  const seenNipInBatch = new Set<string>();

  for (const item of validData) {
    const nipTrimmed = item.nip?.trim() || null;
    const itemData = {
      nama: item.nama.trim(),
      pangkat: item.pangkat?.trim() || null,
      golongan: item.golongan?.trim() || null,
      jabatan: item.jabatan.trim(),
      instansi: item.instansi?.trim() || "Sekretariat Daerah",
      eselon: item.eselon?.trim() || null,
    };

    if (nipTrimmed && existingMap.has(nipTrimmed)) {
      toUpdate.push({
        id: existingMap.get(nipTrimmed)!,
        data: itemData,
      });
    } else if (nipTrimmed && seenNipInBatch.has(nipTrimmed)) {
      // Jika NIP duplikat di dalam file excel yang sama, masukkan ke update
      continue;
    } else {
      if (nipTrimmed) seenNipInBatch.add(nipTrimmed);
      toInsert.push({
        nip: nipTrimmed,
        ...itemData,
        teamId: session.user.teamId,
      });
    }
  }

  // 3. Eksekusi insert bulk dan update dalam transaksi
  await prisma.$transaction(async (tx) => {
    if (toInsert.length > 0) {
      await tx.pegawai.createMany({
        data: toInsert,
      });
    }
    for (const up of toUpdate) {
      await tx.pegawai.update({
        where: { id: up.id },
        data: up.data,
      });
    }
  }, {
    maxWait: 5000,
    timeout: 30000,
  });

  revalidatePath("/dashboard/pegawai");
  return { inserted: toInsert.length, updated: toUpdate.length, skipped };
}
