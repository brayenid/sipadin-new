import { auth } from "@/lib/auth";
import {
  FileText,
  TrendingDown,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import SerapanAnggaranCard from "./SerapanAnggaranCard";
import { getTahunAnggaranDetail } from "@/app/actions/anggaran";

export const metadata = {
  title: "Dashboard - SIPADIN",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  // Ambil data statistik dari database berdasarkan teamId
  const teamId = session.user.teamId;

  // 1. Cari Tahun Anggaran terbaru
  const recentTahunRows = await prisma.tahunAnggaran.findMany({
    orderBy: { tahun: 'desc' },
    take: 4,
    select: { tahun: true }
  });
  const recentTahunList = recentTahunRows.map(r => r.tahun);
  
  const activeTahunAnggaranId = recentTahunRows.length > 0 ? (await prisma.tahunAnggaran.findFirst({ where: { tahun: recentTahunList[0] } }))?.id : undefined;
  const activeTahunString = recentTahunList[0] || "Semua Tahun";

  let initialSerapanData = null;
  if (recentTahunList.length > 0) {
    try {
      initialSerapanData = await getTahunAnggaranDetail(recentTahunList[0]);
    } catch (e) {
      console.error(e);
    }
  }

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  const spjWhereFilter = isSuperAdmin 
    ? {
        isDeleted: false,
        ...(activeTahunAnggaranId ? { kodeRekening: { subKegiatan: { kegiatan: { tahunAnggaranId: activeTahunAnggaranId } } } } : {})
      }
    : {
        isDeleted: false,
        createdById: session.user.id,
        ...(activeTahunAnggaranId ? { kodeRekening: { subKegiatan: { kegiatan: { tahunAnggaranId: activeTahunAnggaranId } } } } : {})
      };

  // 2. Total SPJ di tahun berjalan
  const totalSpjCount = await prisma.spj.count({
    where: spjWhereFilter,
  });

  // 3. SPJ Perjadin di tahun berjalan
  const spjPerjadinCount = await prisma.spj.count({
    where: { ...spjWhereFilter, jenisSpj: "PERJADIN" },
  });

  // 4. Total Pengeluaran di tahun berjalan
  const spjAggregation = await prisma.spj.aggregate({
    where: spjWhereFilter,
    _sum: { totalPengeluaran: true },
  });
  const totalPengeluaran = spjAggregation._sum.totalPengeluaran || BigInt(0);

  // 5. Sisa Saldo di tahun berjalan
  const rekeningFilter = {
    ...(activeTahunAnggaranId ? { subKegiatan: { kegiatan: { tahunAnggaranId: activeTahunAnggaranId } } } : {}),
    ...(!isSuperAdmin ? { subKegiatan: { users: { some: { id: session.user.id } } } } : {})
  };

  const rekeningAggregation = await prisma.kodeRekening.aggregate({
    where: rekeningFilter,
    _sum: {
      sisaSaldo: true,
      saldoAwal: true
    }
  });
  const totalSisaSaldo = rekeningAggregation._sum.sisaSaldo || BigInt(0);
  const totalPagu = rekeningAggregation._sum.saldoAwal || BigInt(0);

  // 6. Recent SPJs
  const recentSpjs = await prisma.spj.findMany({
    where: spjWhereFilter,
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      roster: true,
      kodeRekening: {
        include: {
          subKegiatan: {
            include: {
              kegiatan: true
            }
          }
        }
      }
    }
  });

  // 7. SPJ per Jenis SPJ di tahun berjalan
  const allSpjThisYear = await prisma.spj.findMany({
    where: spjWhereFilter,
    select: { jenisSpj: true, totalPengeluaran: true }
  });
  
  const spjPerJenisMap: Record<string, { count: number, total: bigint }> = {
    PERJADIN: { count: 0, total: BigInt(0) },
    MAKAN_MINUM: { count: 0, total: BigInt(0) },
    HONORARIUM: { count: 0, total: BigInt(0) },
    OPERASIONAL: { count: 0, total: BigInt(0) },
  };
  
  allSpjThisYear.forEach(spj => {
    if (spjPerJenisMap[spj.jenisSpj]) {
      spjPerJenisMap[spj.jenisSpj].count += 1;
      spjPerJenisMap[spj.jenisSpj].total += spj.totalPengeluaran;
    }
  });

  const spjPerJenis = Object.entries(spjPerJenisMap)
    .filter(([_, data]) => data.count > 0 || data.total > BigInt(0))
    .map(([jenis, data]) => ({ jenis, ...data }))
    .sort((a, b) => Number(b.total - a.total));

  const maxTotalSpjJenis = spjPerJenis.reduce((max, curr) => curr.total > max ? curr.total : max, BigInt(0));

  // 8. Naskah Dinas summary
  const naskahFilter = isSuperAdmin ? { isDeleted: false } : { isDeleted: false, createdById: session.user.id };
  const naskahDinasGrouped = await prisma.naskahDinas.groupBy({
    by: ['jenisNaskah'],
    where: naskahFilter,
    _count: { _all: true }
  });
  
  const totalNaskah = naskahDinasGrouped.reduce((acc, curr) => acc + curr._count._all, 0);
  
  const formatEnumName = (jenis: string) => {
    return jenis.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  // 9. Rekap Perjalanan Dinas (Leaderboard Pegawai)
  const rosterPerjadin = await prisma.spjRosterItem.groupBy({
    by: ['pegawaiId'],
    where: {
      spj: {
        jenisSpj: 'PERJADIN',
        ...spjWhereFilter
      }
    },
    _count: {
      spjId: true
    },
    orderBy: {
      _count: { spjId: 'desc' }
    },
    take: 3
  });

  const pegawaiIds = rosterPerjadin.map((r) => r.pegawaiId);
  const pegawaiList = await prisma.pegawai.findMany({
    where: { id: { in: pegawaiIds } },
    select: { id: true, nama: true }
  });

  const rekapPerjadin = rosterPerjadin.map((r) => ({
    pegawai: pegawaiList.find((p) => p.id === r.pegawaiId),
    count: r._count.spjId
  }));

  return (
    <div className="p-4 sm:p-8 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Ikhtisar Dashboard</h1>
        <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
          Pantau ringkasan anggaran dan progres penyelesaian Surat Pertanggungjawaban (SPJ).
        </p>
      </div>

      {/* Stat cards */}
      <div className="flex overflow-x-auto flex-nowrap gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <StatCard
          title="Total SPJ"
          value={totalSpjCount.toString()}
          description={`TA ${activeTahunString}`}
          icon={<ClipboardList className="w-4 h-4 text-indigo-500" />}
          className="min-w-[65vw] max-w-[280px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-center"
        />
        <StatCard
          title="Total Pagu"
          value={`${formatCurrency(totalPagu.toString())}`}
          description={`TA ${activeTahunString}`}
          icon={<FileText className="w-4 h-4 text-indigo-500" />}
          className="min-w-[65vw] max-w-[280px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-center"
        />
        <StatCard
          title="Total Pengeluaran"
          value={`${formatCurrency(totalPengeluaran.toString())}`}
          description={`TA ${activeTahunString}`}
          icon={<TrendingDown className="w-4 h-4 text-rose-500" />}
          className="min-w-[65vw] max-w-[280px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-center"
        />
        <StatCard
          title="Sisa Saldo"
          value={`${formatCurrency(totalSisaSaldo.toString())}`}
          description={`TA ${activeTahunString}`}
          icon={<Wallet className="w-4 h-4 text-emerald-500" />}
          className="min-w-[65vw] max-w-[280px] sm:min-w-0 sm:max-w-none flex-shrink-0 snap-center"
        />
      </div>

      {/* Baris Kedua: SPJ Per Jenis, Naskah Dinas & Rekap Perjadin */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        
        {/* Grafik SPJ Per Jenis (2 Kolom) */}
        <Card className="border-slate-200/60 lg:col-span-2 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden py-0 gap-0">
          <CardHeader className="pt-3 pb-3 sm:pt-4 sm:pb-4 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Distribusi Pengeluaran</CardTitle>
            <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal">Berdasarkan jenis SPJ sepanjang TA {activeTahunString}.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-3 sm:pt-5 sm:pb-4">
            <div className="space-y-2">
              {spjPerJenis.length === 0 && <p className="text-xs text-slate-400">Belum ada data pengeluaran.</p>}
              {spjPerJenis.map((item, i) => {
                const percentage = maxTotalSpjJenis > BigInt(0) 
                  ? Number((item.total * BigInt(100)) / maxTotalSpjJenis) 
                  : 0;
                
                return (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <div className="w-24 text-slate-600 font-medium truncate" title={formatEnumName(item.jenis)}>
                      {formatEnumName(item.jenis)}
                    </div>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-slate-700 font-semibold whitespace-nowrap">
                      {formatCurrency(item.total.toString())}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Naskah Dinas Summary (1 Kolom) */}
        <Card className="border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden py-0 gap-0">
          <CardHeader className="pt-3 pb-3 sm:pt-4 sm:pb-4 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Naskah Dinas</CardTitle>
            <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal">Dokumen yang telah dibuat.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-4 pb-3 sm:pt-5 sm:pb-4">
            <div className="mb-4">
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{totalNaskah}</p>
              <p className="text-xs font-medium text-slate-500">Total Keseluruhan</p>
            </div>
            
            <div className="space-y-1.5 flex-1">
              {naskahDinasGrouped.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada naskah dinas.</p>
              ) : (
                naskahDinasGrouped.map((group, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-600 truncate" title={formatEnumName(group.jenisNaskah)}>
                      {formatEnumName(group.jenisNaskah)}
                    </span>
                    <Badge variant="secondary" className="bg-white text-xs font-bold text-slate-700 border-slate-200 ml-2 px-1.5 py-0">
                      {group._count._all}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100">
               <Link href="/dashboard/naskah-dinas">
                <Button variant="outline" size="sm" className="w-full text-slate-600 h-8 text-xs">
                  Kelola Naskah Dinas
                </Button>
               </Link>
            </div>
          </CardContent>
        </Card>

        {/* Rekap Perjadin Summary (1 Kolom) */}
        <Card className="border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden py-0 gap-0">
          <CardHeader className="pt-3 pb-3 sm:pt-4 sm:pb-4 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Rekap Perjadin</CardTitle>
            <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal">Pegawai paling sering bertugas.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pt-4 pb-3 sm:pt-5 sm:pb-4">
            <div className="space-y-1.5 flex-1">
              {rekapPerjadin.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada rekap perjalanan dinas.</p>
              ) : (
                rekapPerjadin.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center px-2 py-1.5 rounded bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-600 truncate" title={item.pegawai?.nama}>
                      {item.pegawai?.nama || 'Unknown'}
                    </span>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-xs font-bold border-indigo-100 ml-2 px-1.5 py-0 shrink-0">
                      {item.count}x
                    </Badge>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100">
               <Link href="/dashboard/spj?jenis=PERJADIN">
                <Button variant="outline" size="sm" className="w-full text-slate-600 h-8 text-xs">
                  Lihat Semua
                </Button>
               </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Baris Ketiga: Serapan Anggaran & SPJ Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Serapan Anggaran */}
        <SerapanAnggaranCard 
          tahunList={recentTahunList}
          initialData={initialSerapanData}
        />

        {/* Recent SPJs */}
        <Card className="border-slate-200/60 lg:col-span-2 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden py-0 gap-0">
          <CardHeader className="pt-4 pb-4 sm:pt-5 sm:pb-5 bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">SPJ Terbaru</CardTitle>
            <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal">Daftar Surat Pertanggungjawaban yang terakhir kali dibuat.</CardDescription>
          </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-t border-slate-200/60">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Perihal</TableHead>
                  <TableHead className="text-right">Total Pengeluaran</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSpjs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      Belum ada SPJ yang dibuat.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSpjs.map((spj) => (
                    <TableRow key={spj.id}>
                      <TableCell className="font-medium">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "numeric", month: "long", year: "numeric"
                        }).format(spj.tanggalSpj)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          spj.jenisSpj === 'PERJADIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' :
                          spj.jenisSpj === 'MAKAN_MINUM' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
                          'bg-purple-50 text-purple-700 border-purple-200/60'
                        }>
                          {spj.jenisSpj === 'PERJADIN' ? 'Perjalanan Dinas' : 
                           spj.jenisSpj === 'MAKAN_MINUM' ? 'Makan Minum' : 'Honorarium'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={spj.perihal || "-"}>
                        {spj.perihal || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(spj.totalPengeluaran))}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/spj/${spj.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {recentSpjs.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex justify-center">
              <Link href="/dashboard/spj">
                <Button variant="outline" size="sm" className="text-slate-500">Lihat Semua SPJ</Button>
              </Link>
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  className,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] py-0 ${className || ""}`}>
      <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm font-medium text-slate-500">{title}</p>
          <div className="p-1.5 sm:p-2 bg-slate-50 rounded-lg border border-slate-100">
            {icon}
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <p className="text-xl font-extrabold sm:text-2xl sm:font-bold text-slate-900 tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
