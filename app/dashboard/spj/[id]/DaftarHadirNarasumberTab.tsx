"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { updateMetaDokumen } from "@/lib/actions-client";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import DaftarHadirNarasumberPdf from "@/pdf/templates/DaftarHadirNarasumberPdf";
import { toast } from "sonner";
import { formatWita } from "@/lib/date-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type NarasumberRow = {
  id: string;
  nama: string;
  jabatanSebagai: string;
};

export default function DaftarHadirNarasumberTab({ spj, pegawaiList }: { spj: any; pegawaiList: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const saved = meta.daftarHadirNarasumber || {};

  const [openKiri, setOpenKiri] = useState(false);
  const [openKanan, setOpenKanan] = useState(false);

  const [form, setForm] = useState({
    kpaId: saved.kpaId || "",
    pptkId: saved.pptkId || "",
  });

  const [narasumber, setNarasumber] = useState<NarasumberRow[]>(
    saved.narasumber?.length > 0
      ? saved.narasumber.map((n: any) => ({ ...n, id: n.id || `row-${Math.random()}` }))
      : [{ id: `row-1`, nama: "", jabatanSebagai: "" }]
  );

  const kpa = pegawaiList.find((p) => p.id === form.kpaId);
  const pptk = pegawaiList.find((p) => p.id === form.pptkId);

  const addRow = () => {
    setNarasumber([...narasumber, { id: `row-${Date.now()}`, nama: "", jabatanSebagai: "" }]);
  };

  const updateRow = (idx: number, field: keyof NarasumberRow, val: string) => {
    const next = [...narasumber];
    next[idx] = { ...next[idx], [field]: val };
    setNarasumber(next);
  };

  const removeRow = (idx: number) => {
    setNarasumber(narasumber.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMetaDokumen(spj.id, "daftarHadirNarasumber", {
        ...form,
        narasumber: narasumber.map(({ id, ...rest }) => rest),
      });
      toast.success("Daftar Hadir Narasumber berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  const tanggalLabel = spj.tanggalPelaksanaan
    ? formatWita(spj.tanggalPelaksanaan, "dd MMMM yyyy")
    : "";

  // Kegiatan digenerate otomatis dari perihal + tanggal pelaksanaan SPJ
  const kegiatanLabel = spj.perihal
    ? spj.perihal.toUpperCase() + (spj.tanggalPelaksanaan ? " TANGGAL " + tanggalLabel.toUpperCase() : "")
    : "";

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
        <div>
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Daftar Hadir Narasumber</CardTitle>
          <CardDescription className="text-[10px] sm:text-sm mt-0.5 sm:mt-1">
            Penerbitan daftar hadir narasumber dalam rangka {spj.perihal || "—"}.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-6 sm:space-y-8">

        {/* SECTION: PENANDATANGAN */}
        <div className="space-y-4 border p-3 sm:p-4 rounded-lg bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

            {/* KPA (Kiri) */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-[10px] sm:text-sm">Kuasa Pengguna Anggaran (KPA)</Label>
              <Popover open={openKiri} onOpenChange={setOpenKiri}>
                <PopoverTrigger>
                  <div
                    role="combobox"
                    aria-expanded={openKiri}
                    className="w-full max-w-md justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                  >
                    {form.kpaId ? kpa?.nama || "Pilih..." : "Cari KPA..."}
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
                              setForm({ ...form, kpaId: p.id });
                              setOpenKiri(false);
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
              {kpa && (
                <div className="mt-2 text-[10px] sm:text-sm text-slate-500">
                  Akan ditandatangani oleh: <span className="font-bold text-slate-900">{kpa.nama}</span>
                </div>
              )}
            </div>

            {/* PPTK (Kanan) */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-[10px] sm:text-sm">Pejabat Pelaksana Teknis Kegiatan (PPTK)</Label>
              <Popover open={openKanan} onOpenChange={setOpenKanan}>
                <PopoverTrigger>
                  <div
                    role="combobox"
                    aria-expanded={openKanan}
                    className="w-full max-w-md justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                  >
                    {form.pptkId ? pptk?.nama || "Pilih..." : "Cari PPTK..."}
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
                              setForm({ ...form, pptkId: p.id });
                              setOpenKanan(false);
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
              {pptk && (
                <div className="mt-2 text-[10px] sm:text-sm text-slate-500">
                  Akan ditandatangani oleh: <span className="font-bold text-slate-900">{pptk.nama}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION: DAFTAR NARASUMBER */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Daftar Narasumber</p>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Kolom kegiatan akan otomatis mengikuti perihal SPJ
                {tanggalLabel ? ` tanggal ${tanggalLabel}` : ""}.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addRow} className="w-full sm:w-auto h-8 text-[10px] sm:text-xs">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /> Tambah Baris
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-2 sm:px-3 py-2 font-medium text-slate-600 w-8 sm:w-10">No</th>
                  <th className="text-left px-2 sm:px-3 py-2 font-medium text-slate-600 w-[40%]">Nama</th>
                  <th className="text-left px-2 sm:px-3 py-2 font-medium text-slate-600">Jabatan Sebagai</th>
                  <th className="w-8 sm:w-10"></th>
                </tr>
              </thead>
              <tbody>
                {narasumber.map((row, idx) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-2 sm:px-3 py-2 text-slate-500 text-center">{idx + 1}</td>
                    <td className="px-1.5 sm:px-2 py-1.5">
                      <Input
                        value={row.nama}
                        onChange={(e) => updateRow(idx, "nama", e.target.value)}
                        placeholder="Nama narasumber"
                        className="h-7 sm:h-8 text-[10px] sm:text-sm px-2"
                      />
                    </td>
                    <td className="px-1.5 sm:px-2 py-1.5">
                      <Input
                        value={row.jabatanSebagai}
                        onChange={(e) => updateRow(idx, "jabatanSebagai", e.target.value)}
                        placeholder="Jabatan"
                        className="h-7 sm:h-8 text-[10px] sm:text-sm px-2"
                      />
                    </td>
                    <td className="px-1.5 sm:px-2 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {narasumber.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 sm:py-8 text-[10px] sm:text-sm text-slate-400">
                      Belum ada narasumber. Klik "Tambah Baris" untuk memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIONS */}
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
        title="Pratinjau Daftar Hadir Narasumber"
        spjId={spj.id}
        docKey="daftarHadirNarasumberPdf"
        fields={[]}
        renderDocument={(config) => {
          const spjData = {
            perihal: spj.perihal || "",
            tanggalLabel: tanggalLabel,
            pejabatKiri: kpa
              ? {
                  jabatanLabel: "Mengetahui :\nKuasa Pengguna Anggaran,\nKepala Bagian Organisasi",
                  nama: kpa.nama,
                  nip: kpa.nip || null,
                }
              : null,
            pejabatKanan: pptk
              ? {
                  jabatanLabel: "Pejabat Pelaksana Teknis Kegiatan",
                  nama: pptk.nama,
                  nip: pptk.nip || null,
                }
              : null,
          };

          return (
            <DaftarHadirNarasumberPdf
              spj={spjData}
              narasumber={narasumber.map(({ id, ...rest }) => ({
                ...rest,
                kegiatan: kegiatanLabel,
              }))}
              layout={config.styles}
            />
          );
        }}
      />
    </Card>
  );
}
