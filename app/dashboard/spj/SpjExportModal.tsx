"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2 } from "lucide-react";
import { getSpjForExport } from "@/app/actions/spj";
import { toast } from "sonner";

export default function SpjExportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [jenisSpj, setJenisSpj] = useState("SEMUA");

  const [columns, setColumns] = useState({
    tujuan: true,
    tglBerangkat: true,
    tglKembali: true,
    namaPersonel: true,
    jenisSpj: true, // "Status Berangkat" or Jenis
    totalBiaya: false,
    statusPencairan: false, // Terbayar
    buktiDukung: false, // Dummy for now
    nomorRekening: false, // Kode Rekening
    subKegiatan: false,
  });

  const handleCheckboxChange = (key: keyof typeof columns) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    // Both dates must be filled OR both must be empty
    if ((startDate && !endDate) || (!startDate && endDate)) {
      toast.error("Harap isi kedua tanggal (Dari dan Sampai), atau kosongkan keduanya untuk mengekspor semua data.");
      return;
    }

    setLoading(true);
    try {
      const data = await getSpjForExport(startDate || null, endDate || null, jenisSpj);
      
      if (data.length === 0) {
        toast.error("Tidak ada data SPJ pada rentang tanggal tersebut.");
        setLoading(false);
        return;
      }

      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(new Date(date));
      };

      const formatRupiah = (val: bigint) => {
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(Number(val));
      };

      const exportData = data.map((spj: any) => {
        const row: any = {};
        
        if (columns.tujuan) {
          row["Tujuan"] = spj.perjadinDetail?.tempatTujuan || "-";
        }
        if (columns.tglBerangkat) {
          row["Tanggal Berangkat"] = spj.perjadinDetail?.tglBerangkat ? formatDate(spj.perjadinDetail.tglBerangkat) : formatDate(spj.tanggalSpj);
        }
        if (columns.tglKembali) {
          row["Tanggal Kembali"] = spj.perjadinDetail?.tglKembali ? formatDate(spj.perjadinDetail.tglKembali) : "-";
        }
        if (columns.namaPersonel) {
          row["Nama Personel"] = spj.roster && spj.roster.length > 0 ? spj.roster.map((r: any) => r.nama.split(" ")[0]).join(", ") : "-";
        }
        if (columns.jenisSpj) {
          row["Jenis SPJ"] = spj.jenisSpj === 'PERJADIN' ? 'Perjalanan Dinas' : spj.jenisSpj === 'MAMIN' ? 'Makan Minum' : spj.jenisSpj;
        }
        if (columns.totalBiaya) {
          row["Total Biaya"] = formatRupiah(spj.totalPengeluaran);
        }
        if (columns.statusPencairan) {
          row["Status Pencairan"] = spj.terbayar ? "Sudah Cair" : "Belum Cair";
        }
        if (columns.buktiDukung) {
          row["Link Drive"] = spj.driveUrl || "-";
        }
        if (columns.nomorRekening) {
          row["Nomor Rekening"] = spj.kodeRekening?.kodeRekening || "-";
        }
        if (columns.subKegiatan) {
          row["Sub Kegiatan"] = spj.kodeRekening?.subKegiatan?.judulSub || "-";
        }

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data SPJ");

      const typeName = jenisSpj === 'SEMUA' ? '' : `_${jenisSpj}`;
      const filenameDate = startDate && endDate ? `${startDate}_sd_${endDate}` : 'Semua_Waktu';
      XLSX.writeFile(workbook, `Ekspor_SPJ${typeName}_${filenameDate}.xlsx`);
      toast.success("Berhasil mengekspor data SPJ!");
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengekspor data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" className="bg-white"><Download className="w-4 h-4 mr-2" /> Ekspor Data</Button>}>
        <Download className="w-4 h-4 mr-2" /> Ekspor Data
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" /> Konfigurasi Ekspor
          </DialogTitle>
          <DialogDescription>
            Pilih rentang tanggal pembuatan SPJ (kosongkan untuk mengekspor semua data) dan kolom yang ingin Anda sertakan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jenis SPJ</Label>
          <Select value={jenisSpj} onValueChange={(val) => { if (val) setJenisSpj(val); }}>
            <SelectTrigger className="w-full h-10 border-slate-200">
              <SelectValue placeholder="Pilih Jenis SPJ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Jenis</SelectItem>
              <SelectItem value="PERJADIN">Perjalanan Dinas (Perjadin)</SelectItem>
              <SelectItem value="MAMIN">Makan Minum</SelectItem>
              <SelectItem value="HONORARIUM">Honorarium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dari Tanggal</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="h-10 border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sampai Tanggal</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="h-10 border-slate-200"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Kolom Data</Label>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
            {Object.entries(columns).map(([key, value]) => {
              // Format camelCase to Title Case
              const title = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .replace("Tgl", "Tanggal")
                .replace("Spj", "SPJ");
              
              return (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`col-${key}`} 
                    checked={value} 
                    onCheckedChange={() => handleCheckboxChange(key as keyof typeof columns)}
                  />
                  <label 
                    htmlFor={`col-${key}`} 
                    className="text-sm font-medium text-slate-700 leading-none cursor-pointer"
                  >
                    {title}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t mt-4">
          <Button onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            MULAI EKSPOR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
