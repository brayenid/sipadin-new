"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Check, ChevronsUpDown } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import BapbPdf from "@/pdf/templates/BapbPdf";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { formatWita } from "@/lib/date-utils";

export default function BapbTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.bapb || {};

  const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][new Date().getMonth()];
  const defaultSuffix = `/ Org / ${romawi} / ${new Date().getFullYear()}`;

  const [form, setForm] = useState({
    kpaId: data.kpaId || spj.metaDokumen?.dopd?.kpaId || "",
    pptkId: data.pptkId || spj.metaDokumen?.suratPengantar?.penandatanganId || "",
    nomorPrefix: data.nomorPrefix ?? "0003 /",
    nomorTengah: data.nomorTengah ?? "",
    nomorSuffix: data.nomorSuffix ?? defaultSuffix,
    tanggalBapb: data.tanggalBapb || "",
    nomorSpb: data.nomorSpb || "",
    tanggalSpb: data.tanggalSpb || ""
  });

  const [openKpa, setOpenKpa] = useState(false);
  const [openPptk, setOpenPptk] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "bapb", form);
      toast.success("Berita Acara Pemeriksaan Barang berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const kpa = pegawaiList.find((p) => p.id === form.kpaId);
  const pptk = pegawaiList.find((p) => p.id === form.pptkId);

  return (
    <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Berita Acara Pemeriksaan Barang</CardTitle>
          <CardDescription>Penerbitan BAPB untuk SPJ Makan Minum.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* PEJABAT PEMERIKSA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border rounded-lg">
          <div className="md:col-span-2">
            <p className="font-semibold text-sm mb-2 text-slate-800">Pejabat Pemeriksa</p>
          </div>
          
          <div className="space-y-3">
            <Label>Kuasa Pengguna Anggaran (KPA)</Label>
            <Popover open={openKpa} onOpenChange={setOpenKpa}>
              <PopoverTrigger>
                <div
                  role="combobox"
                  aria-expanded={openKpa}
                  className="w-full justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                >
                  {form.kpaId ? kpa?.nama : "Cari KPA..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
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
                            setForm({ ...form, kpaId: p.id });
                            setOpenKpa(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", form.kpaId === p.id ? "opacity-100" : "opacity-0")} />
                          {p.nama}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <Label>Pejabat Pelaksana Teknis Kegiatan (PPTK)</Label>
            <Popover open={openPptk} onOpenChange={setOpenPptk}>
              <PopoverTrigger>
                <div
                  role="combobox"
                  aria-expanded={openPptk}
                  className="w-full justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                >
                  {form.pptkId ? pptk?.nama : "Cari PPTK..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
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
                            setForm({ ...form, pptkId: p.id });
                            setOpenPptk(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", form.pptkId === p.id ? "opacity-100" : "opacity-0")} />
                          {p.nama}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* BAGIAN NOMOR & TANGGAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Nomor BAPB</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center" 
                placeholder="0003 /"
              />
              <Input 
                name="nomorTengah" 
                value={form.nomorTengah} 
                onChange={handleChange} 
                className="rounded-none font-bold text-center flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400"
                placeholder="2415"
              />
              <Input 
                name="nomorSuffix" 
                value={form.nomorSuffix} 
                onChange={handleChange} 
                className="w-1/3 rounded-l-none border-l-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-xs" 
                placeholder={defaultSuffix}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Kosongkan bagian tengah untuk jeda tulis tangan.</p>
          </div>

          <div className="space-y-2">
            <Label>Tanggal BAPB</Label>
            <Input 
              type="date" 
              name="tanggalBapb" 
              value={form.tanggalBapb} 
              onChange={handleChange} 
            />
            <p className="text-xs text-slate-500 mt-1">Tanggal ini akan dikonversi ke format terbilang (huruf).</p>
          </div>
        </div>

        {/* REFERENSI SURAT PESANAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
          <div className="md:col-span-2">
            <p className="font-semibold text-sm mb-2 text-slate-800">Referensi Surat Pesanan Barang (SPB)</p>
          </div>
          <div className="space-y-2">
            <Label>Nomor Surat Pesanan</Label>
            <Input 
              name="nomorSpb" 
              value={form.nomorSpb} 
              onChange={handleChange} 
              placeholder="Contoh: 027 / 123 / ORG-TU.P / V / 2026"
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Surat Pesanan</Label>
            <Input 
              type="date" 
              name="tanggalSpb" 
              value={form.tanggalSpb} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={loading} className="md:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan BAPB
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Berita Acara Pemeriksaan Barang"
        spjId={spj.id}
        docKey="bapbPdf"
        fields={[
          { key: 'bagianOrganisasiOverride', label: 'Teks Bagian Organisasi', type: 'text', placeholder: 'Ketik untuk override default (Bagian Organisasi Setdakab Kutai Barat)' }
        ]}
        renderDocument={(config) => {
          const spjData = {
            nomorSurat: `${form.nomorPrefix}${form.nomorTengah ? form.nomorTengah : '               '}${form.nomorSuffix}`,
            tanggalBapb: form.tanggalBapb || null,
            nomorSpb: form.nomorSpb,
            tanggalSpbLabel: form.tanggalSpb ? formatWita(form.tanggalSpb, 'dd MMMM yyyy') : null,
            vendorNama: spj.maminDetail?.vendor?.namaVendor || "",
            vendorPemilik: spj.maminDetail?.vendor?.namaPemilik || "",
            bagianOrganisasiLabel: config.content?.bagianOrganisasiOverride || "Bagian Organisasi Setdakab Kutai Barat"
          };

          return (
            <BapbPdf 
              spj={spjData} 
              kpa={kpa ? { nama: kpa.nama, nip: kpa.nip, jabatan: "Kuasa Pengguna Anggaran" } : null}
              pptk={pptk ? { nama: pptk.nama, nip: pptk.nip, jabatan: "Pejabat Pelaksana Teknis Kegiatan" } : null} 
              layout={config.styles}
            />
          );
        }}
      />
    </Card>
  );
}
