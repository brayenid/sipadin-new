import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MigrasiClient from "./MigrasiClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Migrasi Data V1 - SIPADIN",
};

export default async function MigrasiPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  // 1. Ambil data users V2 untuk pemetaan creator
  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" }
  });

  // 2. Ambil data pegawai V2 untuk pencocokan NIP ganda
  const pegawais = await prisma.pegawai.findMany({
    select: { id: true, nama: true, nip: true, jabatan: true },
    orderBy: { nama: "asc" }
  });

  // 3. Ambil data team V2 untuk target tenant
  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="p-4 sm:p-8 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
        <Link
          href="/dashboard"
          className="hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-900">Migrasi Data</span>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Migrasi Data SPJ V1</h1>
        <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
          Unggah berkas JSON hasil ekspor SPJ Generator versi 1 dan lakukan resolusi konflik data sebelum dimasukkan ke SIPADIN versi 2.
        </p>
      </div>

      <MigrasiClient
        users={users}
        pegawais={pegawais}
        teams={teams}
        currentTeamId={session.user.teamId}
      />
    </div>
  );
}
