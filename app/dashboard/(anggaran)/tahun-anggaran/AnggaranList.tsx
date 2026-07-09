"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createTahunAnggaran, deleteTahunAnggaran } from "@/app/actions/anggaran";
import { Loader2, Plus, Trash2, ChevronLeft, Search, Eye, Settings2, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import MobileActionBar from "@/components/dashboard/MobileActionBar";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

type TahunAnggaranSummary = {
  id: string;
  tahun: string;
  totalPagu: bigint;
  totalSisa: bigint;
};

type AnggaranListProps = {
  initialData: TahunAnggaranSummary[];
  totalData: number;
  totalPages: number;
  currentPage: number;
  searchQuery: string;
  isSuperAdmin?: boolean;
};

export default function AnggaranList({ 
  initialData, 
  totalData, 
  totalPages, 
  currentPage, 
  searchQuery,
  isSuperAdmin = false
}: AnggaranListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localSearch, setLocalSearch] = useState(searchQuery || "");
  const [loading, setLoading] = useState(false);
  const [isTahunOpen, setIsTahunOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreateTahun = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const tahun = formData.get("tahun") as string;

    try {
      await createTahunAnggaran(tahun);
      setIsTahunOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat Tahun Anggaran");
    }
    setLoading(false);
  };

  const handleDeleteTahun = (id: string) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteTahunAnggaran(deleteId);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus Tahun Anggaran");
    }
    setLoading(false);
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const createPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <>
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2">Yakin ingin menghapus Tahun Anggaran ini beserta isinya?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteId(null);
              }}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Tahun Anggaran dialog */}
      <Dialog open={isTahunOpen} onOpenChange={setIsTahunOpen}>
        <DialogContent>
          <form onSubmit={handleCreateTahun} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Tahun Anggaran</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Tahun (Misal: 2026)</Label>
              <Input name="tahun" required placeholder="2026" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 pb-24 lg:pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
              <span className="font-medium text-slate-900">Tahun Anggaran</span>
            </div>
            <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Manajemen Anggaran</h2>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
              Kelola Tahun Anggaran dan alokasi pagu dana.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/tahun-anggaran/serapan?tahun=${new Date().getFullYear()}`}>
              <Button variant="outline" className="hidden lg:flex border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <PieChart className="w-4 h-4 mr-2" />
                Serapan Anggaran
              </Button>
            </Link>
            {isSuperAdmin && (
              <Button className="hidden lg:flex" onClick={() => setIsTahunOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Buat Tahun Anggaran
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar - styled like SPJFilters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 h-10 bg-white focus-visible:ring-1 focus-visible:ring-blue-500"
              placeholder="Cari tahun anggaran..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                handleSearch(e.target.value);
              }}
            />
          </div>
        </div>

        <Card className="shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] border-slate-200/60 overflow-hidden rounded-xl py-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="min-w-[100px]">TAHUN</TableHead>
                    <TableHead className="text-right min-w-[150px]">TOTAL PAGU</TableHead>
                    <TableHead className="text-right min-w-[150px]">SISA PAGU</TableHead>
                    <TableHead className="text-center w-[80px] sm:w-[120px]">AKSI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                        {searchQuery ? "Tidak ditemukan data." : "Belum ada Tahun Anggaran."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.map((tahun) => (
                      <TableRow key={tahun.id}>
                        <TableCell className="font-medium text-slate-900">
                          {tahun.tahun}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-slate-900 font-medium">
                          {formatCurrency(Number(tahun.totalPagu))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-green-600">
                          {formatCurrency(Number(tahun.totalSisa))}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/dashboard/tahun-anggaran/${tahun.tahun}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Kelola Rincian">
                                <Settings2 className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteTahun(tahun.id)}
                              title="Hapus Tahun Anggaran"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination inside card footer style */}
            {totalData > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
                <p className="text-[10px] sm:text-sm text-slate-500 text-center sm:text-left w-full sm:w-auto">
                  Menampilkan <span className="font-medium text-slate-900">{(currentPage - 1) * 12 + 1}-{Math.min(currentPage * 12, totalData)}</span> dari <span className="font-medium text-slate-900">{totalData}</span>
                </p>
                <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto justify-center">
                  <Link href={createPageUrl(currentPage > 1 ? currentPage - 1 : 1)}>
                    <Button variant="outline" size="sm" disabled={currentPage <= 1} className="h-8 px-2 sm:px-3 text-slate-600">
                      <span className="hidden sm:inline">Sebelumnya</span>
                      <span className="sm:hidden">&laquo;</span>
                    </Button>
                  </Link>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Link key={p} href={createPageUrl(p)}>
                        <Button
                          variant={p === currentPage ? 'default' : 'outline'}
                          size="sm"
                          className={`h-8 w-8 p-0 ${p === currentPage ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-600 hover:text-slate-900'}`}>
                          {p}
                        </Button>
                      </Link>
                    ))}
                  </div>
                  <div className="flex sm:hidden items-center justify-center px-2 text-xs font-medium text-slate-600">
                    {currentPage} / {totalPages}
                  </div>
                  <Link href={createPageUrl(currentPage < totalPages ? currentPage + 1 : totalPages)}>
                    <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="h-8 px-2 sm:px-3 text-slate-600">
                      <span className="hidden sm:inline">Selanjutnya</span>
                      <span className="sm:hidden">&raquo;</span>
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MobileActionBar>
          <div className="flex gap-2 w-full">
            <Link href={`/dashboard/tahun-anggaran/serapan?tahun=${new Date().getFullYear()}`} className="flex-1">
              <Button variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold bg-white">
                <PieChart className="w-4 h-4 mr-2" />
                Serapan Anggaran
              </Button>
            </Link>
            {isSuperAdmin && (
              <Button onClick={() => setIsTahunOpen(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                Tahun Baru
              </Button>
            )}
          </div>
        </MobileActionBar>
      </div>
    </>
  );
}
