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
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <div>
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Daftar Hadir</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Pembuatan daftar hadir peserta rapat untuk SPJ Makan Minum.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6 sm:space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] sm:text-sm">Waktu</Label>
            <Input 
              name="waktu" 
              value={form.waktu} 
              onChange={handleChange} 
              placeholder="09.00 Wita s/d Selesai"
              className="h-9 text-[10px] sm:text-sm px-2"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] sm:text-sm">Tempat</Label>
            <Input 
              name="tempat" 
              value={form.tempat} 
              onChange={handleChange} 
              placeholder="Ruang Rapat Utama"
              className="h-9 text-[10px] sm:text-sm px-2"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] sm:text-sm">Jumlah Peserta</Label>
            <Input 
              type="number"
              name="jumlahPeserta" 
              value={form.jumlahPeserta} 
              onChange={handleChange} 
              min={1}
              className="h-9 text-[10px] sm:text-sm px-2"
            />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Jumlah kolom tanda tangan kosong yang akan digenerate di PDF.</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-4">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan
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
