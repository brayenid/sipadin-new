"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, FileText, RefreshCw, Plus, Trash2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import LaporanPdf, { LaporanHasilMode } from "@/pdf/templates/LaporanPdf";
import { toast } from "sonner";
import { useEffect } from "react";
import { PresetDialog } from "@/components/ui/preset-dialog";
import laporanPresets from "@/lib/presets/laporan.json";

export default function LaporanTab({ spj, pegawaiList, onDirtyChange }: { spj: any, pegawaiList: any[], onDirtyChange?: (dirty: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.laporan || {};
  const dataSuratTugas = meta.suratTugas || {};

  const [form, setForm] = useState({
    dasarLaporan: data.dasarLaporan || "",
    kegiatan: data.kegiatan || "",
    waktu: data.waktu || "",
    lokasi: data.lokasi || "",
    tujuan: data.tujuan || "",
    hasilMode: (data.hasilMode as LaporanHasilMode) || "POINTS",
    hasilPembuka: data.hasilPembuka || "",
    hasilNarasi: data.hasilNarasi || "",
  });

  const [hasilPoin, setHasilPoin] = useState<string[]>(data.hasilPoin && data.hasilPoin.length > 0 ? data.hasilPoin : [""]);

  const [initialForm, setInitialForm] = useState(form);
  const [initialPoin, setInitialPoin] = useState(hasilPoin);

  const isChanged = (key: keyof typeof form) => form[key] !== initialForm[key];
  const isPoinChanged = JSON.stringify(hasilPoin) !== JSON.stringify(initialPoin);

  const changedInputClass = "border-amber-300 bg-amber-50 focus-visible:ring-amber-300";

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    onDirtyChange?.(true);
  };

  const handlePointChange = (idx: number, val: string) => {
    const newPoin = [...hasilPoin];
    newPoin[idx] = val;
    setHasilPoin(newPoin);
    onDirtyChange?.(true);
  };

  const handleAddPoint = () => {
    setHasilPoin([...hasilPoin, ""]);
    onDirtyChange?.(true);
  };

  const handleRemovePoint = (idx: number) => {
    const newPoin = [...hasilPoin];
    newPoin.splice(idx, 1);
    if (newPoin.length === 0) newPoin.push("");
    setHasilPoin(newPoin);
    onDirtyChange?.(true);
  };

  const handleSelectPresetString = (key: "hasilPembuka" | "hasilNarasi", text: string) => {
    setForm({ ...form, [key]: text });
    onDirtyChange?.(true);
  };

  const handleSelectPresetArray = (key: "hasilPoin", text: string) => {
    const currentList = hasilPoin;
    const lastItem = currentList[currentList.length - 1];
    if (lastItem.trim() === "") {
      const newList = [...currentList];
      newList[newList.length - 1] = text;
      setHasilPoin(newList);
    } else {
      setHasilPoin([...currentList, text]);
    }
    onDirtyChange?.(true);
  };

  // Sync helpers
  const getNomorSuratTugasFull = () => {
    const prefix = dataSuratTugas.nomorPrefix || "000.1.2.3/";
    const tengah = dataSuratTugas.nomorTengah || "";
    const suffix = dataSuratTugas.nomorSuffix || "/Org-Tu.P/VI/2026";
    if (!tengah) return "";
    return `Surat Tugas Nomor ${prefix}${tengah}${suffix}`;
  };

  const syncDasar = () => {
    const st = getNomorSuratTugasFull();
    if (st) {
      setForm({ ...form, dasarLaporan: st });
      onDirtyChange?.(true);
    }
    else toast.error("Nomor Surat Tugas belum lengkap di tab Surat Tugas!");
  };
  const syncLokasi = () => {
    setForm({ ...form, lokasi: spj.perjadinDetail?.tempatTujuan || "" });
    onDirtyChange?.(true);
  };
  const syncTujuan = () => {
    setForm({ ...form, tujuan: spj.perjadinDetail?.tempatTujuan || "" });
    onDirtyChange?.(true);
  };
  const syncKegiatan = () => {
    setForm({ ...form, kegiatan: spj.perihal || "" });
    onDirtyChange?.(true);
  };

  useEffect(() => {
    // Auto-sync if data is empty (first time open)
    if (!data.dasarLaporan && !data.kegiatan && !data.waktu && !data.lokasi && !data.tujuan) {
      const st = getNomorSuratTugasFull();
      const syncedForm = {
        ...form,
        dasarLaporan: st || form.dasarLaporan,
        lokasi: spj.perjadinDetail?.tempatTujuan || form.lokasi,
        tujuan: spj.perjadinDetail?.tempatTujuan || form.tujuan,
        kegiatan: spj.perihal || form.kegiatan,
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(syncedForm);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialForm(syncedForm); // Baseline for new form is the auto-synced form
      // Do NOT call onDirtyChange(true) here
    }
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        hasilPoin,
      };
      await updateMetaDokumen(spj.id, "laporan", payload);
      onDirtyChange?.(false);
      setInitialForm(form);
      setInitialPoin(hasilPoin);
      toast.success("Laporan Hasil Perjalanan Dinas berhasil disimpan.");
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
        <CardTitle>Rincian Laporan</CardTitle>
        <CardDescription>Uraian hasil yang dicapai dari kegiatan perjalanan dinas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* DASAR LAPORAN */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dasar Laporan</Label>
              <button type="button" className="text-[10px] font-bold text-primary hover:underline" onClick={syncDasar}>
                (Sinkron)
              </button>
            </div>
            <Input name="dasarLaporan" value={form.dasarLaporan} onChange={handleChange} placeholder="Contoh: Surat Tugas Nomor..." className={isChanged("dasarLaporan") ? changedInputClass : ""} />
          </div>

          {/* WAKTU */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2 h-[15px]">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</Label>
            </div>
            <Input type="date" name="waktu" value={form.waktu} onChange={handleChange} className={isChanged("waktu") ? changedInputClass : ""} />
          </div>

          {/* LOKASI */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lokasi</Label>
              <button type="button" className="text-[10px] font-bold text-primary hover:underline" onClick={syncLokasi}>
                (Sinkron)
              </button>
            </div>
            <Input name="lokasi" value={form.lokasi} onChange={handleChange} placeholder="Contoh: Samarinda" className={isChanged("lokasi") ? changedInputClass : ""} />
          </div>

          {/* TUJUAN */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tujuan</Label>
              <button type="button" className="text-[10px] font-bold text-primary hover:underline" onClick={syncTujuan}>
                (Sinkron)
              </button>
            </div>
            <Input name="tujuan" value={form.tujuan} onChange={handleChange} placeholder="Contoh: Samarinda" className={isChanged("tujuan") ? changedInputClass : ""} />
          </div>
        </div>

        {/* KEGIATAN */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kegiatan</Label>
            <button type="button" className="text-[10px] font-bold text-primary hover:underline" onClick={syncKegiatan}>
              (Sinkron)
            </button>
          </div>
          <Textarea name="kegiatan" value={form.kegiatan} onChange={handleChange} rows={2} placeholder="Menghadiri undangan..." className={isChanged("kegiatan") ? changedInputClass : ""} />
        </div>

        {/* HASIL LAPORAN SECTION */}
        <div className="pt-6 border-t mt-8">
          <div className="flex items-center justify-between mb-6">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hasil Laporan</Label>
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border">
              <button
                type="button"
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  form.hasilMode === "POINTS" ? "bg-white shadow-sm text-slate-900 border" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => {
                  setForm({ ...form, hasilMode: "POINTS" });
                  onDirtyChange?.(true);
                }}
              >
                POIN
              </button>
              <button
                type="button"
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  form.hasilMode === "NARRATIVE" ? "bg-white shadow-sm text-slate-900 border" : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => {
                  setForm({ ...form, hasilMode: "NARRATIVE" });
                  onDirtyChange?.(true);
                }}
              >
                NARASI
              </button>
            </div>
          </div>

          {/* PEMBUKA (Umum) */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pembuka</Label>
              <PresetDialog 
                title="Preset Pembuka" 
                options={laporanPresets.hasilPembuka} 
                onSelect={(text) => handleSelectPresetString("hasilPembuka", text)} 
              />
            </div>
            <Textarea 
              name="hasilPembuka" 
              value={form.hasilPembuka} 
              onChange={handleChange} 
              rows={2} 
              placeholder="Sehubungan dengan pelaksanaan perjalanan dinas tersebut di atas..." 
              className={isChanged("hasilPembuka") ? changedInputClass : ""}
            />
          </div>

          {/* MODE POIN */}
          {form.hasilMode === "POINTS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Butir Hasil</Label>
                  <PresetDialog 
                    title="Preset Butir Hasil" 
                    options={laporanPresets.hasilPoin} 
                    onSelect={(text) => handleSelectPresetArray("hasilPoin", text)} 
                  />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPoint} className="h-8">
                  <Plus className="w-4 h-4 mr-1" /> Tambah
                </Button>
              </div>
              
              <div className="space-y-3">
                {hasilPoin.map((poin, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="mt-2.5 text-xs font-medium text-slate-400 w-6 text-right shrink-0">#{idx + 1}</div>
                    <Textarea 
                      value={poin}
                      onChange={(e) => handlePointChange(idx, e.target.value)}
                      rows={2}
                      className={`resize-y min-h-[60px] ${isPoinChanged ? changedInputClass : ""}`}
                      placeholder="Uraian butir hasil..."
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-red-600 shrink-0 mt-1"
                      onClick={() => handleRemovePoint(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODE NARASI */}
          {form.hasilMode === "NARRATIVE" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Isi Narasi</Label>
                <PresetDialog 
                  title="Preset Narasi" 
                  options={laporanPresets.hasilNarasi} 
                  onSelect={(text) => handleSelectPresetString("hasilNarasi", text)} 
                />
              </div>
              <Textarea 
                name="hasilNarasi" 
                value={form.hasilNarasi} 
                onChange={handleChange} 
                rows={8} 
                placeholder="Jabarkan hasil kegiatan dalam bentuk paragraf narasi..." 
                className={isChanged("hasilNarasi") ? changedInputClass : ""}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={loading} className="md:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Laporan
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Laporan"
        spjId={spj.id}
        docKey="laporanPdf"
        fields={[]}
        renderDocument={(config) => {
          const laporanData = {
            dasarLaporan: form.dasarLaporan,
            kegiatan: form.kegiatan,
            waktu: form.waktu,
            lokasi: form.lokasi,
            tujuan: form.tujuan,

            signerNama: selectedPegawai?.nama || null,
            signerNip: selectedPegawai?.nip || null,
            signerJabatan: selectedPegawai?.jabatan || null,
            signerPangkat: selectedPegawai?.pangkat || null,
            signerGolongan: selectedPegawai?.golongan || null,
            signerJabatanTampil: selectedPegawai?.jabatan || null,

            hasilMode: form.hasilMode as LaporanHasilMode,
            hasilPembuka: form.hasilPembuka,
            hasilPoin: form.hasilMode === "POINTS" ? hasilPoin : [],
            hasilNarasi: form.hasilMode === "NARRATIVE" ? form.hasilNarasi : null,
          };

          const rosterData = (spj.roster || []).map((r: any) => ({
            id: r.id,
            order: r.order || 0,
            role: r.role,
            nama: r.nama,
            nip: r.nip,
            jabatan: r.jabatan,
            pangkat: r.pangkat,
            golongan: r.golongan,
            instansi: "Sekretariat Daerah Kabupaten Kutai Barat"
          }));

          return (
            <LaporanPdf 
              spj={{ noSuratTugas: getNomorSuratTugasFull() }} 
              roster={rosterData}
              laporan={laporanData}
            />
          );
        }}
      />
    </Card>
  );
}
