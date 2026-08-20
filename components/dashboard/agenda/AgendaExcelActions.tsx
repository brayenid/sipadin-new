"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { importAgendasFromExcel } from "@/app/actions/agenda";

interface AgendaExcelActionsProps {
  onImportSuccess?: () => void;
}

export function AgendaExcelActions({ onImportSuccess }: AgendaExcelActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Helper untuk generate dataset Pakaian Dinas ASN 2026
  const generatePakaianDinasRows = () => {
    const year = 2026;
    const rows: any[] = [];

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let firstMondayDay = 1;
      for (let day = 1; day <= 7; day++) {
        const checkDate = new Date(year, month, day);
        if (checkDate.getDay() === 1) {
          firstMondayDay = day;
          break;
        }
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dayOfWeek = new Date(year, month, day).getDay();
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const isTanggal17 = day === 17;
        const isHariBatikNasional = month === 9 && day === 2;

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          let judul = "";
          let deskripsi = "";

          if (isHariBatikNasional) {
            judul = "Hari Batik Nasional";
            deskripsi = "Peringatan Hari Batik Nasional - Wajib mengenakan Pakaian Batik.";
          } else if (dayOfWeek === 1 || dayOfWeek === 2) {
            judul = "PDH Khaki";
            deskripsi = "Pakaian Dinas Harian Khaki. Kemeja lengan pendek bagi ASN pria dimasukkan ke dalam celana.";
          } else if (dayOfWeek === 3) {
            judul = "PDH Kemeja Putih";
            deskripsi = "Pakaian Dinas Harian Kemeja Putih (celana/rok gelap). Kemeja lengan pendek bagi ASN pria dimasukkan ke dalam celana.";
          } else if (dayOfWeek === 4) {
            if (day < firstMondayDay) {
              judul = "PDH Batik / Tenun / Lurik";
              deskripsi = "Pakaian Dinas Harian Batik / Tenun / Lurik.";
            } else {
              const weekIndex = Math.floor((day - firstMondayDay) / 7) + 1;
              if (weekIndex === 1) {
                judul = "Seragam Batik KORPRI";
                deskripsi = "Pakaian Seragam Batik Korps Pegawai Republik Indonesia (digunakan setiap hari Kamis minggu pertama).";
              } else if (weekIndex === 2 || weekIndex === 3) {
                judul = "Wastra Khas Kutai Barat";
                deskripsi = "Pakaian berbahan dasar / kombinasi wastra khas Kutai Barat (Kriookng, Tenun Doyo, Sulam Tumpar, Ulap Sarut, Tenun Badong).";
              } else if (weekIndex === 4) {
                judul = "Batik Motif Khas Kutai Barat";
                deskripsi = "Pakaian Batik motif khas Kabupaten Kutai Barat.";
              } else {
                judul = "PDH Batik / Tenun / Lurik";
                deskripsi = "Pakaian Dinas Harian Batik / Tenun / Lurik.";
              }
            }
          } else if (dayOfWeek === 5) {
            judul = "PDH Batik / Tenun / Lurik";
            deskripsi = "Pakaian Dinas Harian Batik / Tenun / Lurik.";
          }

          if (judul) {
            rows.push({
              "Judul Agenda": judul,
              "Kategori": "PENGINGAT",
              "Tanggal Mulai": dateStr,
              "Tanggal Selesai": "",
              "Waktu Mulai": "07:30",
              "Waktu Selesai": "16:00",
              "Lokasi": "Kantor / Instansi",
              "Deskripsi": deskripsi,
              "PIC": "Seluruh Pegawai ASN",
              "Status": "DIRENCANAKAN",
            });
          }

          if (isTanggal17 && judul !== "Seragam Batik KORPRI") {
            rows.push({
              "Judul Agenda": "Upacara Tanggal 17 - Batik KORPRI",
              "Kategori": "PENGINGAT",
              "Tanggal Mulai": dateStr,
              "Tanggal Selesai": "",
              "Waktu Mulai": "07:30",
              "Waktu Selesai": "09:00",
              "Lokasi": "Halaman Kantor / Lapangan Upacara",
              "Deskripsi": "Pakaian Seragam Batik Korps Pegawai Republik Indonesia (KORPRI) lengkap untuk Upacara Tanggal 17 Setiap Bulan.",
              "PIC": "Seluruh Pegawai ASN",
              "Status": "DIRENCANAKAN",
            });
          }
        }
      }
    }
    return rows;
  };

  // Unduh Template Excel Kosong
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Judul Agenda": "PDH Khaki",
        "Kategori": "PENGINGAT",
        "Tanggal Mulai": "2026-08-24",
        "Tanggal Selesai": "",
        "Waktu Mulai": "07:30",
        "Waktu Selesai": "16:00",
        "Lokasi": "Kantor",
        "Deskripsi": "Kemeja khaki lengan pendek dimasukkan ke dalam celana.",
        "PIC": "Seluruh Pegawai",
        "Status": "DIRENCANAKAN",
      },
      {
        "Judul Agenda": "Rapat Evaluasi Triwulan",
        "Kategori": "RAPAT",
        "Tanggal Mulai": "2026-08-25",
        "Tanggal Selesai": "2026-08-25",
        "Waktu Mulai": "09:00",
        "Waktu Selesai": "12:00",
        "Lokasi": "Ruang Rapat Utama",
        "Deskripsi": "Evaluasi program kerja dan serapan anggaran",
        "PIC": "Kabag Perencanaan",
        "Status": "DIRENCANAKAN",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    worksheet["!cols"] = [
      { wch: 30 }, // Judul Agenda
      { wch: 22 }, // Kategori
      { wch: 15 }, // Tanggal Mulai
      { wch: 15 }, // Tanggal Selesai
      { wch: 12 }, // Waktu Mulai
      { wch: 12 }, // Waktu Selesai
      { wch: 25 }, // Lokasi
      { wch: 45 }, // Deskripsi
      { wch: 22 }, // PIC
      { wch: 16 }, // Status
    ];

    XLSX.writeFile(workbook, "Template_Import_Agenda.xlsx");
  };

  // Unduh File Excel Jadwal Pakaian Dinas ASN 2026 Siap Pakai
  const handleDownloadPakaianDinasExcel = () => {
    const rows = generatePakaianDinasRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Pakaian Dinas 2026");

    worksheet["!cols"] = [
      { wch: 35 }, // Judul Agenda
      { wch: 16 }, // Kategori
      { wch: 15 }, // Tanggal Mulai
      { wch: 15 }, // Tanggal Selesai
      { wch: 12 }, // Waktu Mulai
      { wch: 12 }, // Waktu Selesai
      { wch: 25 }, // Lokasi
      { wch: 55 }, // Deskripsi
      { wch: 22 }, // PIC
      { wch: 16 }, // Status
    ];

    XLSX.writeFile(workbook, "Jadwal_Pakaian_Dinas_ASN_2026.xlsx");
  };

  // Handle File Input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (json.length === 0) {
        setError("File Excel kosong atau tidak memiliki data.");
        setPreviewData([]);
        return;
      }

      // Format data
      const formatted = json
        .map((row) => ({
          judul: row["Judul Agenda"] || row["Judul"] || row["judul"] || "",
          kategori: row["Kategori"] || row["kategori"] || "PENGINGAT",
          tanggalMulai: row["Tanggal Mulai"] || row["Tanggal"] || row["tanggalMulai"] || "",
          tanggalSelesai: row["Tanggal Selesai"] || row["tanggalSelesai"] || null,
          waktuMulai: row["Waktu Mulai"] || row["waktuMulai"] || null,
          waktuSelesai: row["Waktu Selesai"] || row["waktuSelesai"] || null,
          lokasi: row["Lokasi"] || row["lokasi"] || null,
          deskripsi: row["Deskripsi"] || row["deskripsi"] || null,
          pic: row["PIC"] || row["pic"] || null,
          status: row["Status"] || row["status"] || "DIRENCANAKAN",
        }))
        .filter((item) => item.judul && item.tanggalMulai);

      if (formatted.length === 0) {
        setError("Tidak ditemukan baris data yang valid. Pastikan kolom 'Judul Agenda' dan 'Tanggal Mulai' terisi.");
      }

      setPreviewData(formatted);
    } catch (err: any) {
      setError(err?.message || "Gagal membaca file Excel.");
      setPreviewData([]);
    }
  };

  // Execute Import
  const handleImport = () => {
    if (previewData.length === 0) return;

    startTransition(async () => {
      try {
        const res = await importAgendasFromExcel(previewData);
        if (res.success) {
          setIsOpen(false);
          setFile(null);
          setPreviewData([]);
          if (onImportSuccess) onImportSuccess();
          window.location.reload();
        } else {
          setError(res.message || "Gagal mengimpor data.");
        }
      } catch (err: any) {
        setError(err?.message || "Terjadi kesalahan saat memproses data.");
      }
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8.5 text-xs font-medium rounded-lg shadow-none bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 gap-1.5"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
        <span>Import Excel</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Import Agenda dari Excel
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Unggah file Excel untuk mengisi atau menambah agenda dan pengingat ke kalender.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Download Buttons Section */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2">
              <p className="font-semibold text-slate-700">Unduh Format & Template:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPakaianDinasExcel}
                  className="h-8 text-[11px] gap-1.5 bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-none font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Unduh Data Pakaian Dinas 2026 (Siap Import)</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="h-8 text-[11px] gap-1.5 bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-none"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Template Kosong</span>
                </Button>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Pilih File Excel (.xlsx / .xls):</label>
              <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg p-4 text-center cursor-pointer relative bg-white">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                <p className="font-medium text-slate-700">
                  {file ? file.name : "Klik atau seret file Excel ke sini"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung format .xlsx dan .xls
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Preview Summary */}
            {previewData.length > 0 && !error && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Siap Diimpor ({previewData.length} baris agenda)</span>
                </div>
                <div className="text-[11px] text-emerald-700 max-h-24 overflow-y-auto space-y-0.5 pr-1">
                  {previewData.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="truncate">
                      • {item.tanggalMulai} : <strong>{item.judul}</strong> ({item.kategori})
                    </div>
                  ))}
                  {previewData.length > 5 && (
                    <div className="italic text-emerald-600 font-medium">
                      ...dan {previewData.length - 5} baris lainnya.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8.5 text-xs shadow-none"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={previewData.length === 0 || isPending}
              onClick={handleImport}
              className="h-8.5 text-xs gap-1.5 shadow-none bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memproses Import...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Impor {previewData.length > 0 ? `(${previewData.length})` : ""}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
