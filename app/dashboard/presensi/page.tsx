import { getAgendaAbsensiList, getPejabatWajibAbsen, getAllPegawaiForBinding } from "@/app/actions/absensi";
import AgendaList from "./AgendaList";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Presensi Perangkat Daerah - SIPADIN",
};

export default async function PresensiPage({
  searchParams,
}: {
  searchParams: Promise<{
    tahun?: string;
    bulan?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const selectedYear = resolvedParams.tahun || "";
  const selectedBulan = resolvedParams.bulan || "ALL";
  const customStartDate = resolvedParams.startDate || "";
  const customEndDate = resolvedParams.endDate || "";

  let startDate = "";
  let endDate = "";

  if (customStartDate && customEndDate) {
    startDate = customStartDate;
    endDate = customEndDate;
  } else if (selectedYear && selectedBulan && selectedBulan !== "ALL") {
    const monthNum = parseInt(selectedBulan, 10);
    const paddedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const lastDay = new Date(parseInt(selectedYear, 10), monthNum, 0).getDate();
    startDate = `${selectedYear}-${paddedMonth}-01`;
    endDate = `${selectedYear}-${paddedMonth}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;
  } else if (selectedYear) {
    startDate = `${selectedYear}-01-01`;
    endDate = `${selectedYear}-12-31`;
  }

  const [agendas, pejabatList, allPegawai] = await Promise.all([
    getAgendaAbsensiList({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    getPejabatWajibAbsen(),
    getAllPegawaiForBinding(),
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
          <span className="font-medium text-slate-900">Presensi Digital</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Presensi Digital Perangkat Daerah
            </h1>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
              Pencatatan dan rekapitulasi kehadiran resmi Pegawai pada seluruh kegiatan dinas.
            </p>
          </div>
        </div>
      </div>

      <AgendaList
        initialData={agendas as any}
        totalPejabatTerdaftar={pejabatList.length}
        allPegawai={allPegawai as any}
        selectedYear={selectedYear}
        selectedBulan={selectedBulan}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
      />
    </div>
  );
}
