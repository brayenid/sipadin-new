"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, AlertCircle, FileText, ChevronLeft, Loader2 } from "lucide-react";
import { restoreSpjTransaction, permanentDeleteSpj } from "@/app/actions/spj";
import { restoreNaskahDinas, permanentDeleteNaskahDinas } from "@/app/actions/naskah-dinas";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export default function RecycleBinClient({ deletedSpj, deletedNaskah }: { deletedSpj: any[], deletedNaskah: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("spj");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const handleRestoreSpj = async (id: string) => {
    setLoading(`restore-${id}`);
    try {
      await restoreSpjTransaction(id);
      toast.success("SPJ berhasil dipulihkan dari Recycle Bin.");
      setActiveDialog(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memulihkan SPJ.");
    } finally {
      setLoading(null);
    }
  };

  const handlePermanentDeleteSpj = async (id: string) => {
    setLoading(`delete-${id}`);
    try {
      await permanentDeleteSpj(id);
      toast.success("SPJ berhasil dihapus secara permanen.");
      setActiveDialog(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus SPJ.");
    } finally {
      setLoading(null);
    }
  };

  const handleRestoreNaskah = async (id: string) => {
    setLoading(`restore-${id}`);
    try {
      await restoreNaskahDinas(id);
      toast.success("Naskah Dinas berhasil dipulihkan.");
      setActiveDialog(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal memulihkan Naskah Dinas.");
    } finally {
      setLoading(null);
    }
  };

  const handlePermanentDeleteNaskah = async (id: string) => {
    setLoading(`delete-${id}`);
    try {
      await permanentDeleteNaskahDinas(id);
      toast.success("Naskah Dinas berhasil dihapus permanen.");
      setActiveDialog(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus Naskah Dinas.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Recycle Bin</span>
        </div>
        <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Recycle Bin</h2>
        <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">Kelola data SPJ dan Naskah Dinas yang telah dihapus sementara.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="spj">Data SPJ</TabsTrigger>
          <TabsTrigger value="naskah">Naskah Dinas</TabsTrigger>
        </TabsList>

        <TabsContent value="spj" className="mt-4">
          <Card className="p-0 gap-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] sm:rounded-xl rounded-none border-x-0 sm:border-x">
            <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-800">SPJ Terhapus</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">Daftar SPJ yang dihapus. Memulihkan SPJ akan memotong kembali pagu anggaran.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="min-w-[150px]">Tanggal Dihapus</TableHead>
                      <TableHead className="min-w-[200px]">Jenis / Perihal</TableHead>
                      <TableHead className="min-w-[150px]">Total Pengeluaran</TableHead>
                      <TableHead className="text-right min-w-[220px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedSpj.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">Tidak ada SPJ terhapus.</TableCell>
                      </TableRow>
                    ) : (
                      deletedSpj.map((spj) => (
                        <TableRow key={spj.id}>
                          <TableCell className="text-sm">
                            {new Date(spj.updatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-700">{spj.jenisSpj}</span>
                              <span className="text-xs text-slate-500 max-w-[200px] truncate">{spj.perihal || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{formatCurrency(spj.totalPengeluaran.toString())}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Dialog open={activeDialog === `restore-spj-${spj.id}`} onOpenChange={(v) => setActiveDialog(v ? `restore-spj-${spj.id}` : null)}>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" disabled={loading !== null} />}>
                                  {loading === `restore-${spj.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />} Pulihkan
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm text-center p-6 sm:p-8">
                                  <DialogHeader className="flex flex-col items-center">
                                    <DialogTitle className="text-lg font-medium text-slate-900 mb-2">
                                      Pulihkan SPJ ini?
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
                                      SPJ akan dipulihkan dan <strong className="text-slate-700">saldo pagu anggaran akan dipotong kembali</strong> sesuai dengan total pengeluaran.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex flex-col gap-3 mt-6">
                                    <Button onClick={() => handleRestoreSpj(spj.id)} disabled={loading !== null} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base font-medium text-white">
                                      {loading === `restore-${spj.id}` ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RotateCcw className="w-5 h-5 mr-2" />} Ya, Pulihkan
                                    </Button>
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} className="w-full h-11 text-base font-medium text-slate-700" />}>
                                      Batal
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog open={activeDialog === `delete-spj-${spj.id}`} onOpenChange={(v) => setActiveDialog(v ? `delete-spj-${spj.id}` : null)}>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={loading !== null} />}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Hapus Permanen
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm text-center p-6 sm:p-8">
                                  <DialogHeader className="flex flex-col items-center">
                                    <DialogTitle className="text-lg font-medium text-slate-900 mb-2">
                                      Hapus permanen SPJ ini?
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
                                      Tindakan ini tidak dapat dibatalkan. <br/>Semua data terkait SPJ ini akan <strong className="text-slate-700">dihapus secara permanen</strong> dari sistem.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex flex-col gap-3 mt-6">
                                    <Button variant="destructive" onClick={() => handlePermanentDeleteSpj(spj.id)} disabled={loading !== null} className="w-full bg-[#E50000] hover:bg-[#CC0000] h-11 text-base font-medium text-white">
                                      {loading === `delete-${spj.id}` ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />} Hapus Permanen
                                    </Button>
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} className="w-full h-11 text-base font-medium text-slate-700" />}>
                                      Batal
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="naskah" className="mt-4">
          <Card className="p-0 gap-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] sm:rounded-xl rounded-none border-x-0 sm:border-x">
            <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Naskah Dinas Terhapus</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">Daftar Naskah Dinas yang dihapus sementara.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="min-w-[150px]">Tanggal Dihapus</TableHead>
                      <TableHead className="min-w-[150px]">Jenis Naskah</TableHead>
                      <TableHead className="min-w-[200px]">Nomor / Perihal</TableHead>
                      <TableHead className="text-right min-w-[220px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedNaskah.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">Tidak ada Naskah Dinas terhapus.</TableCell>
                      </TableRow>
                    ) : (
                      deletedNaskah.map((naskah) => (
                        <TableRow key={naskah.id}>
                          <TableCell className="text-sm">
                            {new Date(naskah.updatedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-700">{naskah.jenisNaskah.replace(/_/g, ' ')}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">{naskah.nomorSurat || "-"}</span>
                              <span className="text-xs text-slate-500 max-w-[200px] truncate">{naskah.perihal || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Dialog open={activeDialog === `restore-naskah-${naskah.id}`} onOpenChange={(v) => setActiveDialog(v ? `restore-naskah-${naskah.id}` : null)}>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" disabled={loading !== null} />}>
                                  {loading === `restore-${naskah.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />} Pulihkan
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm text-center p-6 sm:p-8">
                                  <DialogHeader className="flex flex-col items-center">
                                    <DialogTitle className="text-lg font-medium text-slate-900 mb-2">
                                      Pulihkan Naskah ini?
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
                                      Naskah Dinas ini akan dikembalikan ke daftar aktif dan dapat dikelola kembali.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex flex-col gap-3 mt-6">
                                    <Button onClick={() => handleRestoreNaskah(naskah.id)} disabled={loading !== null} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base font-medium text-white">
                                      {loading === `restore-${naskah.id}` ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <RotateCcw className="w-5 h-5 mr-2" />} Ya, Pulihkan
                                    </Button>
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} className="w-full h-11 text-base font-medium text-slate-700" />}>
                                      Batal
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog open={activeDialog === `delete-naskah-${naskah.id}`} onOpenChange={(v) => setActiveDialog(v ? `delete-naskah-${naskah.id}` : null)}>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={loading !== null} />}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Hapus Permanen
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-sm text-center p-6 sm:p-8">
                                  <DialogHeader className="flex flex-col items-center">
                                    <DialogTitle className="text-lg font-medium text-slate-900 mb-2">
                                      Hapus permanen Naskah ini?
                                    </DialogTitle>
                                    <DialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
                                      Tindakan ini tidak dapat dibatalkan. <br/>Naskah Dinas ini akan <strong className="text-slate-700">dihapus secara permanen</strong> dari sistem.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex flex-col gap-3 mt-6">
                                    <Button variant="destructive" onClick={() => handlePermanentDeleteNaskah(naskah.id)} disabled={loading !== null} className="w-full bg-[#E50000] hover:bg-[#CC0000] h-11 text-base font-medium text-white">
                                      {loading === `delete-${naskah.id}` ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />} Hapus Permanen
                                    </Button>
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} className="w-full h-11 text-base font-medium text-slate-700" />}>
                                      Batal
                                    </DialogClose>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
