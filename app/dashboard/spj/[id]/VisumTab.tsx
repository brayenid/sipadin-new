"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Info } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import VisumPdf from "@/pdf/templates/VisumPdf";
import { toast } from "sonner";

export default function VisumTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.visum || {};
  const dataSuratTugas = meta.suratTugas || {};

  const [form, setForm] = useState({
    stageCount: data.stageCount || 3,
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

  const selectedPegawai = pegawaiList?.find((p) => p.id === dataSuratTugas.penandatanganId);

  return (
    <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle>Visum</CardTitle>
        <CardDescription>Pengesahan kedatangan dan keberangkatan di tempat tujuan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="flex items-start p-4 rounded-md bg-blue-50 border border-blue-200">
          <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 leading-relaxed">
            Penandatangan (&quot;Pejabat yang Memberi Perintah&quot;) pada halaman awal dan akhir visum ini <strong>secara otomatis disinkronkan dengan penandatangan pada tab Surat Tugas</strong>. Pastikan Anda telah mengisi penandatangan di sana dengan benar.
          </p>
        </div>

        {/* INPUT STAGE COUNT */}
        <div className="space-y-2">
          <Label>Jumlah Kolom Kotak Visum</Label>
          <Input 
            type="number" 
            name="stageCount" 
            value={form.stageCount} 
            onChange={handleChange} 
            className="w-32"
            min={1}
            max={6}
          />
          <p className="text-xs text-slate-500 mt-1">Berkaitan dengan berapa tempat/tujuan yang bisa ditandatangani dan distempel pada lembar cetak. (Bawaan: 3)</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={loading} className="md:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Visum
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Visum"
        spjId={spj.id}
        docKey="visumPdf"
        fields={[]}
        renderDocument={(config) => {
          const spjData = {
            tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || "Sendawar",
            tempatTujuan: spj.perjadinDetail?.tempatTujuan || "-",
          };

          const signerData = {
            nama: selectedPegawai?.nama || "-",
            nip: selectedPegawai?.nip || "-",
            jabatan: selectedPegawai?.jabatan || "-",
            pangkat: selectedPegawai?.pangkat || "-",
            golongan: selectedPegawai?.golongan || "-",
            jabatanTampil: selectedPegawai?.jabatan || "-"
          };

          return (
            <VisumPdf 
              spj={spjData} 
              stageCount={Number(form.stageCount) || 3}
              signer={signerData}
            />
          );
        }}
      />
    </Card>
  );
}
