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
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
          <Link href="/dashboard" className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Recycle Bin</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Recycle Bin</h2>
        <p className="text-slate-500 mt-1">Kelola data SPJ dan Naskah Dinas yang telah dihapus sementara.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="spj">Data SPJ</TabsTrigger>
          <TabsTrigger value="naskah">Naskah Dinas</TabsTrigger>
        </TabsList>

        <TabsContent value="spj" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>SPJ Terhapus</CardTitle>
              <CardDescription>Daftar SPJ yang dihapus. Memulihkan SPJ akan memotong kembali pagu anggaran.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Dihapus</TableHead>
                      <TableHead>Jenis / Perihal</TableHead>
                      <TableHead>Total Pengeluaran</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
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
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className="text-emerald-600 flex items-center gap-2">
                                      <RotateCcw className="w-5 h-5" /> Konfirmasi Pemulihan SPJ
                                    </DialogTitle>
                                    <DialogDescription>
                                      Apakah Anda yakin ingin memulihkan SPJ ini? Saldo pagu anggaran akan dipotong kembali sesuai dengan total pengeluaran.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} />}>Batal</DialogClose>
                                    <Button onClick={() => handleRestoreSpj(spj.id)} disabled={loading !== null} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                      {loading === `restore-${spj.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Ya, Pulihkan"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog open={activeDialog === `delete-spj-${spj.id}`} onOpenChange={(v) => setActiveDialog(v ? `delete-spj-${spj.id}` : null)}>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={loading !== null} />}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Hapus Permanen
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className="text-red-600 flex items-center gap-2">
                                      <AlertCircle className="w-5 h-5" /> Peringatan Hapus Permanen
                                    </DialogTitle>
                                    <DialogDescription>
                                      Tindakan ini tidak dapat dibatalkan. Semua data terkait SPJ ini akan dihapus dari sistem selamanya.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} />}>Batal</DialogClose>
                                    <Button variant="destructive" onClick={() => handlePermanentDeleteSpj(spj.id)} disabled={loading !== null}>
                                      {loading === `delete-${spj.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Ya, Hapus Permanen"}
                                    </Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Naskah Dinas Terhapus</CardTitle>
              <CardDescription>Daftar Naskah Dinas yang dihapus sementara.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Dihapus</TableHead>
                      <TableHead>Jenis Naskah</TableHead>
                      <TableHead>Nomor / Perihal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
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
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className="text-emerald-600 flex items-center gap-2">
                                      <RotateCcw className="w-5 h-5" /> Konfirmasi Pemulihan
                                    </DialogTitle>
                                    <DialogDescription>
                                      Apakah Anda yakin ingin memulihkan Naskah Dinas ini kembali ke daftar aktif?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} />}>Batal</DialogClose>
                                    <Button onClick={() => handleRestoreNaskah(naskah.id)} disabled={loading !== null} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                      {loading === `restore-${naskah.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Ya, Pulihkan"}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog open={activeDialog === `delete-naskah-${naskah.id}`} onOpenChange={(v) => setActiveDialog(v ? `delete-naskah-${naskah.id}` : null)}>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={loading !== null} />}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Hapus Permanen
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle className="text-red-600 flex items-center gap-2">
                                      <AlertCircle className="w-5 h-5" /> Peringatan Hapus Permanen
                                    </DialogTitle>
                                    <DialogDescription>
                                      Tindakan ini tidak dapat dibatalkan. Naskah Dinas ini akan dihapus secara permanen.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <DialogClose render={<Button variant="outline" disabled={loading !== null} />}>Batal</DialogClose>
                                    <Button variant="destructive" onClick={() => handlePermanentDeleteNaskah(naskah.id)} disabled={loading !== null}>
                                      {loading === `delete-${naskah.id}` ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Ya, Hapus Permanen"}
                                    </Button>
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
