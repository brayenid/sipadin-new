"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import DaftarHadirPdf from "@/pdf/templates/DaftarHadirPdf";
import { toast } from "sonner";
import { formatWita } from "@/lib/date-utils";

export default function DaftarHadirTab({ spj }: { spj: any }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.daftarHadir || {};

  const [form, setForm] = useState({
    waktu: data.waktu || "09.00 Wita s/d Selesai",
    tempat: data.tempat || "",
    jumlahPeserta: data.jumlahPeserta || 10,
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "daftarHadir", {
        ...form,
        jumlahPeserta: Number(form.jumlahPeserta)
      });
      toast.success("Daftar Hadir berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const tanggalLabel = spj.tanggalPelaksanaan 
    ? formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy') 
    : (data.tanggal || "");

  // Simple hari mapping from tanggalPelaksanaan
  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariLabel = spj.tanggalPelaksanaan 
    ? hariArr[new Date(spj.tanggalPelaksanaan).getDay()]
    : "";

  return (
    <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Daftar Hadir</CardTitle>
          <CardDescription>Pembuatan daftar hadir peserta rapat untuk SPJ Makan Minum.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Waktu</Label>
            <Input 
              name="waktu" 
              value={form.waktu} 
              onChange={handleChange} 
              placeholder="09.00 Wita s/d Selesai"
            />
          </div>

          <div className="space-y-2">
            <Label>Tempat</Label>
            <Input 
              name="tempat" 
              value={form.tempat} 
              onChange={handleChange} 
              placeholder="Ruang Rapat Utama"
            />
          </div>

          <div className="space-y-2">
            <Label>Jumlah Peserta</Label>
            <Input 
              type="number"
              name="jumlahPeserta" 
              value={form.jumlahPeserta} 
              onChange={handleChange} 
              min={1}
            />
            <p className="text-xs text-slate-500">Jumlah kolom tanda tangan kosong yang akan digenerate di PDF.</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={loading} className="md:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Daftar Hadir
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Daftar Hadir"
        spjId={spj.id}
        docKey="daftarHadirPdf"
        fields={[]}
        renderDocument={(config) => {
          const spjData = {
            hari: hariLabel,
            tanggalLabel: tanggalLabel,
            waktu: form.waktu,
            tempat: form.tempat,
            acara: spj.perihal || ""
          };

          return (
            <DaftarHadirPdf 
              spj={spjData}
              jumlahPeserta={Number(form.jumlahPeserta) || 10}
              layout={config.styles}
            />
          );
        }}
      />
    </Card>
  );
}
