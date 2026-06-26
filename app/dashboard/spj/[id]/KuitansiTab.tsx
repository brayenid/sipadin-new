"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";

export default function KuitansiTab({ spj }: { spj: any }) {
  const [loading, setLoading] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.kuitansi || {};

  const [form, setForm] = useState({
    nomorKuitansi: data.nomorKuitansi || "",
    tanggal: data.tanggal || "",
    sudahTerimaDari: data.sudahTerimaDari || "Pejabat Pelaksana Teknis Kegiatan (PPTK)",
    untukPembayaran: data.untukPembayaran || spj.perihal || "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "kuitansi", form);
      toast.success("Data Kuitansi berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Kuitansi Pembayaran</CardTitle>
        <CardDescription>Buku register kuitansi fisik terkait SPJ ini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* REFERENSI NOMINAL */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Rujukan Nominal Pembayaran</p>
            <p className="text-sm">Nilai kuitansi ini harus sinkron dengan total biaya dari <strong>{spj.jenisSpj === 'PERJADIN' ? 'DOPD' : 'Pengeluaran'}</strong>.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(spj.totalPengeluaran))}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nomor Kuitansi</Label>
            <Input name="nomorKuitansi" value={form.nomorKuitansi} onChange={handleChange} placeholder="Contoh: 015/KWT/2026" />
            <p className="text-xs text-slate-500 mt-1">Nomor pencatatan kuitansi pada buku register keuangan.</p>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Kuitansi</Label>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
            <p className="text-xs text-slate-500 mt-1">Tanggal pembayaran/penerbitan kuitansi.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Sudah Terima Dari</Label>
          <Input name="sudahTerimaDari" value={form.sudahTerimaDari} onChange={handleChange} placeholder="Contoh: Pejabat Pelaksana Teknis Kegiatan (PPTK)" />
          <p className="text-xs text-slate-500 mt-1">Pihak/Bendahara yang menyerahkan uang (pembayar).</p>
        </div>
        <div className="space-y-2">
          <Label>Untuk Pembayaran (Uraian)</Label>
          <Textarea name="untukPembayaran" value={form.untukPembayaran} onChange={handleChange} rows={3} placeholder="Contoh: Biaya Perjalanan Dinas ke Samarinda..." />
          <p className="text-xs text-slate-500 mt-1">Uraian rinci tujuan pembayaran kuitansi ini.</p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Kuitansi
        </Button>
      </CardContent>
    </Card>
  );
}
