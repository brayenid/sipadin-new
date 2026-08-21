import { getRekapKehadiranOpd } from "@/app/actions/absensi";
import RekapKehadiranView from "./RekapKehadiranView";
import Link from "next/link";
import { ChevronLeft, BarChart3 } from "lucide-react";

export const metadata = {
  title: "Rekapitulasi Kehadiran OPD - SIPADIN",
};

export default async function RekapAbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{
    tahun?: string;
    bulan?: string;
    startDate?: string;
    endDate?: string;
    kategori?: "ALL" | "RAPAT" | "APEL" | "RUTIN";
  }>;
}) {
  const resolvedParams = await searchParams;
  const currentYear = new Date().getFullYear().toString();
  const selectedYear = resolvedParams.tahun || currentYear;
  const selectedBulan = resolvedParams.bulan || "ALL";
  const selectedKategori = resolvedParams.kategori || "ALL";
  const customStartDate = resolvedParams.startDate || "";
  const customEndDate = resolvedParams.endDate || "";

  let startDate = `${selectedYear}-01-01`;
  let endDate = `${selectedYear}-12-31`;

  if (customStartDate && customEndDate) {
    startDate = customStartDate;
    endDate = customEndDate;
  } else if (selectedBulan && selectedBulan !== "ALL") {
    const monthNum = parseInt(selectedBulan, 10);
    const paddedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
    const lastDay = new Date(parseInt(selectedYear, 10), monthNum, 0).getDate();
    startDate = `${selectedYear}-${paddedMonth}-01`;
    endDate = `${selectedYear}-${paddedMonth}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;
  }

  const data = await getRekapKehadiranOpd({
    startDate,
    endDate,
    kategoriAgenda: selectedKategori,
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
          <Link
            href="/dashboard/presensi"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Presensi Digital
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Rekapitulasi Kehadiran</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Rekapitulasi Kehadiran Pegawai
            </h1>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
              Laporan akumulasi tingkat kehadiran Pegawai pada seluruh kegiatan.
            </p>
          </div>
        </div>
      </div>

      <RekapKehadiranView 
        initialData={data as any} 
        selectedYear={selectedYear}
        selectedBulan={selectedBulan}
        selectedKategori={selectedKategori}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
      />
    </div>
  );
}
