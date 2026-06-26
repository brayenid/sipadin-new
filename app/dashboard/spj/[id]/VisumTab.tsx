"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";

export default function VisumTab({ spj }: { spj: any }) {
  const [loading, setLoading] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.visum || {};

  const [form, setForm] = useState({
    pejabatTujuanNama: data.pejabatTujuanNama || "",
    pejabatTujuanNip: data.pejabatTujuanNip || "",
    pejabatTujuanJabatan: data.pejabatTujuanJabatan || "",
    tanggalTiba: data.tanggalTiba || "",
    tanggalKembali: data.tanggalKembali || "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "visum", form);
      toast.success("Data Surat Keterangan Jalan (Visum) berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Visum (Surat Keterangan Jalan)</CardTitle>
        <CardDescription>Pengesahan kedatangan dan keberangkatan di tempat tujuan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tanggal Tiba di Tujuan</Label>
            <Input type="date" name="tanggalTiba" value={form.tanggalTiba} onChange={handleChange} />
            <p className="text-xs text-slate-500 mt-1">Tanggal pelaksana tiba di tempat tujuan penugasan.</p>
          </div>
          <div className="space-y-2">
            <Label>Tanggal Berangkat dari Tujuan</Label>
            <Input type="date" name="tanggalKembali" value={form.tanggalKembali} onChange={handleChange} />
            <p className="text-xs text-slate-500 mt-1">Tanggal pelaksana kembali bertolak pulang dari tempat tujuan.</p>
          </div>
        </div>
        
        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
          <h4 className="text-sm font-semibold text-slate-900">Pejabat Pengesah di Tempat Tujuan</h4>
          <div className="space-y-2">
            <Label>Nama Pejabat</Label>
            <Input name="pejabatTujuanNama" value={form.pejabatTujuanNama} onChange={handleChange} placeholder="Nama pejabat yang menerima..." />
            <p className="text-xs text-slate-500 mt-1">Nama pihak/pejabat yang akan melegalisasi visum kehadiran.</p>
          </div>
          <div className="space-y-2">
            <Label>NIP Pejabat</Label>
            <Input name="pejabatTujuanNip" value={form.pejabatTujuanNip} onChange={handleChange} placeholder="NIP (Kosongkan jika non-PNS)" />
            <p className="text-xs text-slate-500 mt-1">NIP pejabat bersangkutan.</p>
          </div>
          <div className="space-y-2">
            <Label>Jabatan</Label>
            <Input name="pejabatTujuanJabatan" value={form.pejabatTujuanJabatan} onChange={handleChange} placeholder="Contoh: Kepala Dinas..." />
            <p className="text-xs text-slate-500 mt-1">Jabatan struktural/fungsional pihak penerima di instansi tujuan.</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Visum
        </Button>
      </CardContent>
    </Card>
  );
}
