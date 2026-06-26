import { auth } from "@/lib/auth";
import {
  FileText,
  TrendingDown,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = {
  title: "Dashboard - SIPADIN",
};

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="px-8 py-6 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total SPJ"
          value="0"
          description="Bulan ini"
          icon={<ClipboardList className="w-4 h-4 text-slate-500" />}
        />
        <StatCard
          title="SPJ Perjadin"
          value="0"
          description="Perjalanan Dinas"
          icon={<FileText className="w-4 h-4 text-slate-500" />}
        />
        <StatCard
          title="Total Pengeluaran"
          value="Rp 0"
          description="Semua kategori"
          icon={<TrendingDown className="w-4 h-4 text-slate-500" />}
        />
        <StatCard
          title="Sisa Saldo"
          value="Rp 0"
          description="Sub-kegiatan aktif"
          icon={<Wallet className="w-4 h-4 text-slate-500" />}
        />
      </div>

      {/* Welcome card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">🚀 Sistem Siap Digunakan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 text-sm leading-relaxed">
            Selamat! SIPADIN v2 telah berhasil dikonfigurasi. Silakan mulai dengan membuat{" "}
            <strong className="text-slate-900 font-semibold">Tahun Anggaran</strong>, lalu tambahkan{" "}
            <strong className="text-slate-900 font-semibold">Kegiatan</strong> dan{" "}
            <strong className="text-slate-900 font-semibold">Sub-Kegiatan</strong> untuk mulai mencatat SPJ.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/tahun-anggaran">
              <Button size="sm" id="btn-buat-anggaran">
                + Buat Tahun Anggaran
              </Button>
            </Link>
            <Link href="/dashboard/pegawai">
              <Button size="sm" variant="outline" id="btn-tambah-pegawai">
                + Tambah Pegawai
              </Button>
            </Link>
          </div>
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
    <Card className="shadow-sm border-slate-200">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {icon}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
