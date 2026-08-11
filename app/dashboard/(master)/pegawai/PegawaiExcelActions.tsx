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
import { Download, Upload, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { importPegawaiExcel } from "@/app/actions/pegawai";
import { toast } from "sonner";

type Pegawai = {
  id: string;
  nip: string | null;
  nama: string;
  pangkat: string | null;
  golongan: string | null;
  jabatan: string;
  instansi: string | null;
  eselon: string | null;
};

export default function PegawaiExcelActions({ data }: { data: Pegawai[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // EXPORT EXCEL
  const handleExport = () => {
    if (data.length === 0) {
      toast.error("Tidak ada data untuk diexport");
      return;
    }

    const exportData = data.map((item) => ({
      NIP: item.nip || "",
      "Nama Lengkap": item.nama,
      Pangkat: item.pangkat || "",
      Golongan: item.golongan || "",
      Jabatan: item.jabatan,
      Instansi: item.instansi || "",
      Eselon: item.eselon || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pegawai");

    // Tweak column width
    worksheet["!cols"] = [
      { wch: 20 }, // NIP
      { wch: 30 }, // Nama
      { wch: 15 }, // Pangkat
      { wch: 10 }, // Golongan
      { wch: 25 }, // Jabatan
      { wch: 25 }, // Instansi
      { wch: 12 }, // Eselon
    ];

    XLSX.writeFile(workbook, "Data_Pegawai_SIPADIN.xlsx");
    toast.success("Berhasil mengunduh data pegawai");
  };

  // DOWNLOAD TEMPLATE
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        NIP: "199001012020121001",
        "Nama Lengkap": "Dr. Budi Santoso, S.Kom",
        Pangkat: "Penata Tk. I",
        Golongan: "III/d",
        Jabatan: "Kepala Bidang E-Gov",
        Instansi: "Sekretariat Daerah",
        Eselon: "III.a",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    worksheet["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 12 }];

    XLSX.writeFile(workbook, "Template_Import_Pegawai.xlsx");
  };

  // IMPORT EXCEL
  const handleImport = async () => {
    if (!file) {
      toast.error("Pilih file excel terlebih dahulu");
      return;
    }

    setLoading(true);
    try {
      const dataBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("File excel kosong");
      }

      const formattedData = jsonData.map((row) => ({
        nip: row["NIP"]?.toString() || null,
        nama: row["Nama Lengkap"]?.toString() || "",
        pangkat: row["Pangkat"]?.toString() || null,
        golongan: row["Golongan"]?.toString() || null,
        jabatan: row["Jabatan"]?.toString() || "",
        instansi: row["Instansi"]?.toString() || null,
        eselon: row["Eselon"]?.toString() || null,
      })).filter(item => item.nama && item.jabatan); // Hapus baris yang kosong

      if (formattedData.length === 0) {
        throw new Error("Tidak ada data valid yang bisa diimport. Pastikan kolom Nama Lengkap dan Jabatan terisi.");
      }

      const result = await importPegawaiExcel(formattedData);
      
      setIsOpen(false);
      setFile(null);
      
      toast.success(
        `Import Selesai! ${result.inserted} data baru, ${result.updated} diperbarui (konflik NIP), ${result.skipped} dilewati.`, 
        { duration: 6000 }
      );
      
    } catch (err: any) {
      toast.error(err.message || "Gagal mengimport data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" className="bg-white" />}>
          <Upload className="w-4 h-4 mr-2" /> Import
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Data Pegawai dari Excel</DialogTitle>
            <DialogDescription>
              Pastikan format file Anda sesuai dengan template yang disediakan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7 bg-indigo-50/50 text-indigo-900 border-indigo-100">
            <AlertCircle className="h-4 w-4 text-indigo-600" />
            <h5 className="mb-1 font-medium leading-none tracking-tight text-indigo-800">Resolusi Konflik NIP</h5>
            <div className="text-sm [&_p]:leading-relaxed text-indigo-700/80 mt-1">
              Jika <strong>NIP</strong> yang di-upload sudah ada di sistem, maka data lama akan <strong>ditimpa/diperbarui</strong> dengan data dari Excel ini.
            </div>
          </div>

          <div className="space-y-4 my-2">
            <div className="p-4 border rounded-lg bg-slate-50 flex flex-col items-center justify-center gap-2">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <p className="text-sm text-center text-slate-600">
                Belum punya formatnya? Unduh template Excel di bawah ini.
              </p>
              <Button type="button" variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" /> Unduh Template Excel
              </Button>
            </div>

            <div className="space-y-2">
              <Input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mulai Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" size="sm" className="bg-white" onClick={handleExport}>
        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Export
      </Button>
    </div>
  );
}
