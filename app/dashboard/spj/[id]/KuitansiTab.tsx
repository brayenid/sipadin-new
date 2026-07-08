"use client";

import { useState, useMemo } from "react";
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
import { Combobox } from "@/components/ui/combobox";

export default function KuitansiTab({ spj, pegawaiList = [], onDirtyChange }: { spj: any; pegawaiList?: any[]; onDirtyChange?: (dirty: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [kuitansiType, setKuitansiType] = useState<'ALL' | 'HONOR' | 'DOPD'>('ALL');
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.kuitansi || {};

  const [form, setForm] = useState({
    tanggal: data.tanggal || "",
    kpaId: data.kpaId || spj.metaDokumen?.daftarHadirNarasumber?.kpaId || spj.metaDokumen?.dopd?.kpaId || "",
    bppId: data.bppId || spj.metaDokumen?.daftarTandaTerima?.bppId || spj.metaDokumen?.dopd?.bppId || "",
    kotaTandaTangan: data.kotaTandaTangan || spj.metaDokumen?.dopd?.kotaTandaTangan || "Sendawar",
  });

  const pegawaiOptions = useMemo(() => {
    return pegawaiList.map((p) => ({
      value: p.id,
      label: p.nama,
    }));
  }, [pegawaiList]);

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
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Kuitansi Pembayaran</CardTitle>
        <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Buku register kuitansi fisik terkait SPJ ini.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6">
        {/* REFERENSI NOMINAL */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Rujukan Nominal Pembayaran</p>
            <p className="text-[10px] sm:text-sm leading-relaxed">Nilai kuitansi ini disesuaikan dengan total biaya dari <strong>{spj.jenisSpj === 'PERJADIN' ? 'DOPD' : spj.jenisSpj === 'HONORARIUM' ? 'Daftar Tanda Terima' : 'Pengeluaran'}</strong>. Penandatangan kuitansi disesuaikan dengan data induk.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-lg sm:text-xl font-black">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(spj.totalPengeluaran))}</p>
          </div>
        </div>

        <div className="space-y-2 max-w-sm">
          <Label className="text-xs sm:text-sm">Tanggal Kuitansi</Label>
          <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Tanggal pembayaran/penerbitan kuitansi.</p>
        </div>

        {spj.jenisSpj === 'MAKAN_MINUM' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 border rounded-lg">
            <div className="md:col-span-2">
              <p className="font-semibold text-sm mb-2 text-slate-800">Pengaturan Penandatangan (Khusus Makan Minum)</p>
            </div>
            <div className="space-y-2">
              <Label>Kuasa Pengguna Anggaran (KPA)</Label>
              <Combobox 
                options={pegawaiOptions}
                value={form.kpaId}
                onChange={(val) => {
                  setForm({ ...form, kpaId: val });
                  onDirtyChange?.(true);
                }}
                placeholder="Pilih KPA..."
              />
            </div>
            <div className="space-y-2">
              <Label>Bendahara Pengeluaran Pembantu (BPP)</Label>
              <Combobox 
                options={pegawaiOptions}
                value={form.bppId}
                onChange={(val) => {
                  setForm({ ...form, bppId: val });
                  onDirtyChange?.(true);
                }}
                placeholder="Pilih BPP..."
              />
            </div>
            <div className="space-y-2">
              <Label>Kota Penandatanganan</Label>
              <Input 
                name="kotaTandaTangan"
                value={form.kotaTandaTangan}
                onChange={handleChange}
                placeholder="Cth: Sendawar"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4 sm:mt-6">
          {spj.jenisSpj === 'HONORARIUM' ? (
            <>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setKuitansiType('HONOR'); setShowPreview(true); }}>
                <FileText className="w-4 h-4 mr-2" />
                Kuitansi Honorarium
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setKuitansiType('DOPD'); setShowPreview(true); }}>
                <FileText className="w-4 h-4 mr-2" />
                Kuitansi Perjalanan
              </Button>
            </>
          ) : (
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setKuitansiType('ALL'); setShowPreview(true); }}>
              <FileText className="w-4 h-4 mr-2" />
              Preview Kuitansi
            </Button>
          )}
          <Button className="w-full sm:w-auto" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan
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
          const isMamin = spj.jenisSpj === 'MAKAN_MINUM';
          const isHonor = spj.jenisSpj === 'HONORARIUM';
          const dopdMeta = meta.dopd || {};
          
          let kpaId = dopdMeta.kpaId;
          let bppId = dopdMeta.bppId;

          if (isMamin) {
            kpaId = form.kpaId;
            bppId = form.bppId;
          } else if (isHonor) {
            if (kuitansiType === 'HONOR') {
              kpaId = meta.daftarHadirNarasumber?.kpaId;
              bppId = meta.daftarTandaTerima?.bppId;
            } else if (kuitansiType === 'DOPD') {
              kpaId = meta.dopdHonorarium?.kpaId;
              bppId = meta.dopdHonorarium?.bppId;
            }
          }

          const kpa = kpaId ? pegawaiList.find(p => p.id === kpaId) : null;
          const bpp = bppId ? pegawaiList.find(p => p.id === bppId) : null;
          
          let penerima = { nama: "Fulan", nip: "-" };
          
          if (isMamin) {
            const vendor = spj.maminDetail?.vendor;
            if (vendor) {
              penerima = {
                nama: vendor.namaPemilik || vendor.namaVendor,
                nip: `Pemilik ${vendor.namaVendor}`
              };
            } else {
              penerima = { nama: "Vendor / Pihak Ketiga", nip: "" };
            }
          } else if (isHonor) {
            const firstNarasumber = meta.daftarHadirNarasumber?.narasumber?.[0];
            penerima = firstNarasumber 
              ? { nama: firstNarasumber.nama, nip: firstNarasumber.jabatan || "" } 
              : { nama: "Narasumber", nip: "" };
          } else {
            const penerimaRoster = spj.roster?.find((r: any) => r.role === "KEPALA_JALAN") || spj.roster?.[0];
            penerima = penerimaRoster ? { nama: penerimaRoster.nama, nip: penerimaRoster.nip } : { nama: "Pegawai Fulan", nip: "-" };
          }
          
          let rincian: { label: string; jumlah: number }[] = [];
          
          if (isMamin) {
            // Untuk Makan Minum, langsung gunakan uraian (Nasi Kotak, Snack, dll)
            rincian = (spj.pengeluaranDetails || []).map((d: any) => ({
              label: d.uraian || "Biaya Lainnya",
              jumlah: Number(d.total)
            }));
          } else if (isHonor) {
            if (kuitansiType === 'HONOR') {
              let totalHonor = 0;
              if (meta.daftarTandaTerima && meta.daftarTandaTerima.tandaTerimaData) {
                Object.values(meta.daftarTandaTerima.tandaTerimaData).forEach((row: any) => {
                  totalHonor += (row.hargaSatuan || 0) * (row.kuantitas || 0);
                });
              }
              rincian = [
                { label: "Honorarium Narasumber", jumlah: totalHonor }
              ];
            } else if (kuitansiType === 'DOPD') {
              let dopdItems = meta.dopdHonorarium?.items || [];
              const rincianMap = new Map<string, number>();
              dopdItems.forEach((d: any) => {
                const cat = d.kategori || "Biaya Lainnya";
                rincianMap.set(cat, (rincianMap.get(cat) || 0) + Number(d.total || 0));
              });
              rincian = Array.from(rincianMap.entries())
                .filter(([_, jumlah]) => jumlah > 0)
                .map(([label, jumlah]) => ({
                  label,
                  jumlah
                }));
            }
          } else {
            // Untuk Perjadin, gabungkan berdasarkan kategori
            const rincianMap = new Map<string, number>();
            (spj.pengeluaranDetails || []).forEach((d: any) => {
              const cat = d.kategori || "Biaya Lainnya";
              rincianMap.set(cat, (rincianMap.get(cat) || 0) + Number(d.total));
            });
            
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
          }

          // Jika belum ada rincian yang diinput sama sekali
          if (rincian.length === 0) {
            rincian = [
              { label: spj.jenisSpj === "PERJADIN" ? "Biaya Perjalanan Dinas" : (isMamin ? "Biaya Makan Minum Rapat" : kuitansiType === 'HONOR' ? "Honorarium Narasumber" : kuitansiType === 'DOPD' ? "Biaya Perjalanan Dinas" : "Biaya Pengeluaran"), jumlah: Number(spj.totalPengeluaran) || 0 }
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

            maksudDinas: spj.tanggalPelaksanaan && spj.perihal ? `${spj.perihal} pada ${formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy')}` : spj.perihal,
            kotaTandaTangan: isMamin ? form.kotaTandaTangan : (dopdMeta.kotaTandaTangan || "Sendawar"),
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
