"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Loader2, Save, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { updateSpjMasterData, deleteSpjTransaction } from "@/app/actions/spj";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import DopdTab from "./DopdTab";
import PersonelTab from "./PersonelTab";
import TelaahanTab from "./TelaahanTab";
import PengeluaranTab from "./PengeluaranTab";
import KuitansiTab from "./KuitansiTab";
import SuratTugasTab from "./SuratTugasTab";
import SpdTab from "./SpdTab";
import VisumTab from "./VisumTab";
import LaporanTab from "./LaporanTab";

export default function SpjDetailTabs({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ringkasan");
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  // State form edit master
  const [editForm, setEditForm] = useState({
    tanggalSpj: spj.tanggalSpj ? new Date(spj.tanggalSpj).toISOString().split('T')[0] : "",
    nomorBku: spj.nomorBku || "",
    perihal: spj.perihal || "",
    driveUrl: spj.metaDokumen?.driveUrl || spj.driveUrl || "",
    terbayar: spj.terbayar || false,
  });

  const handleEditChange = (e: any) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSaveMaster = async () => {
    // TRIGGER TURBOPACK CLIENT RECOMPILE
    setLoadingEdit(true);
    try {
      await updateSpjMasterData(spj.id, editForm);
      toast.success("Master Data SPJ berhasil diperbarui.");
      setOpenEdit(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan data.");
    } finally {
      setLoadingEdit(false);
    }
  };

  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));
  };

  const handleDeleteSpj = async () => {
    setLoadingDelete(true);
    try {
      await deleteSpjTransaction(spj.id);
      window.location.href = "/dashboard/spj";
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus SPJ.");
      setLoadingDelete(false);
      setOpenDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* SCROLLABLE TABS */}
        <div className="border-b overflow-x-auto no-scrollbar mb-6">
          <TabsList className="bg-transparent border-none w-max h-12 p-0 justify-start gap-6">
            <TabsTrigger value="ringkasan" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Ringkasan</TabsTrigger>
            {spj.jenisSpj === "PERJADIN" && (
              <>
                <TabsTrigger value="personel" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Personel</TabsTrigger>
                <TabsTrigger value="telaahan" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Telaahan</TabsTrigger>
              </>
            )}
            
            {/* Hanya tampilkan DOPD jika Perjadin */}
            {spj.jenisSpj === "PERJADIN" && (
              <TabsTrigger value="dopd" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-bold text-slate-900">DOPD</TabsTrigger>
            )}
            {spj.jenisSpj !== "PERJADIN" && (
              <TabsTrigger value="pengeluaran" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-bold text-slate-900">Pengeluaran</TabsTrigger>
            )}
            
            <TabsTrigger value="kuitansi" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Kuitansi</TabsTrigger>
            
            {spj.jenisSpj === "PERJADIN" && (
              <>
                <TabsTrigger value="surat-tugas" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Surat Tugas</TabsTrigger>
                <TabsTrigger value="spd" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">SPD</TabsTrigger>
                <TabsTrigger value="visum" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Visum</TabsTrigger>
                <TabsTrigger value="laporan" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Laporan</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* TAB RINGKASAN */}
        <TabsContent value="ringkasan" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Informasi Master SPJ</CardTitle>
              <div className="flex gap-2">
                <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                  <DialogTrigger>
                    <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-8 px-3 cursor-pointer bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-2" /> Hapus SPJ
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" /> Peringatan Kritikal
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-slate-600 mb-4">
                        Apakah Anda yakin ingin menghapus permanen SPJ ini beserta seluruh dokumen, rincian biaya, dan anggotanya?
                      </p>
                      <p className="text-sm text-slate-600 font-medium">
                        Saldo anggaran yang telah terpakai akan otomatis dikembalikan ke Pagu Sub-Kegiatan.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setOpenDelete(false)}>Batal</Button>
                      <Button variant="destructive" onClick={handleDeleteSpj} disabled={loadingDelete}>
                        {loadingDelete ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Ya, Hapus SPJ
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                  <DialogTrigger>
                    <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                      <Pencil className="w-4 h-4 mr-2" /> Edit Master
                    </div>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Data Master SPJ</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tanggal SPJ</Label>
                      <Input type="date" name="tanggalSpj" value={editForm.tanggalSpj} onChange={handleEditChange} />
                      <p className="text-xs text-slate-500 mt-1">Tanggal penetapan/dikeluarkannya dokumen SPJ secara keseluruhan.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Nomor BKU</Label>
                      <Input name="nomorBku" value={editForm.nomorBku} onChange={handleEditChange} placeholder="Contoh: 001/BKU/2026" />
                      <p className="text-xs text-slate-500 mt-1">Nomor Buku Kas Umum (Opsional jika belum diterbitkan).</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Perihal / Judul Kegiatan</Label>
                      <Input name="perihal" value={editForm.perihal} onChange={handleEditChange} />
                      <p className="text-xs text-slate-500 mt-1">Perihal ini akan muncul otomatis sebagai Maksud/Tujuan di seluruh dokumen.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Tautan Bukti Fisik (Google Drive)</Label>
                      <Input name="driveUrl" value={editForm.driveUrl} onChange={handleEditChange} />
                      <p className="text-xs text-slate-500 mt-1">Link penyimpanan cloud untuk hasil scan kuitansi/nota/tiket.</p>
                    </div>
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-slate-50">
                      <div className="space-y-0.5">
                        <Label className="text-base">Status Pembayaran</Label>
                        <p className="text-sm text-muted-foreground">
                          Tandai jika SPJ ini sudah lunas dibayarkan ke pegawai / vendor.
                        </p>
                      </div>
                      <Switch checked={editForm.terbayar} onCheckedChange={(val) => setEditForm({ ...editForm, terbayar: val })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenEdit(false)}>Batal</Button>
                    <Button onClick={handleSaveMaster} disabled={loadingEdit || !editForm.tanggalSpj || !editForm.perihal}>
                      {loadingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Simpan Perubahan
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-md border">
                <div className="space-y-1 col-span-2 md:col-span-4 flex items-center justify-between border-b pb-3 mb-1">
                  <div>
                    <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-1">Status Pembayaran</p>
                    {spj.terbayar ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Sudah Terbayar Lunas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        <AlertCircle className="w-4 h-4 mr-1" /> Belum Terbayar
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Tanggal SPJ</p>
                  <p className="font-semibold text-slate-900">{new Intl.DateTimeFormat("id-ID").format(new Date(spj.tanggalSpj))}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Nomor BKU</p>
                  <p className="font-semibold text-slate-900">{spj.nomorBku || "-"}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Link Drive</p>
                  <p className="font-semibold text-blue-600 truncate">
                    {spj.metaDokumen?.driveUrl ? <a href={spj.metaDokumen.driveUrl} target="_blank" rel="noreferrer" className="hover:underline">{spj.metaDokumen.driveUrl}</a> : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Anggaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Tahun Anggaran</p>
                  <p className="font-medium">{spj.subKegiatan.kegiatan.tahunAnggaran.tahun}</p>
                </div>
                <div>
                  <p className="text-slate-500">Judul Kegiatan</p>
                  <p className="font-medium">{spj.subKegiatan.kegiatan.judulKegiatan}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Judul Sub-Kegiatan</p>
                  <p className="font-medium">{spj.subKegiatan.judulSub}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {spj.jenisSpj === "PERJADIN" && spj.perjadinDetail && (
            <Card>
              <CardHeader>
                <CardTitle>Rute Perjalanan Dinas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Tempat Berangkat</p>
                    <p className="font-medium">{spj.perjadinDetail.tempatBerangkat}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tempat Tujuan</p>
                    <p className="font-medium">{spj.perjadinDetail.tempatTujuan}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tanggal Perjalanan</p>
                    <p className="font-medium">
                      {new Intl.DateTimeFormat("id-ID").format(new Date(spj.perjadinDetail.tglBerangkat))} 
                      {" "}s/d{" "} 
                      {new Intl.DateTimeFormat("id-ID").format(new Date(spj.perjadinDetail.tglKembali))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Lama Perjalanan</p>
                    <p className="font-medium">{spj.perjadinDetail.lamaPerjalanan} Hari</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB PERSONEL & TELAAHAN (KHUSUS PERJADIN) */}
        {spj.jenisSpj === "PERJADIN" && (
          <>
            <TabsContent value="personel">
              <PersonelTab spj={spj} pegawaiList={pegawaiList} />
            </TabsContent>
            <TabsContent value="telaahan">
              <TelaahanTab spj={spj} />
            </TabsContent>
          </>
        )}

        {/* TAB DOPD (KHUSUS PERJADIN) */}
        {spj.jenisSpj === "PERJADIN" && (
          <TabsContent value="dopd">
            <DopdTab spj={spj} />
          </TabsContent>
        )}

        {/* TAB PENGELUARAN (KHUSUS NON-PERJADIN) */}
        {spj.jenisSpj !== "PERJADIN" && (
          <TabsContent value="pengeluaran">
            <PengeluaranTab spj={spj} />
          </TabsContent>
        )}

        <TabsContent value="kuitansi">
          <KuitansiTab spj={spj} />
        </TabsContent>

        <TabsContent value="surat-tugas">
          <SuratTugasTab spj={spj} pegawaiList={pegawaiList} />
        </TabsContent>

        {spj.jenisSpj === "PERJADIN" && (
          <>
            <TabsContent value="spd">
              <SpdTab spj={spj} />
            </TabsContent>
            <TabsContent value="visum">
              <VisumTab spj={spj} />
            </TabsContent>
            <TabsContent value="laporan">
              <LaporanTab spj={spj} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
