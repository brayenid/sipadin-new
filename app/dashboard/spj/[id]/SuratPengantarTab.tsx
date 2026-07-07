"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Check, ChevronsUpDown } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import SuratPengantarPdf from "@/pdf/templates/SuratPengantarPdf";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { formatWita } from "@/lib/date-utils";

export default function SuratPengantarTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.suratPengantar || {};

  const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][new Date().getMonth()];
  const defaultSuffix = `/ Org / ${romawi} / ${new Date().getFullYear()}`;

  const [form, setForm] = useState({
    penandatanganId: data.penandatanganId || "",
    nomorPrefix: data.nomorPrefix ?? "027 /",
    nomorTengah: data.nomorTengah ?? "",
    nomorSuffix: data.nomorSuffix ?? defaultSuffix,
    tanggalSurat: data.tanggalSurat || "",
    tanggalPenerima: data.tanggalPenerima || "",
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
      await updateMetaDokumen(spj.id, "suratPengantar", form);
      toast.success("Surat Pengantar berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const selectedPegawai = pegawaiList.find((p) => p.id === form.penandatanganId);

  return (
    <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Surat Pengantar Permintaan Barang</CardTitle>
          <CardDescription>Penerbitan Surat Pengantar untuk SPJ Makan Minum.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* BAGIAN PENANDATANGAN */}
        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
          <div className="space-y-3">
            <Label>Pejabat Pelaksana Teknis Kegiatan (PPTK)</Label>
            
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger>
                <div
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full max-w-md justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                >
                  {form.penandatanganId
                    ? pegawaiList.find((p) => p.id === form.penandatanganId)?.nama
                    : "Cari PPTK..."}
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
              <div className="mt-2 text-sm text-slate-500">
                Akan ditandatangani oleh: <span className="font-bold text-slate-900">{selectedPegawai.nama}</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BAGIAN NOMOR SURAT */}
          <div className="space-y-2">
            <Label>Nomor Surat Pengantar</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center" 
                placeholder="027 /"
              />
              <Input 
                name="nomorTengah" 
                value={form.nomorTengah} 
                onChange={handleChange} 
                className="rounded-none font-bold text-center flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400"
                placeholder="2199"
              />
              <Input 
                name="nomorSuffix" 
                value={form.nomorSuffix} 
                onChange={handleChange} 
                className="w-1/3 rounded-l-none border-l-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-xs" 
                placeholder={defaultSuffix}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Kosongkan bagian tengah untuk memberi ruang (space kosong) pada cetakan PDF agar dapat ditulis tangan.</p>
          </div>

          {/* BAGIAN TANGGAL SURAT DAN PENERIMA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Surat</Label>
              <Input 
                type="date" 
                name="tanggalSurat" 
                value={form.tanggalSurat} 
                onChange={handleChange} 
              />
              <p className="text-xs text-slate-500 mt-1">Tgl penetapan. Kosongkan jika ingin tulis tangan.</p>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Penerima</Label>
              <Input 
                type="date" 
                name="tanggalPenerima" 
                value={form.tanggalPenerima} 
                onChange={handleChange} 
              />
              <p className="text-xs text-slate-500 mt-1">Tgl tanda tangan penerima.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={loading} className="md:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Surat Pengantar
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Surat Pengantar Permintaan Barang"
        spjId={spj.id}
        docKey="suratPengantarPdf"
        fields={[
          { key: 'bagianOrganisasiOverride', label: 'Teks Bagian Organisasi', type: 'text', placeholder: 'Ketik untuk override default...' },
          { key: 'keteranganOverride', label: 'Teks Keterangan (Semua Item)', type: 'textarea', placeholder: 'Ketik ulang keterangan di sini untuk override Perihal SPJ...' }
        ]}
        renderDocument={(config) => {
          const defaultKeterangan = config.content?.keteranganOverride || 
            (spj.tanggalPelaksanaan && spj.perihal 
              ? `${spj.perihal} pada ${formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy')}` 
              : spj.perihal) || "";
          
          const itemsData = (spj.pengeluaranDetails || []).map((d: any, i: number) => ({
            no: i + 1,
            jenisBarang: d.uraian || "",
            qty: Number(d.qty || 1),
            satuan: d.satuan || "",
            keterangan: defaultKeterangan
          }));

          const spjData = {
            nomorSurat: `${form.nomorPrefix}${form.nomorTengah ? form.nomorTengah : '               '}${form.nomorSuffix}`,
            tanggalSurat: form.tanggalSurat ? formatWita(form.tanggalSurat, 'dd MMMM yyyy') : null,
            tanggalPenerima: form.tanggalPenerima ? formatWita(form.tanggalPenerima, 'dd MMMM yyyy') : null,
            vendorNama: spj.maminDetail?.vendor?.namaVendor || "",
            vendorPemilik: spj.maminDetail?.vendor?.namaPemilik || "",
            bagianOrganisasiLabel: config.content?.bagianOrganisasiOverride || "BAGIAN ORGANISASI PEMERINTAH KABUPATEN KUTAI BARAT"
          };

          return (
            <SuratPengantarPdf 
              spj={spjData} 
              items={itemsData} 
              pptk={selectedPegawai ? { nama: selectedPegawai.nama, nip: selectedPegawai.nip } : null} 
              layout={config.styles}
            />
          );
        }}
      />
    </Card>
  );
}
