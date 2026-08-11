import { getAgendaAbsensiList, getPejabatWajibAbsen } from "@/app/actions/absensi";
import AgendaList from "./AgendaList";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Absensi Perangkat Daerah - SIPADIN",
};

export default async function AbsensiPage() {
  const [agendas, pejabatList] = await Promise.all([
    getAgendaAbsensiList(),
    getPejabatWajibAbsen(),
  ]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
          <Link
            href="/dashboard"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Absensi Perangkat Daerah</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Absensi Perangkat Daerah
            </h1>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
              Pencatatan dan rekapitulasi kehadiran resmi Pejabat Eselon II.b dan III.a pada kegiatan Pemerintah Daerah.
            </p>
          </div>
        </div>
      </div>

      <AgendaList
        initialData={agendas as any}
        totalPejabatTerdaftar={pejabatList.length}
      />
    </div>
  );
}
