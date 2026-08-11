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
  searchParams: Promise<{ tahun?: string }>;
}) {
  const resolvedParams = await searchParams;
  const currentYear = new Date().getFullYear().toString();
  const selectedYear = resolvedParams.tahun || currentYear;

  // Query tanggal 1 Januari - 31 Desember dari tahun terpilih
  const startDate = `${selectedYear}-01-01`;
  const endDate = `${selectedYear}-12-31`;

  const data = await getRekapKehadiranOpd({
    startDate,
    endDate,
  });

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
          <span className="font-medium text-slate-900">Rekapitulasi Kehadiran</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Rekapitulasi Kehadiran Perangkat Daerah
            </h1>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
              Laporan akumulasi kedisiplinan dan tingkat kehadiran Pejabat Eselon II.b dan III.a pada seluruh kegiatan Pemerintah Daerah.
            </p>
          </div>
        </div>
      </div>

      <RekapKehadiranView 
        initialData={data as any} 
        selectedYear={selectedYear}
      />
    </div>
  );
}
