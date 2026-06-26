"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getVendors() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.vendorPihakKetiga.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { namaVendor: "asc" },
  });
}

export async function createVendor(data: {
  namaVendor: string;
  namaPemilik?: string;
  alamat?: string;
  npwp?: string;
  rekeningBank?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const res = await prisma.vendorPihakKetiga.create({
    data: {
      ...data,
      teamId: session.user.teamId,
    },
  });

  revalidatePath("/dashboard/vendor");
  return res;
}

export async function deleteVendor(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.vendorPihakKetiga.delete({
    where: {
      id,
      teamId: session.user.teamId, // Hanya bisa menghapus milik sendiri
    },
  });

  revalidatePath("/dashboard/vendor");
}

export async function bulkUpsertVendor(
  upsertData: {
    id: string;
    namaVendor: string;
    namaPemilik?: string | null;
    alamat?: string | null;
    npwp?: string | null;
    rekeningBank?: string | null;
  }[],
  deleteIds: string[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    // Delete
    if (deleteIds.length > 0) {
      await tx.vendorPihakKetiga.deleteMany({
        where: {
          id: { in: deleteIds },
          teamId: session.user.teamId,
        },
      });
    }

    // Upsert (Update or Insert)
    for (const item of upsertData) {
      if (!item.namaVendor.trim()) continue; // Skip invalid row

      if (item.id && !item.id.startsWith("temp-")) {
        // Update existing
        await tx.vendorPihakKetiga.updateMany({
          where: { id: item.id, teamId: session.user.teamId },
          data: {
            namaVendor: item.namaVendor,
            namaPemilik: item.namaPemilik || null,
            alamat: item.alamat || null,
            npwp: item.npwp || null,
            rekeningBank: item.rekeningBank || null,
          },
        });
      } else {
        // Insert new
        await tx.vendorPihakKetiga.create({
          data: {
            namaVendor: item.namaVendor,
            namaPemilik: item.namaPemilik || null,
            alamat: item.alamat || null,
            npwp: item.npwp || null,
            rekeningBank: item.rekeningBank || null,
            teamId: session.user.teamId,
          },
        });
      }
    }
  });

  revalidatePath("/dashboard/vendor");
}

