"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { SPJ_HIDDEN_KEY } from "@/lib/spj-visibility";

export async function setSpjHidden(spjId: string, hidden: boolean) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const spj = await prisma.spj.findFirst({
    where: { id: spjId, teamId: session.user.teamId },
    select: { metaDokumen: true },
  });
  if (!spj) throw new Error("SPJ tidak ditemukan.");

  const meta: any = spj.metaDokumen && typeof spj.metaDokumen === "object" ? spj.metaDokumen : {};
  await prisma.spj.update({
    where: { id: spjId },
    data: { metaDokumen: { ...meta, [SPJ_HIDDEN_KEY]: hidden } },
  });
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
