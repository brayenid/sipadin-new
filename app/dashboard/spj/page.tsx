import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Daftar SPJ - SIPADIN",
};

export default async function SpjListPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const spjList = await prisma.spj.findMany({
    where: { teamId: session.user.teamId },
    include: {
      subKegiatan: true,
      perjadinDetail: true,
      roster: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));
  };

  const getJenisBadge = (jenis: string) => {
    switch (jenis) {
      case "PERJADIN": return <Badge className="bg-blue-500">Perjalanan Dinas</Badge>;
      case "MAKAN_MINUM": return <Badge className="bg-orange-500">Makan Minum</Badge>;
      case "HONORARIUM": return <Badge className="bg-purple-500">Honorarium</Badge>;
      default: return <Badge className="bg-slate-500">{jenis}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Daftar SPJ</h2>
          <p className="text-slate-500 mt-1">Kelola dan pantau seluruh Surat Pertanggungjawaban.</p>
        </div>
        <Link href="/dashboard/spj/buat">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Buat SPJ Baru
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
          <CardDescription>Semua kuitansi yang telah direkam ke dalam sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>No. BKU</TableHead>
                  <TableHead>Sumber Dana (Sub-Kegiatan)</TableHead>
                  <TableHead className="text-right">Total Biaya</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spjList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      Belum ada SPJ yang dibuat.
                    </TableCell>
                  </TableRow>
                ) : (
                  spjList.map((spj) => (
                    <TableRow key={spj.id}>
                      <TableCell className="font-medium">
                        {new Intl.DateTimeFormat("id-ID", {
                          day: "2-digit", month: "short", year: "numeric"
                        }).format(spj.tanggalSpj)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div>{getJenisBadge(spj.jenisSpj)}</div>
                          {spj.jenisSpj === "PERJADIN" && spj.perjadinDetail && (
                            <span className="text-xs text-slate-500">
                              Tujuan: {spj.perjadinDetail.tempatTujuan}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {spj.nomorBku ? (
                          <span className="font-mono text-xs">{spj.nomorBku}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Belum ada</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{spj.subKegiatan.judulSub}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatRupiah(spj.totalPengeluaran)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/dashboard/spj/${spj.id}`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                            <Eye className="w-4 h-4 mr-2" />
                            Detail
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
