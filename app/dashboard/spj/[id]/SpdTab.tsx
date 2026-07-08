"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import SpdPdf from "@/pdf/templates/SpdPdf";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, getDefaultNomorSuffix } from "@/lib/utils";

export default function SpdTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.spd || {};

  const [form, setForm] = useState({
    penandatanganId: data.penandatanganId || "",
    nomorPrefix: data.nomorPrefix ?? "000.1.2.3/",
    nomorTengah: data.nomorTengah ?? "",
    nomorSuffix: data.nomorSuffix ?? getDefaultNomorSuffix(),
    tanggalSpd: data.tanggalSpd || "",
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
      await updateMetaDokumen(spj.id, "spd", form);
      toast.success("Surat Perjalanan Dinas (SPD) berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPegawai = pegawaiList?.find((p) => p.id === form.penandatanganId);

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <div>
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Surat Perjalanan Dinas (SPD)</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Dokumen resmi perjalanan dinas yang disahkan oleh PPK.</CardDescription>
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
                    ? pegawaiList?.find((p) => p.id === form.penandatanganId)?.nama
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
                      {pegawaiList?.map((p) => (
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
          {/* BAGIAN NOMOR SPD */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm">Nomor Surat Perjalanan Dinas</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center" 
                placeholder="000.1.2.3/"
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
            <Label className="text-xs sm:text-sm">Tanggal Dikeluarkan</Label>
            <Input 
              type="date" 
              name="tanggalSpd" 
              value={form.tanggalSpd} 
              onChange={handleChange} 
            />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Tanggal penetapan/penandatanganan SPD.</p>
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
                  <span className="text-[10px] sm:text-xs text-slate-400 ml-1.5 sm:ml-2">({r.role === 'KEPALA_JALAN' ? 'Kepala' : 'Pengikut'})</span>
                </div>
              ))
            ) : (
              <p className="text-[10px] sm:text-sm text-slate-400 italic">Belum ada personel yang ditambahkan di SPJ ini.</p>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">Untuk menambah, menghapus, atau mengatur urutan pengikut, silakan menuju tab <strong>Personel</strong>.</p>
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
        title="Pratinjau SPD"
        spjId={spj.id}
        docKey="spdPdf"
        fields={[
          { key: 'overrideMaksud', label: 'Maksud Perjalanan Dinas', type: 'textarea', placeholder: 'Ketik ulang maksud perjalanan...' },
          { key: 'overrideAlatAngkut', label: 'Alat Angkut', type: 'text', placeholder: 'Contoh: Pesawat Udara / Darat' },
          { key: 'overrideTempatBerangkat', label: 'Tempat Berangkat', type: 'text', placeholder: 'Contoh: Sendawar' },
          { key: 'overrideTujuan', label: 'Tempat Tujuan', type: 'text', placeholder: 'Contoh: Samarinda' },
          { key: 'overrideLamaText', label: 'Lamanya (Custom)', type: 'text', placeholder: 'Contoh: 2 (dua) hari...' },
          { key: 'overrideTingkatBiaya', label: 'Tingkat Biaya Perjalanan', type: 'text', placeholder: 'Contoh: C' },
          { key: 'overrideBebanAnggaran', label: 'Instansi Pembebanan Anggaran', type: 'text', placeholder: 'Contoh: DPA Sekretariat Daerah...' },
          { key: 'overrideAkunPembebanan', label: 'Akun Pembebanan Anggaran', type: 'text', placeholder: 'Contoh: 5.1.02.04.01.0001' },
          { key: 'overrideKeteranganLain', label: 'Keterangan Lain-lain', type: 'textarea', placeholder: 'Setibanya ditempat yang dituju...' },
        ]}
        renderDocument={(config) => {
          // Construct Spj object
          const diffTime = spj.perjadinDetail?.tglBerangkat && spj.perjadinDetail?.tglKembali 
            ? Math.abs(new Date(spj.perjadinDetail.tglKembali).getTime() - new Date(spj.perjadinDetail.tglBerangkat).getTime()) 
            : 0;
          const lamaPerjalanan = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 : 1;

          const spjData = {
            noSpd: `${form.nomorPrefix}${form.nomorTengah ? form.nomorTengah : '           '}${form.nomorSuffix}`,
            tglSpd: form.tanggalSpd ? new Date(form.tanggalSpd) : null,
            kotaTandaTangan: "Sendawar",
            tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || "Sendawar",
            tempatTujuan: config.content?.overrideTujuan || spj.perjadinDetail?.tempatTujuan || "-",
            maksudDinas: config.content?.overrideMaksud || spj.perihal || "-",
            alatAngkut: spj.perjadinDetail?.alatAngkut || "-",
            lamaPerjalanan: spj.perjadinDetail?.lamaPerjalanan || lamaPerjalanan,
            tglBerangkat: spj.perjadinDetail?.tglBerangkat || null,
            tglKembali: spj.perjadinDetail?.tglKembali || null,
            akunAnggaran: config.content?.overrideBebanAnggaran || "DPA SKPD Bagian Organisasi",
            overrideLamaText: config.content?.overrideLamaText,
            overrideAlatAngkut: config.content?.overrideAlatAngkut,
            overrideTempatBerangkat: config.content?.overrideTempatBerangkat,
            overrideTingkatBiaya: config.content?.overrideTingkatBiaya,
            overrideInstansiPembebanan: config.content?.overrideBebanAnggaran,
            overrideAkunPembebanan: config.content?.overrideAkunPembebanan,
            overrideKeteranganLain: config.content?.overrideKeteranganLain,
          };

          const signerData = {
            nama: selectedPegawai?.nama || "-",
            nip: selectedPegawai?.nip || "-",
            jabatan: selectedPegawai?.jabatan || "-",
            pangkat: selectedPegawai?.pangkat || "-",
            golongan: selectedPegawai?.golongan || "-",
            instansi: "Sekretariat Daerah Kabupaten Kutai Barat",
            jabatanTampil: selectedPegawai?.jabatan || "-"
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
            <SpdPdf 
              spj={spjData} 
              roster={rosterData}
              signer={signerData}
            />
          );
        }}
      />
    </Card>
  );
}
