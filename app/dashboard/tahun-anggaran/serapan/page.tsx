import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTahunAnggaranDetail } from "@/app/actions/anggaran";
import SerapanDetailView from "./SerapanDetailView";
import YearSelector from "./YearSelector";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Rincian Serapan Anggaran - SIPADIN",
};

export default async function SerapanAnggaranPage({
  searchParams,
}: {
  searchParams: { tahun?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Ambil daftar tahun anggaran
  const recentTahunRows = await prisma.tahunAnggaran.findMany({
    orderBy: { tahun: 'desc' },
    select: { tahun: true }
  });
  
  const tahunList = recentTahunRows.map(r => r.tahun);
  
  if (tahunList.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        Belum ada data tahun anggaran.
      </div>
    );
  }

  const selectedTahun = searchParams.tahun && tahunList.includes(searchParams.tahun) 
    ? searchParams.tahun 
    : tahunList[0];

  let initialSerapanData = null;
  try {
    initialSerapanData = await getTahunAnggaranDetail(selectedTahun);
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-8 lg:pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
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
            <span className="font-medium text-slate-900">Rincian Serapan Anggaran</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Rincian Serapan Anggaran</h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
            Pantau rincian pagu, realisasi, dan sisa saldo anggaran Anda di sini.
          </p>
        </div>
        <YearSelector tahunList={tahunList} currentTahun={selectedTahun} />
      </div>

      {/* Main Content */}
      <SerapanDetailView 
        tahunList={tahunList} 
        initialData={initialSerapanData} 
        initialTahun={selectedTahun}
      />
    </div>
  );
}
