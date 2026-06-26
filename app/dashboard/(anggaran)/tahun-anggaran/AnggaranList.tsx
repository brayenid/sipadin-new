"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createTahunAnggaran, createKegiatan, createSubKegiatan, deleteTahunAnggaran, deleteKegiatan, deleteSubKegiatan } from "@/app/actions/anggaran";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/utils";

// Types derived from Prisma (roughly)
type SubKegiatan = { id: string; kodeSub: string; judulSub: string; saldoAwal: bigint; sisaSaldo: bigint };
type Kegiatan = { id: string; kodeKegiatan: string; judulKegiatan: string; subKegiatan: SubKegiatan[] };
type TahunAnggaran = { id: string; tahun: string; kegiatan: Kegiatan[] };

export default function AnggaranList({ initialData }: { initialData: TahunAnggaran[] }) {
  const [data, setData] = useState<TahunAnggaran[]>(initialData);
  const [loading, setLoading] = useState(false);

  // States for modals
  const [isTahunOpen, setIsTahunOpen] = useState(false);
  const [isKegiatanOpen, setIsKegiatanOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  
  const [activeTahunId, setActiveTahunId] = useState<string | null>(null);
  const [activeKegiatanId, setActiveKegiatanId] = useState<string | null>(null);

  const [deleteInfo, setDeleteInfo] = useState<{ type: 'tahun' | 'kegiatan' | 'sub', id: string } | null>(null);

  const handleCreateTahun = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const tahun = formData.get("tahun") as string;
    
    try {
      await createTahunAnggaran(tahun);
      setIsTahunOpen(false);
      window.location.reload(); // Quick refresh for now
    } catch (err) {
      alert("Gagal membuat Tahun Anggaran");
    }
    setLoading(false);
  };

  const handleCreateKegiatan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeTahunId) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const kode = formData.get("kode") as string;
    const judul = formData.get("judul") as string;
    
    try {
      await createKegiatan(activeTahunId, kode, judul);
      setIsKegiatanOpen(false);
      window.location.reload();
    } catch (err) {
      alert("Gagal membuat Kegiatan");
    }
    setLoading(false);
  };

  const handleCreateSubKegiatan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeKegiatanId) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const kode = formData.get("kode") as string;
    const judul = formData.get("judul") as string;
    const rawSaldo = formData.get("saldoAwal") as string;
    const saldoAwal = BigInt(parseCurrency(rawSaldo)); // parsed to number, then BigInt
    
    try {
      await createSubKegiatan(activeKegiatanId, kode, judul, saldoAwal);
      setIsSubOpen(false);
      window.location.reload();
    } catch (err) {
      alert("Gagal membuat Sub-Kegiatan");
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteInfo) return;
    setLoading(true);
    try {
      if (deleteInfo.type === 'tahun') await deleteTahunAnggaran(deleteInfo.id);
      if (deleteInfo.type === 'kegiatan') await deleteKegiatan(deleteInfo.id);
      if (deleteInfo.type === 'sub') await deleteSubKegiatan(deleteInfo.id);
      window.location.reload();
    } catch (err) {
      alert("Gagal menghapus data. Pastikan Anda memiliki akses.");
    }
    setLoading(false);
    setDeleteInfo(null);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Dialog open={isTahunOpen} onOpenChange={setIsTahunOpen}>
          <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tahun Anggaran Baru</Button>} />
          <DialogContent>
            <form onSubmit={handleCreateTahun} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Buat Tahun Anggaran</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Tahun (Misal: 2026)</Label>
                <Input name="tahun" required placeholder="2026" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main List */}
      {data.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="pt-6 text-center text-slate-500 py-12">
            Belum ada data Tahun Anggaran.
          </CardContent>
        </Card>
      ) : (
        data.map((tahun) => (
          <Card key={tahun.id} className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-100 border-b border-slate-200 flex flex-row items-center justify-between py-3">
              <CardTitle className="text-lg font-bold">Tahun {tahun.tahun}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setActiveTahunId(tahun.id); setIsKegiatanOpen(true); }}>
                  + Kegiatan
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteInfo({ type: 'tahun', id: tahun.id })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {tahun.kegiatan.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-400">Belum ada Kegiatan di tahun ini.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tahun.kegiatan.map(keg => (
                    <div key={keg.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{keg.kodeKegiatan} - {keg.judulKegiatan}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => { setActiveKegiatanId(keg.id); setIsSubOpen(true); }}>
                            + Sub-Kegiatan
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteInfo({ type: 'kegiatan', id: keg.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sub-Kegiatan list */}
                      <div className="pl-6 space-y-2 mt-2 border-l-2 border-slate-100">
                        {keg.subKegiatan.length === 0 ? (
                          <p className="text-xs text-slate-400">Belum ada Sub-Kegiatan.</p>
                        ) : (
                          keg.subKegiatan.map(sub => (
                            <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-md border border-slate-200 shadow-sm gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{sub.kodeSub} - {sub.judulSub}</p>
                                <div className="flex gap-4 mt-1 text-xs">
                                  <span className="text-slate-500">Pagu: <strong className="text-slate-700">{formatCurrency(sub.saldoAwal.toString())}</strong></span>
                                  <span className="text-blue-600 font-semibold">Sisa: {formatCurrency(sub.sisaSaldo.toString())}</span>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => setDeleteInfo({ type: 'sub', id: sub.id })}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {/* Kegiatan Modal */}
      <Dialog open={isKegiatanOpen} onOpenChange={setIsKegiatanOpen}>
        <DialogContent>
          <form onSubmit={handleCreateKegiatan} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Kegiatan</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Kode Kegiatan</Label>
              <Input name="kode" required placeholder="Contoh: 4.01.4.01.0.00.0.000.001" />
            </div>
            <div className="space-y-2">
              <Label>Judul Kegiatan</Label>
              <Input name="judul" required placeholder="Contoh: Koordinasi Kepala Daerah" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-Kegiatan Modal */}
      <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubKegiatan} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Sub-Kegiatan (Pagu)</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Kode Sub-Kegiatan</Label>
              <Input name="kode" required placeholder="Contoh: 4.01.4.01...001.001" />
            </div>
            <div className="space-y-2">
              <Label>Judul Sub-Kegiatan</Label>
              <Input name="judul" required placeholder="Contoh: Perjalanan Dinas Dalam Daerah" />
            </div>
            <div className="space-y-2">
              <Label>Saldo Awal (Pagu Anggaran)</Label>
              <Input name="saldoAwal" required placeholder="10.000.000" onChange={(e) => {
                // Auto format mask for Rupiah
                const val = e.target.value.replace(/\D/g, "");
                e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
              }} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!deleteInfo} onOpenChange={(open) => !open && setDeleteInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Jika Anda menghapus elemen induk (seperti Tahun Anggaran), 
              semua data di bawahnya (Kegiatan & Sub-Kegiatan) juga akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
