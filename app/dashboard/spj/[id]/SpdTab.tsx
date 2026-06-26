"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";

export default function SpdTab({ spj }: { spj: any }) {
  const [loading, setLoading] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.spd || {};

  const [form, setForm] = useState({
    nomorSpd: data.nomorSpd || "",
    tanggalSpd: data.tanggalSpd || "",
    namaPpk: data.namaPpk || "",
    nipPpk: data.nipPpk || "",
    keteranganLain: data.keteranganLain || "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "spd", form);
      toast.success("Surat Perjalanan Dinas (SPD) berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Surat Perjalanan Dinas (SPD)</CardTitle>
        <CardDescription>Dokumen resmi perjalanan dinas yang disahkan oleh PPK.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nomor SPD</Label>
            <Input name="nomorSpd" value={form.nomorSpd} onChange={handleChange} placeholder="Contoh: 094/SPD-456/2026" />
            <p className="text-xs text-slate-500 mt-1">Nomor register resmi Surat Perjalanan Dinas.</p>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Dikeluarkan</Label>
            <Input type="date" name="tanggalSpd" value={form.tanggalSpd} onChange={handleChange} />
            <p className="text-xs text-slate-500 mt-1">Tanggal penetapan/penandatanganan SPD.</p>
          </div>
        </div>
        
        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
          <h4 className="text-sm font-semibold text-slate-900">Pejabat Pembuat Komitmen (PPK)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama PPK</Label>
              <Input name="namaPpk" value={form.namaPpk} onChange={handleChange} placeholder="Nama Pejabat..." />
              <p className="text-xs text-slate-500 mt-1">Nama Pejabat Pembuat Komitmen yang menandatangani SPD.</p>
            </div>
            <div className="space-y-2">
              <Label>NIP PPK</Label>
              <Input name="nipPpk" value={form.nipPpk} onChange={handleChange} placeholder="NIP Pejabat..." />
              <p className="text-xs text-slate-500 mt-1">Nomor Induk Pegawai PPK bersangkutan.</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Keterangan Lain</Label>
          <Input name="keteranganLain" value={form.keteranganLain} onChange={handleChange} placeholder="Misal: Pembebanan Anggaran DPA-SKPD..." />
          <p className="text-xs text-slate-500 mt-1">Keterangan tambahan opsional untuk diisikan ke dalam format SPD.</p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan SPD
        </Button>
      </CardContent>
    </Card>
  );
}
