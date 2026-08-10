"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Info } from "lucide-react";
import { updateMetaDokumen } from "@/lib/actions-client";
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
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Visum</CardTitle>
        <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Pengesahan kedatangan dan keberangkatan di tempat tujuan.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6">
        
        <div className="flex items-start p-3 sm:p-4 rounded-md bg-blue-50 border border-blue-200">
          <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] sm:text-sm text-blue-800 leading-relaxed">
            Penandatangan (&quot;Pejabat yang Memberi Perintah&quot;) pada halaman awal dan akhir visum ini <strong>secara otomatis disinkronkan dengan penandatangan pada tab Surat Tugas</strong>. Pastikan Anda telah mengisi penandatangan di sana dengan benar.
          </p>
        </div>

        {/* INPUT STAGE COUNT */}
        <div className="space-y-2">
          <Label className="text-xs sm:text-sm">Jumlah Kolom Kotak Visum</Label>
          <Input 
            type="number" 
            name="stageCount" 
            value={form.stageCount} 
            onChange={handleChange} 
            className="w-24 sm:w-32 h-9 sm:h-10 text-center"
            min={1}
            max={6}
          />
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Berkaitan dengan berapa tempat/tujuan yang bisa ditandatangani dan distempel pada lembar cetak. (Bawaan: 3)</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4 sm:mt-6">
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
