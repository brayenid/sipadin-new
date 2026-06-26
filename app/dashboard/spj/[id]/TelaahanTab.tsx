"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";

export default function TelaahanTab({ spj }: { spj: any }) {
  const [loading, setLoading] = useState(false);
  
  // Baca JSON, default ke object kosong jika belum ada
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.telaahan || {};

  const [form, setForm] = useState({
    tanggal: data.tanggal || "",
    kepada: data.kepada || "",
    sifat: data.sifat || "",
    lampiran: data.lampiran || "",
    dasar: data.dasar || "",
    praAnggapan: Array.isArray(data.praAnggapan) && data.praAnggapan.length > 0 ? data.praAnggapan : [""],
    fakta: Array.isArray(data.fakta) && data.fakta.length > 0 ? data.fakta : [""],
    analisis: data.analisis || "",
    kesimpulan: data.kesimpulan || "",
    saran: data.saran || "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleListChange = (key: "praAnggapan" | "fakta", index: number, value: string) => {
    const newList = [...form[key]];
    newList[index] = value;
    setForm({ ...form, [key]: newList });
  };

  const handleAddListItem = (key: "praAnggapan" | "fakta") => {
    setForm({ ...form, [key]: [...form[key], ""] });
  };

  const handleRemoveListItem = (key: "praAnggapan" | "fakta", index: number) => {
    const newList = form[key].filter((_: any, i: number) => i !== index);
    // Pastikan minimal ada 1 input kosong
    setForm({ ...form, [key]: newList.length > 0 ? newList : [""] });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Bersihkan list kosong sebelum disimpan
      const payload = {
        ...form,
        praAnggapan: form.praAnggapan.filter((i: string) => i.trim() !== ""),
        fakta: form.fakta.filter((i: string) => i.trim() !== ""),
      };
      
      await updateMetaDokumen(spj.id, "telaahan", payload);
      toast.success("Telaahan Staf berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle>Telaahan Staf</CardTitle>
        <CardDescription>Dokumen narasi pendukung yang merinci fakta, analisis, dan pra anggapan terkait penugasan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* BAGIAN KOP / HEADER TELAHS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-lg bg-slate-50">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
            <p className="text-xs text-slate-500 mt-1">Tanggal surat telaahan dibuat.</p>
          </div>
          <div className="space-y-2">
            <Label>Kepada</Label>
            <Input name="kepada" value={form.kepada} onChange={handleChange} placeholder="Contoh: Bupati Kutai Barat" />
            <p className="text-xs text-slate-500 mt-1">Tujuan surat telaahan (misal: Sekda, Bupati).</p>
          </div>
          <div className="space-y-2">
            <Label>Sifat</Label>
            <Input name="sifat" value={form.sifat} onChange={handleChange} placeholder="Contoh: Penting / Biasa" />
            <p className="text-xs text-slate-500 mt-1">Sifat urgensi dokumen telaahan.</p>
          </div>
          <div className="space-y-2">
            <Label>Lampiran</Label>
            <Input name="lampiran" value={form.lampiran} onChange={handleChange} placeholder="Contoh: 1 (satu) Berkas" />
            <p className="text-xs text-slate-500 mt-1">Jumlah berkas fisik yang dilampirkan bersama surat ini.</p>
          </div>
        </div>

        {/* BAGIAN ISI TELAHS */}
        <div className="space-y-2">
          <Label>I. Dasar</Label>
          <Textarea name="dasar" value={form.dasar} onChange={handleChange} rows={3} placeholder="Surat Undangan / DPA SKPD..." />
          <p className="text-xs text-slate-500 mt-1">Landasan hukum atau surat yang mendasari perjalanan dinas ini.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>II. Pra Anggapan</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => handleAddListItem("praAnggapan")}>
              <Plus className="w-3 h-3 mr-2" /> Tambah Poin
            </Button>
          </div>
          <div className="space-y-3 pl-4 border-l-2 border-slate-200">
            {form.praAnggapan.map((item: string, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-sm font-bold text-slate-400 mt-2">{index + 1}.</span>
                <Textarea 
                  value={item} 
                  onChange={(e) => handleListChange("praAnggapan", index, e.target.value)} 
                  rows={2} 
                  className="resize-none"
                  placeholder="Masukkan asumsi atau pra anggapan..."
                />
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => handleRemoveListItem("praAnggapan", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>III. Fakta yang Memengaruhi</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => handleAddListItem("fakta")}>
              <Plus className="w-3 h-3 mr-2" /> Tambah Poin
            </Button>
          </div>
          <div className="space-y-3 pl-4 border-l-2 border-slate-200">
            {form.fakta.map((item: string, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-sm font-bold text-slate-400 mt-2">{index + 1}.</span>
                <Textarea 
                  value={item} 
                  onChange={(e) => handleListChange("fakta", index, e.target.value)} 
                  rows={2} 
                  className="resize-none"
                  placeholder="Fakta-fakta di lapangan..."
                />
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => handleRemoveListItem("fakta", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>IV. Analisis</Label>
          <Textarea name="analisis" value={form.analisis} onChange={handleChange} rows={4} placeholder="Analisa terhadap fakta dan pra anggapan..." />
          <p className="text-xs text-slate-500 mt-1">Analisa mendalam mengenai kegiatan yang akan dilakukan.</p>
        </div>

        <div className="space-y-2">
          <Label>V. Kesimpulan</Label>
          <Textarea name="kesimpulan" value={form.kesimpulan} onChange={handleChange} rows={3} placeholder="Kesimpulan dari analisis..." />
          <p className="text-xs text-slate-500 mt-1">Intisari dari analisa telaahan staf.</p>
        </div>

        <div className="space-y-2">
          <Label>VI. Saran</Label>
          <Textarea name="saran" value={form.saran} onChange={handleChange} rows={3} placeholder="Saran tindakan..." />
          <p className="text-xs text-slate-500 mt-1">Rekomendasi yang diajukan kepada pimpinan berdasarkan kesimpulan.</p>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Telaahan Staf
        </Button>
      </CardContent>
    </Card>
  );
}
