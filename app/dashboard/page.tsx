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

export const metadata = {
  title: "Dashboard - SIPADIN",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  // Ambil data statistik dari database berdasarkan teamId
  const teamId = session.user.teamId;

  // 1. Cari Tahun Anggaran terbaru
  const latestTahun = await prisma.tahunAnggaran.findFirst({
    orderBy: { tahun: 'desc' },
  });
  
  const activeTahunAnggaranId = latestTahun?.id;
  const activeTahunString = latestTahun?.tahun || "Semua Tahun";

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  const spjWhereFilter = isSuperAdmin 
    ? (activeTahunAnggaranId ? { kodeRekening: { subKegiatan: { kegiatan: { tahunAnggaranId: activeTahunAnggaranId } } } } : {})
    : {
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

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ikhtisar Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pantau ringkasan anggaran dan progres penyelesaian Surat Pertanggungjawaban (SPJ).
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total SPJ"
          value={totalSpjCount.toString()}
          description={`TA ${activeTahunString}`}
          icon={<ClipboardList className="w-5 h-5 text-indigo-500" />}
        />
        <StatCard
          title="Total Pagu"
          value={`${formatCurrency(totalPagu.toString())}`}
          description={`TA ${activeTahunString}`}
          icon={<FileText className="w-5 h-5 text-indigo-500" />}
        />
        <StatCard
          title="Total Pengeluaran"
          value={`${formatCurrency(totalPengeluaran.toString())}`}
          description={`TA ${activeTahunString}`}
          icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
        />
        <StatCard
          title="Sisa Saldo"
          value={`${formatCurrency(totalSisaSaldo.toString())}`}
          description={`TA ${activeTahunString}`}
          icon={<Wallet className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {/* Recent SPJs */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>SPJ Terbaru</CardTitle>
          <CardDescription>Daftar Surat Pertanggungjawaban yang terakhir kali dibuat.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
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
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
              <Link href="/dashboard/spj">
                <Button variant="outline" size="sm" className="text-slate-500">Lihat Semua SPJ</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
