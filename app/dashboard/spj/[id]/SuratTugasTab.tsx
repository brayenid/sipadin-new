"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, FileText } from "lucide-react";
import { updateMetaDokumen } from "@/lib/actions-client";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import SuratTugasPdf from "@/pdf/templates/SuratTugasPdf";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, getDefaultNomorSuffix } from "@/lib/utils";

export default function SuratTugasTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.suratTugas || {};

  const [form, setForm] = useState({
    penandatanganId: data.penandatanganId || "",
    nomorPrefix: data.nomorPrefix ?? "800.1.11.1/",
    nomorTengah: data.nomorTengah ?? "",
    nomorSuffix: data.nomorSuffix ?? getDefaultNomorSuffix(),
    tanggalSurat: data.tanggalSurat || "",
  });

  const [openCombobox, setOpenCombobox] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectPenandatangan = (val: string) => {
    setForm({ ...form, penandatanganId: val });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "suratTugas", form);
      toast.success("Surat Tugas berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPegawai = pegawaiList.find((p) => p.id === form.penandatanganId);

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <div>
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Surat Tugas</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Penerbitan Surat Tugas Perjalanan Dinas dan Pengelolaan Otoritas.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6 sm:space-y-8">
        
        {/* BAGIAN PENANDATANGAN (DIAMBIL DARI DATABASE) */}
        <div className="space-y-4 border p-3 sm:p-4 rounded-lg bg-slate-50">
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm">Pejabat Penandatangan</Label>
            
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger>
                <div
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full max-w-md justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                >
                  {form.penandatanganId
                    ? pegawaiList.find((p) => p.id === form.penandatanganId)?.nama
                    : "Cari Pejabat Penandatangan..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-full max-w-md p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari nama pegawai..." />
                  <CommandList>
                    <CommandEmpty>Pegawai tidak ditemukan.</CommandEmpty>
                    <CommandGroup>
                      {pegawaiList.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.nama}
                          onSelect={() => {
                            handleSelectPenandatangan(p.id);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.penandatanganId === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {p.nama}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedPegawai && (
              <div className="mt-2 text-[10px] sm:text-sm text-slate-500">
                Akan ditandatangani oleh: <span className="font-bold text-slate-900">{selectedPegawai.nama}</span> ({selectedPegawai.jabatan})
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* BAGIAN NOMOR SURAT TUGAS */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Nomor Surat Tugas</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center" 
                placeholder="800.1.11.1/"
              />
              <Input 
                name="nomorTengah" 
                value={form.nomorTengah} 
                onChange={handleChange} 
                className="rounded-none font-bold text-center flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400"
                placeholder="Contoh: 123"
              />
              <Input 
                name="nomorSuffix" 
                value={form.nomorSuffix} 
                onChange={handleChange} 
                className="w-1/3 rounded-l-none border-l-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-xs" 
                placeholder={getDefaultNomorSuffix()}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Isi prefix, nomor urut, dan suffix surat. Kosongkan urut jika belum terbit.</p>
          </div>

          {/* BAGIAN TANGGAL SURAT */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Tanggal Surat</Label>
            <Input 
              type="date" 
              name="tanggalSurat" 
              value={form.tanggalSurat} 
              onChange={handleChange} 
            />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Tanggal penetapan Surat Tugas.</p>
          </div>
        </div>

        {/* BAGIAN DAFTAR PERSONEL (INFORMASIONAL) */}
        <div className="space-y-3 sm:space-y-4">
          <Label className="text-xs sm:text-sm">Personel yang Ditugaskan</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {spj.roster && spj.roster.length > 0 ? (
              spj.roster.map((r: any, idx: number) => (
                <div key={r.id} className="p-2 sm:p-3 bg-slate-50 border rounded-md text-[11px] sm:text-sm text-slate-700">
                  <span className="font-medium mr-1.5 sm:mr-2">{idx + 1}.</span> {r.nama}
                </div>
              ))
            ) : (
              <p className="text-[10px] sm:text-sm text-slate-400 italic">Belum ada personel yang ditambahkan di SPJ ini.</p>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Untuk menambah atau menghapus personel, silakan menuju tab <strong>Personel</strong>.</p>
        </div>

        {/* BAGIAN URAIAN TUGAS (DIHAPUS, DIGANTIKAN OLEH MASTER PERIHAL) */}

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
        title="Pratinjau Surat Tugas"
        spjId={spj.id}
        docKey="suratTugasPdf"
        fields={[
          { key: 'overrideUntuk', label: 'Teks "Untuk" / Maksud Perjalanan', type: 'textarea', placeholder: 'Ketik ulang maksud tugas di sini...' },
          { key: 'overrideTujuan', label: 'Teks "Tujuan"', type: 'text', placeholder: 'Contoh: Samarinda' },
          { key: 'overrideLamaText', label: 'Teks "Lamanya" (Custom)', type: 'text', placeholder: 'Contoh: 2 (dua) hari...' },
          { key: 'overrideBebanAnggaran', label: 'Teks "Beban Anggaran"', type: 'text', placeholder: 'Contoh: DPA Sekretariat Daerah...' }
        ]}
        renderDocument={(config) => {
          // Construct Spj object
          const diffTime = spj.perjadinDetail?.tglBerangkat && spj.perjadinDetail?.tglKembali 
            ? Math.abs(new Date(spj.perjadinDetail.tglKembali).getTime() - new Date(spj.perjadinDetail.tglBerangkat).getTime()) 
            : 0;
          const lamaPerjalanan = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 : 1;

          const spjData = {
            kotaTandaTangan: "Sendawar",
            tempatTujuan: config.content?.overrideTujuan || spj.perjadinDetail?.tempatTujuan || "-",
            tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || "Sendawar",
            alatAngkut: spj.perjadinDetail?.alatAngkut || "-",
            lamaPerjalanan: spj.perjadinDetail?.lamaPerjalanan || lamaPerjalanan,
            akunAnggaran: config.content?.overrideBebanAnggaran || "DPA SKPD Bagian Organisasi",
            tglBerangkat: spj.perjadinDetail?.tglBerangkat || null,
            tglKembali: spj.perjadinDetail?.tglKembali || null,
            tglSuratTugas: form.tanggalSurat ? new Date(form.tanggalSurat) : null,
            noSuratTugas: `${form.nomorPrefix}${form.nomorTengah ? form.nomorTengah : '           '}${form.nomorSuffix}`,
            overrideLamaText: config.content?.overrideLamaText
          };

          const suratTugasData = {
            untuk: config.content?.overrideUntuk || spj.perihal || "-",
            assignedRosterItemId: null,
            signerNama: selectedPegawai?.nama || "-",
            signerNip: selectedPegawai?.nip || "-",
            signerJabatan: selectedPegawai?.jabatan || "-",
            signerPangkatGolongan: (selectedPegawai?.pangkat || "") + (selectedPegawai?.golongan ? " (" + selectedPegawai.golongan + ")" : "")
          };

          const rosterData = (spj.roster || []).map((r: any) => ({
            id: r.id,
            nama: r.nama,
            nip: r.nip,
            jabatan: r.jabatan,
            pangkat: r.pangkat,
            golongan: r.golongan
          }));

          return (
            <SuratTugasPdf 
              spj={spjData} 
              suratTugas={suratTugasData} 
              roster={rosterData} 
            />
          );
        }}
      />
    </Card>
  );
}
