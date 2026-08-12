"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSpjMetaDokumen(spjId: string, metaDokumen: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const spj = await prisma.spj.findFirst({
    where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) }
  });

  if (!spj) throw new Error("SPJ tidak ditemukan.");

  // Merge existing with new
  let currentMeta = spj.metaDokumen as any;
  if (!currentMeta || typeof currentMeta !== 'object') {
    currentMeta = {};
  }

  const newMeta = {
    ...currentMeta,
    ...metaDokumen
  };

  const updated = await prisma.spj.update({
    where: { id: spjId },
    data: { metaDokumen: newMeta }
  });

  revalidatePath(`/dashboard/spj/${spjId}`);
  revalidatePath(`/dashboard/spj`);

  return updated.metaDokumen;
}
