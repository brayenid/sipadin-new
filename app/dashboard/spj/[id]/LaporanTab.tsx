"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";

export default function LaporanTab({ spj }: { spj: any }) {
  const [loading, setLoading] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.laporan || {};

  const [form, setForm] = useState({
    hasilKegiatan: data.hasilKegiatan || "",
    kesimpulan: data.kesimpulan || "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "laporan", form);
      toast.success("Laporan Hasil Perjalanan Dinas berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Laporan Hasil Perjalanan Dinas</CardTitle>
        <CardDescription>Uraian hasil yang dicapai dari kegiatan perjalanan dinas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Hasil Kegiatan</Label>
          <Textarea name="hasilKegiatan" value={form.hasilKegiatan} onChange={handleChange} rows={6} placeholder="Jelaskan secara rinci hasil dari penugasan..." />
          <p className="text-xs text-slate-500 mt-1">Uraikan kronologis dan pokok-pokok penting dari kegiatan yang telah dilaksanakan.</p>
        </div>
        <div className="space-y-2">
          <Label>Kesimpulan / Tindak Lanjut</Label>
          <Textarea name="kesimpulan" value={form.kesimpulan} onChange={handleChange} rows={4} placeholder="Kesimpulan akhir dan langkah tindak lanjut..." />
          <p className="text-xs text-slate-500 mt-1">Ringkasan hasil akhir dan rekomendasi kebijakan atau tindak lanjut ke depannya.</p>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Laporan
        </Button>
      </CardContent>
    </Card>
  );
}
