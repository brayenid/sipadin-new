"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, FileText, Check, ChevronsUpDown } from "lucide-react";
import { updateMetaDokumen } from "@/app/actions/dokumen";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import DaftarTandaTerimaPdf from "@/pdf/templates/DaftarTandaTerimaPdf";
import { toast } from "sonner";
import { formatWita } from "@/lib/date-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type TandaTerimaRow = {
  id: string;
  hargaSatuan: number;
  kuantitas: number;
  satuan: string;
  persenPph: number;
};

export default function DaftarTandaTerimaTab({ spj, pegawaiList }: { spj: any; pegawaiList: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
  const saved = meta.daftarTandaTerima || {};
  const narasumberList = meta.daftarHadirNarasumber?.narasumber || [];

  const [openKanan, setOpenKanan] = useState(false);

  const [form, setForm] = useState({
    bppId: saved.bppId || "",
    tanggalTandaTerima: saved.tanggalTandaTerima || "",
  });

  const kpaIdDaftarHadir = meta.daftarHadirNarasumber?.kpaId || "";
  const pptkIdDaftarHadir = meta.daftarHadirNarasumber?.pptkId || "";
  
  const kpa = pegawaiList.find((p) => p.id === kpaIdDaftarHadir);
  const pptk = pegawaiList.find((p) => p.id === pptkIdDaftarHadir);
  const bpp = pegawaiList.find((p) => p.id === form.bppId);

  const [tandaTerimaData, setTandaTerimaData] = useState<Record<string, TandaTerimaRow>>(
    saved.tandaTerimaData || saved.data || {}
  );

  useEffect(() => {
    const newData = { ...tandaTerimaData };
    let hasChanges = false;
    narasumberList.forEach((n: any, idx: number) => {
      const rowId = n.id || `row-${idx}`;
      if (!newData[rowId]) {
        newData[rowId] = {
          id: rowId,
          hargaSatuan: 900000,
          kuantitas: 0,
          satuan: "Jam",
          persenPph: 5,
        };
        hasChanges = true;
      }
    });
    if (hasChanges) {
      setTandaTerimaData(newData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narasumberList]);

  const updateRow = (id: string, field: keyof TandaTerimaRow, val: any) => {
    setTandaTerimaData({
      ...tandaTerimaData,
      [id]: { ...tandaTerimaData[id], [field]: val },
    });
  };
  const handleSave = async () => {
    setLoading(true);
    try {
      const totalHonor = combinedData.reduce((sum, item) => sum + item.jumlah, 0);
      let totalDopd = 0;
      if (spj.metaDokumen?.dopdHonorarium?.items) {
        totalDopd = spj.metaDokumen.dopdHonorarium.items.reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0);
      }
      const totalPengajuan = totalHonor + totalDopd;

      await updateMetaDokumen(spj.id, "daftarTandaTerima", {
        bppId: form.bppId,
        tanggalTandaTerima: form.tanggalTandaTerima,
        tandaTerimaData,
      }, totalPengajuan);

      toast.success("Daftar Tanda Terima berhasil disimpan.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data.");
    } finally {
      setLoading(false);
    }
  };
  const tanggalLabel = spj.tanggalPelaksanaan
    ? formatWita(spj.tanggalPelaksanaan, "dd MMMM yyyy")
    : "";

  const kegiatanLabel = spj.perihal
    ? spj.perihal.toUpperCase() + (spj.tanggalPelaksanaan ? " TANGGAL " + tanggalLabel.toUpperCase() : "")
    : "";

  const combinedData = narasumberList.map((n: any, idx: number) => {
    const rowId = n.id || `row-${idx}`;
    const td = tandaTerimaData[rowId] || { hargaSatuan: 0, kuantitas: 0, satuan: "", persenPph: 0 };
    const jumlah = td.hargaSatuan * td.kuantitas;
    const pph = (jumlah * td.persenPph) / 100;
    const bersih = jumlah - pph;
    return {
      ...n,
      id: rowId,
      ...td,
      kegiatan: kegiatanLabel,
      jumlah,
      pph,
      bersih,
    };
  });

  return (
    <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Daftar Tanda Terima Honorarium</CardTitle>
          <CardDescription>
            Penerbitan daftar tanda terima narasumber dalam rangka {spj.perihal || "—"}.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">

        {/* SECTION: INFORMASI DOKUMEN & PENANDATANGAN */}
        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
          <div>
            <p className="text-sm font-semibold text-slate-800">Informasi Dokumen & Bendahara</p>
            <p className="text-xs text-slate-500 mt-0.5">KPA dan PPTK otomatis disamakan dengan Daftar Hadir Narasumber.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            <div className="space-y-3">
              <Label>Tanggal Tanda Terima</Label>
              <Input 
                type="date"
                value={form.tanggalTandaTerima}
                onChange={(e) => setForm({ ...form, tanggalTandaTerima: e.target.value })}
                className="bg-white"
              />
              <p className="text-xs text-slate-500">Tanggal akan dikosongkan pada PDF (space kosong) dan hanya mencetak bulan serta tahunnya saja untuk diisi manual (tulis tangan).</p>
            </div>

            <div className="space-y-3">
              <Label>Bendahara Pengeluaran Pembantu (BPP)</Label>
              <Popover open={openKanan} onOpenChange={setOpenKanan}>
                <PopoverTrigger>
                  <div
                    role="combobox"
                    aria-expanded={openKanan}
                    className="w-full justify-between bg-white font-normal flex items-center h-9 px-4 py-2 border border-slate-200/60 rounded-md text-sm cursor-pointer hover:bg-slate-50"
                  >
                    {form.bppId ? bpp?.nama || "Pilih..." : "Cari BPP..."}
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
                              setForm({ ...form, bppId: p.id });
                              setOpenKanan(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.bppId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nama}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {bpp && (
                <div className="mt-2 text-xs text-slate-500">
                  Akan ditandatangani oleh: <span className="font-bold text-slate-900">{bpp.nama}</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* SECTION: RINCIAN NOMINAL */}
        <div>
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-800">Rincian Nominal</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Data nama narasumber diambil dari Daftar Hadir Narasumber. Silakan lengkapi angka-angkanya.
            </p>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-8">No</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 min-w-[150px]">Nama</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-[150px]">Harga Satuan (Rp)</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-[80px]">Kuantitas</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-[100px]">Satuan</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600 w-[80px]">PPh (%)</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600 w-[120px]">Bersih (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {narasumberList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Belum ada narasumber di Daftar Hadir Narasumber.
                    </td>
                  </tr>
                ) : (
                  combinedData.map((row, idx) => (
                    <tr key={row.id || `row-${idx}`} className="border-b last:border-0">
                      <td className="px-3 py-2 text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.nama}</td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          value={tandaTerimaData[row.id]?.hargaSatuan === 0 ? "" : new Intl.NumberFormat('id-ID').format(tandaTerimaData[row.id]?.hargaSatuan || 0)}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/\D/g, "");
                            updateRow(row.id, "hargaSatuan", Number(rawValue));
                          }}
                          className="h-8 text-sm text-right"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={tandaTerimaData[row.id]?.kuantitas || 0}
                          onChange={(e) => updateRow(row.id, "kuantitas", Number(e.target.value))}
                          className="h-8 text-sm text-center"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          value={tandaTerimaData[row.id]?.satuan || ""}
                          onChange={(e) => updateRow(row.id, "satuan", e.target.value)}
                          className="h-8 text-sm text-center"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          value={tandaTerimaData[row.id]?.persenPph || 0}
                          onChange={(e) => updateRow(row.id, "persenPph", Number(e.target.value))}
                          className="h-8 text-sm text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                        {new Intl.NumberFormat('id-ID').format(row.bersih)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setShowPreview(true)} disabled={narasumberList.length === 0}>
            <FileText className="w-4 h-4 mr-2" />
            Preview PDF
          </Button>
          <Button onClick={handleSave} disabled={loading || narasumberList.length === 0}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Tanda Terima
          </Button>
        </div>
      </CardContent>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Daftar Tanda Terima"
        spjId={spj.id}
        docKey="daftarTandaTerimaPdf"
        fields={[]}
        renderDocument={(config) => {
          const spjData = {
            perihal: spj.perihal || "",
            tanggalLabel: tanggalLabel,
            tanggalTandaTerima: form.tanggalTandaTerima,
            kpa: kpa
              ? {
                  jabatanLabel: "Mengetahui :\nKuasa Pengguna Anggaran,\nKepala Bagian Organisasi",
                  nama: kpa.nama,
                  nip: kpa.nip || null,
                }
              : null,
            pptk: pptk
              ? {
                  jabatanLabel: "Pejabat Pelaksana Teknis Kegiatan",
                  nama: pptk.nama,
                  nip: pptk.nip || null,
                }
              : null,
            bpp: bpp
              ? {
                  jabatanLabel: "Bendahara Pengeluaran Pembantu",
                  nama: bpp.nama,
                  nip: bpp.nip || null,
                }
              : null,
          };

          return (
            <DaftarTandaTerimaPdf
              spj={spjData}
              narasumber={combinedData}
              layout={config.styles}
            />
          );
        }}
      />
    </Card>
  );
}
