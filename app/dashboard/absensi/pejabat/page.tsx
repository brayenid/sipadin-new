import { getAllPegawaiForBinding } from "@/app/actions/absensi";
import PejabatBindingList from "./PejabatBindingList";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Kelola Binding Pegawai OPD - SIPADIN",
};

export default async function PejabatBindingPage() {
  const allPegawai = await getAllPegawaiForBinding();

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
          <Link
            href="/dashboard/absensi"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Absensi OPD
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Pengaturan Wajib Absen Default</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">
              Pengaturan Wajib Absen Default
            </h1>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
              Tetapkan pegawai mana saja yang secara default (otomatis) harus masuk ke setiap daftar absensi agenda baru yang dibuat.
            </p>
          </div>
        </div>
      </div>

      <PejabatBindingList allPegawai={allPegawai} />
    </div>
  );
}
