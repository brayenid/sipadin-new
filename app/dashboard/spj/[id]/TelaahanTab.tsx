"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getWitaToday } from "@/lib/date-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import { toast } from "sonner";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import TelaahanStafPdf from "@/pdf/templates/TelaahanStafPdf";
import { FileText } from "lucide-react";
import { useEffect } from "react";
import { Combobox } from "@/components/ui/combobox";
import { PresetDialog } from "@/components/ui/preset-dialog";
import telaahanPresets from "@/lib/presets/telaahan.json";
import { getDefaultNomorSuffix } from "@/lib/utils";

export default function TelaahanTab({ spj, pegawaiList, onDirtyChange }: { spj: any, pegawaiList: any[], onDirtyChange?: (dirty: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Baca JSON, default ke object kosong jika belum ada
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.telaahan || {};

  const [form, setForm] = useState({
    nomorPrefix: data.nomorPrefix ?? "000.8 / ",
    nomorTengah: data.nomorTengah ?? "",
    nomorSuffix: data.nomorSuffix ?? getDefaultNomorSuffix(" /Org-TU.P"),
    tanggal: data.tanggal || "",
    kepada: data.kepada || "",
    perihal: data.perihal || "",
    sifat: data.sifat || "",
    lampiran: data.lampiran || "",
    dasar: data.dasar || "",
    praAnggapan: Array.isArray(data.praAnggapan) && data.praAnggapan.length > 0 ? data.praAnggapan : [""],
    fakta: Array.isArray(data.fakta) && data.fakta.length > 0 ? data.fakta : [""],
    analisis: data.analisis || "",
    kesimpulan: data.kesimpulan || "",
    saran: data.saran || "",
    penandatanganId: data.penandatanganId || "",
  });

  const [initialForm, setInitialForm] = useState(form);

  useEffect(() => {
    const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
    onDirtyChange?.(isDirty);
  }, [form, initialForm, onDirtyChange]);

  const checkDirty = (key: string) => JSON.stringify((form as any)[key]) !== JSON.stringify((initialForm as any)[key]);
  const dirtyClass = "bg-amber-50 border-amber-500 focus-visible:ring-amber-500";

  const pegawaiOptions = pegawaiList?.map(p => ({
    value: p.id,
    label: `${p.nama}`
  })) || [];

  const getSignerData = () => {
    const p = pegawaiList?.find(x => x.id === form.penandatanganId);
    if (!p) return undefined;
    return {
      nama: p.nama,
      nip: p.nip || "-",
      jabatan: p.jabatan || "-",
      pangkat: p.pangkat || null,
      golongan: p.golongan || null
    };
  };

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

  const handleSelectPresetString = (key: "dasar" | "analisis" | "kesimpulan" | "saran", text: string) => {
    setForm({ ...form, [key]: text });
  };

  const handleSelectPresetArray = (key: "praAnggapan" | "fakta", text: string) => {
    const currentList = form[key];
    const lastItem = currentList[currentList.length - 1];
    if (lastItem.trim() === "") {
      const newList = [...currentList];
      newList[newList.length - 1] = text;
      setForm({ ...form, [key]: newList });
    } else {
      setForm({ ...form, [key]: [...currentList, text] });
    }
  };

  const setTodayDate = () => {
    const today = getWitaToday();
    // adjust for local timezone offset before ISO string
    const offset = today.getTimezoneOffset();
    today.setMinutes(today.getMinutes() - offset);
    setForm({ ...form, tanggal: today.toISOString().split('T')[0] });
  };

  const isWeekend = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6;
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
      setInitialForm(form);
      toast.success("Telaahan Staf berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-center justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <div>
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Telaahan Staf</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Dokumen narasi pendukung yang merinci fakta, analisis, dan pra anggapan terkait penugasan.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6 sm:space-y-8">
        
        {/* BAGIAN KOP / HEADER TELAHS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-6 border rounded-lg bg-slate-50">
          <div className="space-y-2">
            <div className="relative flex items-center">
              <Label className="text-xs sm:text-sm">Tanggal</Label>
              <Button type="button" variant="ghost" size="sm" onClick={setTodayDate} className="absolute right-0 -top-1 h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
                Hari Ini
              </Button>
            </div>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} className={checkDirty("tanggal") ? dirtyClass : ""} />
            {isWeekend(form.tanggal) ? (
              <p className="text-xs font-medium text-amber-600 mt-1">Peringatan: Tanggal yang dipilih bukan hari kerja (Sabtu/Minggu).</p>
            ) : (
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Tanggal surat telaahan dibuat.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Nomor Telaahan</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className={`w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center ${checkDirty("nomorPrefix") ? dirtyClass : ""}`} 
                placeholder="000.8 / "
              />
              <Input 
                name="nomorTengah" 
                value={form.nomorTengah} 
                onChange={handleChange} 
                className={`rounded-none font-bold text-center flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400 ${checkDirty("nomorTengah") ? dirtyClass : ""}`}
                placeholder="Contoh: 123"
              />
              <Input 
                name="nomorSuffix" 
                value={form.nomorSuffix} 
                onChange={handleChange} 
                className={`w-1/3 rounded-l-none border-l-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-xs ${checkDirty("nomorSuffix") ? dirtyClass : ""}`} 
                placeholder={getDefaultNomorSuffix(" /Org-TU.P")}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Isi bagian tengah dengan nomor urut surat, bagian lainnya bisa disesuaikan.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Kepada</Label>
            <Input name="kepada" value={form.kepada} onChange={handleChange} placeholder="Contoh: Bupati Kutai Barat" className={checkDirty("kepada") ? dirtyClass : ""} />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Tujuan surat telaahan (misal: Sekda, Bupati).</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Sifat</Label>
            <Input name="sifat" value={form.sifat} onChange={handleChange} placeholder="Contoh: Penting" className={checkDirty("sifat") ? dirtyClass : ""} />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Sifat surat (Penting, Biasa, dsb).</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Lampiran</Label>
            <Input name="lampiran" value={form.lampiran} onChange={handleChange} placeholder="Contoh: 1 (satu) berkas" className={checkDirty("lampiran") ? dirtyClass : ""} />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Jumlah lampiran (jika ada).</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Perihal</Label>
            <Input name="perihal" value={form.perihal} onChange={handleChange} placeholder="Contoh: Permohonan Penugasan Dinas ke Samarinda" className={checkDirty("perihal") ? dirtyClass : ""} />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Perihal spesifik untuk dokumen Telaahan Staf (kepada pimpinan).</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs sm:text-sm">Penandatangan Telaahan Staf</Label>
            <Combobox 
              options={pegawaiOptions}
              value={form.penandatanganId}
              onChange={(val) => setForm({ ...form, penandatanganId: val })}
              placeholder="Cari Pejabat Penandatangan..."
              emptyText="Pegawai tidak ditemukan."
            />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Pilih pegawai yang akan menandatangani dokumen ini.</p>
          </div>
        </div>

        {/* BAGIAN ISI TELAHS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">I. Dasar</Label>
            <PresetDialog 
              title="Preset Dasar" 
              options={telaahanPresets.dasar} 
              onSelect={(text) => handleSelectPresetString("dasar", text)} 
            />
          </div>
          <Textarea name="dasar" value={form.dasar} onChange={handleChange} rows={3} placeholder="Surat Undangan / DPA SKPD..." className={checkDirty("dasar") ? dirtyClass : ""} />
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Landasan hukum atau surat yang mendasari perjalanan dinas ini.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">II. Pra Anggapan</Label>
            <div className="flex items-center gap-2">
              <PresetDialog 
                title="Preset Pra Anggapan" 
                options={telaahanPresets.praAnggapan} 
                onSelect={(text) => handleSelectPresetArray("praAnggapan", text)} 
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleAddListItem("praAnggapan")}>
                <Plus className="w-3 h-3 mr-2" /> Tambah Poin
              </Button>
            </div>
          </div>
          <div className="space-y-3 pl-4 border-l-2 border-slate-200/60">
            {form.praAnggapan.map((item: string, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-xs sm:text-sm font-bold text-slate-400 mt-2 sm:mt-2.5">{index + 1}.</span>
                <Textarea 
                  value={item} 
                  onChange={(e) => handleListChange("praAnggapan", index, e.target.value)} 
                  rows={2} 
                  className={`resize-none ${checkDirty("praAnggapan") ? dirtyClass : ""}`}
                  placeholder="Masukkan asumsi atau pra anggapan..."
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 hover:text-red-500" onClick={() => handleRemoveListItem("praAnggapan", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">III. Fakta yang Memengaruhi</Label>
            <div className="flex items-center gap-2">
              <PresetDialog 
                title="Preset Fakta" 
                options={telaahanPresets.fakta} 
                onSelect={(text) => handleSelectPresetArray("fakta", text)} 
              />
              <Button type="button" variant="outline" size="sm" onClick={() => handleAddListItem("fakta")}>
                <Plus className="w-3 h-3 mr-2" /> Tambah Poin
              </Button>
            </div>
          </div>
          <div className="space-y-3 pl-4 border-l-2 border-slate-200/60">
            {form.fakta.map((item: string, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-xs sm:text-sm font-bold text-slate-400 mt-2 sm:mt-2.5">{index + 1}.</span>
                <Textarea 
                  value={item} 
                  onChange={(e) => handleListChange("fakta", index, e.target.value)} 
                  rows={2} 
                  className={`resize-none ${checkDirty("fakta") ? dirtyClass : ""}`}
                  placeholder="Fakta-fakta di lapangan..."
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 hover:text-red-500" onClick={() => handleRemoveListItem("fakta", index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">IV. Analisis</Label>
            <PresetDialog 
              title="Preset Analisis" 
              options={telaahanPresets.analisis} 
              onSelect={(text) => handleSelectPresetString("analisis", text)} 
            />
          </div>
          <Textarea name="analisis" value={form.analisis} onChange={handleChange} rows={4} placeholder="Analisa terhadap fakta dan pra anggapan..." className={checkDirty("analisis") ? dirtyClass : ""} />
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Analisa mendalam mengenai kegiatan yang akan dilakukan.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">V. Kesimpulan</Label>
            <PresetDialog 
              title="Preset Kesimpulan" 
              options={telaahanPresets.kesimpulan} 
              onSelect={(text) => handleSelectPresetString("kesimpulan", text)} 
            />
          </div>
          <Textarea name="kesimpulan" value={form.kesimpulan} onChange={handleChange} rows={3} placeholder="Kesimpulan dari analisis..." className={checkDirty("kesimpulan") ? dirtyClass : ""} />
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Intisari dari analisa telaahan staf.</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm">VI. Saran</Label>
            <PresetDialog 
              title="Preset Saran" 
              options={telaahanPresets.saran} 
              onSelect={(text) => handleSelectPresetString("saran", text)} 
            />
          </div>
          <Textarea name="saran" value={form.saran} onChange={handleChange} rows={3} placeholder="Saran tindakan..." className={checkDirty("saran") ? dirtyClass : ""} />
          <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Rekomendasi yang diajukan kepada pimpinan berdasarkan kesimpulan.</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
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
        title="Telaahan Staf"
        spjId={spj.id}
        docKey="telaahanStaf"
        initialConfig={meta.telaahanStaf}
        renderDocument={(config) => (
          <TelaahanStafPdf
            spj={{
              kotaTandaTangan: "Sendawar",
              tglSuratTugas: getWitaToday(),
              noTelaahan: form.nomorTengah 
                ? `${form.nomorPrefix || ""}${form.nomorTengah}${form.nomorSuffix || ""}`
                : null
            }}
            telaahan={{
              kepada: data.kepada,
              sifat: data.sifat,
              lampiran: data.lampiran,
              perihal: form.perihal || spj.perihal,
              dasar: data.dasar,
              praAnggapan: data.praAnggapan,
              fakta: data.fakta,
              analisis: data.analisis,
              kesimpulan: data.kesimpulan,
              saran: data.saran,
              tglTelaahan: data.tanggal ? new Date(data.tanggal) : undefined
            }}
            roster={spj.roster || []}
            config={config}
            signer={getSignerData()}
          />
        )}
        fields={[
          { key: 'kepada', label: 'Kepada Yth', type: 'text' },
          { key: 'perihal', label: 'Perihal', type: 'text' },
          { key: 'dariOverride', label: 'Override Jabatan (Dari)', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'namaOverride', label: 'Override Nama', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'pangkatOverride', label: 'Override Pangkat', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'nipOverride', label: 'Override NIP', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'dasar', label: 'I. Dasar', type: 'textarea' },
          { key: 'analisis', label: 'IV. Analisis', type: 'textarea' },
          { key: 'kesimpulan', label: 'V. Kesimpulan', type: 'textarea' },
          { key: 'saran', label: 'VI. Saran/Tindakan', type: 'textarea' }
        ]}
      />
    </Card>
  );
}
