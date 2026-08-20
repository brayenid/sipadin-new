import { getPegawaisPaginated, getPegawaiInternalStats } from "@/app/actions/pegawai";
import { auth } from "@/lib/auth";
import PegawaiInternalList from "./PegawaiInternalList";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Master Pegawai Internal - SIPADIN",
};

export default async function PegawaiInternalPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: "ALL" | "INTERNAL" | "EKSTERNAL";
    eselon?: string;
    sort?: "nama" | "golongan" | "jabatan" | "instansi";
    dir?: "asc" | "desc";
  }>;
}) {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const sp = await searchParams;

  const [data, stats] = await Promise.all([
    getPegawaisPaginated({
      page: Number(sp.page) || 1,
      limit: Number(sp.limit) || 50,
      search: sp.search,
      timInternal: sp.status || "ALL",
      eselon: sp.eselon,
      sort: sp.sort,
      direction: sp.dir,
    }),
    getPegawaiInternalStats(),
  ]);

  return (
    <div className="p-4 sm:p-8">
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
          <span className="font-medium text-slate-900">Master Pegawai Internal</span>
        </div>
        <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">
          Master Pegawai Internal
        </h1>
        <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
          Tentukan pegawai yang masuk ke Tim Internal agar pencarian personel, penandatangan, dan pembuatan SPJ & Tata Naskah Dinas menjadi lebih cepat dan fokus.
        </p>
      </div>

      <PegawaiInternalList
        initialData={data.items}
        pagination={data.pagination}
        stats={stats}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
