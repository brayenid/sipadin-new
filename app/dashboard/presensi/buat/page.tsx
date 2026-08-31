import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllPegawaiForBinding } from "@/app/actions/absensi";
import AbsensiWizard from "./AbsensiWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Buat Agenda Presensi Baru - SIPADIN",
};

export default async function BuatAgendaPresensiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allPegawai = await getAllPegawaiForBinding();

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 pb-12">
      {/* Header & Breadcrumb */}
      <div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3">
          <Link
            href="/dashboard/presensi"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Presensi Digital
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Buat Agenda Baru</span>
        </div>
        <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
          Buat Agenda Presensi Baru
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          Lengkapi detail kegiatan, tentukan daftar pegawai yang diundang, dan terbitkan tautan presensi online.
        </p>
      </div>

      {/* Interactive Wizard Component */}
      <AbsensiWizard allPegawai={allPegawai as any} />
    </div>
  );
}
