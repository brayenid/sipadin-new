import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import RecycleBinClient from "./RecycleBinClient";

export const metadata = {
  title: "Recycle Bin - SIPADIN",
};

export default async function RecycleBinPage() {
  const session = await auth();
  
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const teamId = session.user.teamId;

  const [deletedSpj, deletedNaskah] = await Promise.all([
    prisma.spj.findMany({
      where: { teamId, isDeleted: true },
      include: {
        kodeRekening: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.naskahDinas.findMany({
      where: { teamId, isDeleted: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return <RecycleBinClient deletedSpj={deletedSpj} deletedNaskah={deletedNaskah} />;
}
