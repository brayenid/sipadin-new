import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllPegawaiForBinding } from "@/app/actions/absensi";
import AbsensiWizard from "./AbsensiWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Buat Agenda Absensi Baru - SIPADIN",
};

export default async function BuatAgendaAbsensiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allPegawai = await getAllPegawaiForBinding();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
          <Link
            href="/dashboard/absensi"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Absensi Perangkat Daerah
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Buat Agenda Baru</span>
        </div>
        <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">
          Buat Agenda Absensi Baru
        </h1>
        <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
          Lengkapi detail kegiatan, tentukan daftar pegawai yang diundang, dan terbitkan tautan presensi online.
        </p>
      </div>

      {/* Interactive Wizard Component */}
      <AbsensiWizard allPegawai={allPegawai as any} />
    </div>
  );
}
