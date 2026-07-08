"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Check, ChevronsUpDown } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import BastbPdf from "@/pdf/templates/BastbPdf";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { formatWita } from "@/lib/date-utils";

export default function BastbTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const data = meta.bastb || {};

  const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][new Date().getMonth()];
  const defaultSuffix = `/ ORG-TU.P / ${romawi} / ${new Date().getFullYear()}`;

  const defaultPptk = data.pptkId || spj.metaDokumen?.bapb?.pptkId || spj.metaDokumen?.suratPengantar?.penandatanganId || "";

  const [form, setForm] = useState({
    pptkId: defaultPptk,
    nomorPrefix: data.nomorPrefix ?? "000.3.3 /",
    nomorTengah: data.nomorTengah ?? "",
    nomorSuffix: data.nomorSuffix ?? defaultSuffix,
    tanggalBastb: data.tanggalBastb || "",
  });

  const [openPptk, setOpenPptk] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "bastb", form);
      toast.success("Berita Acara Serah Terima Barang berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const pptk = pegawaiList.find((p) => p.id === form.pptkId);

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <div>
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Berita Acara Serah Terima Barang</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">Penerbitan BASTB untuk SPJ Makan Minum.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6 sm:space-y-8">
        
        {/* PEJABAT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-3 sm:p-4 bg-slate-50 border rounded-lg">
          <div className="md:col-span-2">
            <p className="font-semibold text-sm mb-0 sm:mb-2 text-slate-800">Pihak Kedua (PPTK)</p>
          </div>
          
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-[10px] sm:text-sm">Pejabat Pelaksana Teknis Kegiatan (PPTK)</Label>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] sm:text-sm">Nomor BASTB</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-[10px] sm:text-sm h-9" 
                placeholder="000.3.3 /"
              />
              <Input 
                name="nomorTengah" 
                value={form.nomorTengah} 
                onChange={handleChange} 
                className="rounded-none font-bold text-center flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400 text-[10px] sm:text-sm h-9"
                placeholder="2323"
              />
              <Input 
                name="nomorSuffix" 
                value={form.nomorSuffix} 
                onChange={handleChange} 
                className="w-1/3 rounded-l-none border-l-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-[8px] sm:text-xs h-9" 
                placeholder={defaultSuffix}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Kosongkan bagian tengah untuk jeda tulis tangan.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] sm:text-sm">Tanggal BASTB</Label>
            <Input 
              type="date" 
              name="tanggalBastb" 
              value={form.tanggalBastb} 
              onChange={handleChange} 
              className="h-9 text-[10px] sm:text-sm px-2"
            />
            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Tanggal ini akan dikonversi ke format terbilang (huruf) pada paragraf pembuka.</p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 sm:pt-4">
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
        title="Pratinjau Berita Acara Serah Terima Barang"
        spjId={spj.id}
        docKey="bastbPdf"
        fields={[
          { key: 'overrideKeterangan', label: 'Teks Keterangan (Pasal 2)', type: 'textarea', placeholder: 'Ketik ulang keterangan di sini untuk override Perihal SPJ...' }
        ]}
        renderDocument={(config) => {
          const defaultKeterangan = config.content?.overrideKeterangan || 
            (spj.tanggalPelaksanaan && spj.perihal 
              ? `Tanggal ${formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy')} ${spj.perihal}` 
              : (spj.perihal || ""));

          const spjData = {
            nomorSurat: `${form.nomorPrefix}${form.nomorTengah ? form.nomorTengah : '               '}${form.nomorSuffix}`,
            tanggalBastb: form.tanggalBastb || null,
          };

          const vendorData = {
            nama: spj.maminDetail?.vendor?.namaPemilik || "......................................",
            npwp: spj.maminDetail?.vendor?.npwp || "-",
            npwpd: spj.maminDetail?.vendor?.npwpd || "-",
            alamat: spj.maminDetail?.vendor?.alamat || "-",
            jabatan: `Pemilik ${spj.maminDetail?.vendor?.namaVendor || ""}`.trim()
          };
          
          const itemsData = (spj.pengeluaranDetails || []).map((d: any, i: number) => ({
            no: i + 1,
            jenisBarang: d.uraian || "",
            qty: Number(d.qty || 1),
            satuan: d.satuan || "",
            keterangan: defaultKeterangan
          }));

          return (
            <BastbPdf 
              spj={spjData} 
              vendor={vendorData}
              pptk={pptk ? { 
                nama: pptk.nama, 
                nip: pptk.nip, 
                jabatan: "Pejabat Pelaksana Teknis Kegiatan", 
                alamat: "Jl. Komplek Perkantoran Bupati Kutai Barat" 
              } : null}
              items={itemsData}
              layout={config.styles}
            />
          );
        }}
      />
    </Card>
  );
}
