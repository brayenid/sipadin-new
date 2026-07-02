"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatWita } from "@/lib/date-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, FileText } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import KuitansiPdf from "@/pdf/templates/KuitansiPdf";

export default function KuitansiTab({ spj, pegawaiList = [], onDirtyChange }: { spj: any; pegawaiList?: any[]; onDirtyChange?: (dirty: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.kuitansi || {};

  const [form, setForm] = useState({
    tanggal: data.tanggal || "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    onDirtyChange?.(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "kuitansi", form);
      toast.success("Data Kuitansi berhasil disimpan.");
      onDirtyChange?.(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle>Kuitansi Pembayaran</CardTitle>
        <CardDescription>Buku register kuitansi fisik terkait SPJ ini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* REFERENSI NOMINAL */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Rujukan Nominal Pembayaran</p>
            <p className="text-sm">Nilai kuitansi ini disesuaikan dengan total biaya dari <strong>{spj.jenisSpj === 'PERJADIN' ? 'DOPD' : 'Pengeluaran'}</strong>. Penandatangan kuitansi sesuai dengan yang telah ditetapkan pada DOPD.</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(spj.totalPengeluaran))}</p>
          </div>
        </div>

        <div className="space-y-2 max-w-sm">
          <Label>Tanggal Kuitansi</Label>
          <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
          <p className="text-xs text-slate-500 mt-1">Tanggal pembayaran/penerbitan kuitansi.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview Kuitansi
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Kuitansi
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Kuitansi"
        spjId={spj.id}
        docKey="kuitansiPdf"
        fields={[]}
        renderDocument={(config) => {
          const dopdMeta = meta.dopd || {};
          const kpaId = dopdMeta.kpaId;
          const bppId = dopdMeta.bppId;
          const kpa = kpaId ? pegawaiList.find(p => p.id === kpaId) : null;
          const bpp = bppId ? pegawaiList.find(p => p.id === bppId) : null;
          const penerimaRoster = spj.roster?.find((r: any) => r.role === "KEPALA_JALAN") || spj.roster?.[0];
          const penerima = penerimaRoster ? { nama: penerimaRoster.nama, nip: penerimaRoster.nip } : { nama: "Pegawai Fulan", nip: "-" };
          
          let rincian: { label: string; jumlah: number }[] = [];
          
          const rincianMap = new Map<string, number>();
          // Gabungkan pengeluaran umum
          (spj.pengeluaranDetails || []).forEach((d: any) => {
            const cat = d.kategori || "Biaya Lainnya";
            rincianMap.set(cat, (rincianMap.get(cat) || 0) + Number(d.total));
          });
          
          // Gabungkan pengeluaran dari DOPD (per personel)
          (spj.roster || []).forEach((r: any) => {
            (r.pengeluaranDetails || []).forEach((d: any) => {
              const cat = d.kategori || "Biaya Lainnya";
              rincianMap.set(cat, (rincianMap.get(cat) || 0) + Number(d.total));
            });
          });

          rincian = Array.from(rincianMap.entries())
            .filter(([_, jumlah]) => jumlah > 0)
            .map(([label, jumlah]) => ({
              label,
              jumlah
            }));

          // Jika belum ada rincian yang diinput sama sekali
          if (rincian.length === 0) {
            rincian = [
              { label: spj.jenisSpj === "PERJADIN" ? "Biaya Perjalanan Dinas" : "Biaya Pengeluaran", jumlah: Number(spj.totalPengeluaran) || 0 }
            ];
          }

          const kuitansiSpj = {
            tahunAnggaran: "2026",
            kodeKegiatan: spj.kodeRekening?.subKegiatan?.kegiatan?.kodeKegiatan || "1.01",
            judulKegiatan: spj.kodeRekening?.subKegiatan?.kegiatan?.judulKegiatan || "-",
            kodeSubKegiatan: spj.kodeRekening?.subKegiatan?.kodeSub || "1.01.01",
            judulSubKegiatan: spj.kodeRekening?.subKegiatan?.judulSub || "-",
            kodeRekening: spj.kodeRekening?.kodeRekening || "-",
            judulRekening: spj.kodeRekening?.judulRekening || "-",
            upGu: "",
            nomorBku: spj.nomorBku || "",

            maksudDinas: spj.perihal,
            kotaTandaTangan: "Sendawar",
            tglSuratTugas: form.tanggal ? new Date(form.tanggal) : undefined,
            tanggalKuitansiLabel: form.tanggal ? formatWita(form.tanggal, 'dd MMMM yyyy') : null
          };

          return (
            <KuitansiPdf
              spj={kuitansiSpj}
              penerima={penerima}
              rincian={rincian}
              signers={{
                kpa: kpa ? { nama: kpa.nama, nip: kpa.nip } : null,
                bpp: bpp ? { nama: bpp.nama, nip: bpp.nip } : null
              }}
            />
          );
        }}
      />
    </Card>
  );
}
