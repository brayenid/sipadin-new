"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import DaftarHadirOpdPdf, { DaftarHadirOpdData } from "@/pdf/templates/DaftarHadirOpdPdf";
import { formatWita } from "@/lib/date-utils";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] w-full bg-slate-50 border rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    ),
  }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

export default function CetakModal({
  isOpen,
  onClose,
  agenda,
}: {
  isOpen: boolean;
  onClose: () => void;
  agenda: {
    namaKegiatan: string;
    hari: string | null;
    tanggal: Date | string;
    tempat: string;
    targetPeserta: string | null;
    peserta: {
      nama: string;
      jabatan: string;
      instansi: string;
      eselon?: string | null;
    }[];
  };
}) {
  const [mode, setMode] = useState<"blanko" | "terisi">("blanko");
  const [pageSize, setPageSize] = useState<"F4" | "A4">("F4");
  const [jumlahBaris, setJumlahBaris] = useState<number>(31);
  const [tampilkanSpesifikEselon, setTampilkanSpesifikEselon] = useState(false);
  const [tampilkanFooterCatatan, setTampilkanFooterCatatan] = useState(false);

  const formattedTanggal = formatWita(agenda.tanggal, "dd MMMM yyyy");

  const pdfData: DaftarHadirOpdData = {
    namaKegiatan: agenda.namaKegiatan,
    hari: agenda.hari || formatWita(agenda.tanggal, "EEEE"),
    tanggalLabel: formattedTanggal,
    tempat: agenda.tempat,
    targetPeserta: agenda.targetPeserta || "Eselon II.b dan III.a",
    peserta: agenda.peserta,
  };

  const documentElement = (
    <DaftarHadirOpdPdf
      data={pdfData}
      mode={mode}
      jumlahBarisKosong={jumlahBaris}
      pageSize={pageSize}
      tampilkanSpesifikEselon={tampilkanSpesifikEselon}
      tampilkanFooterCatatan={tampilkanFooterCatatan}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[94vw] w-[94vw] sm:!max-w-[94vw] h-[94vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Cetak Blanko Daftar Hadir Lapangan
            </DialogTitle>

            <div className="flex items-center gap-2">
              <PDFDownloadLink
                document={documentElement}
                fileName={`Blanko_Daftar_Hadir_${agenda.namaKegiatan.replace(/[^a-zA-Z0-9]/g, "_")}_${mode}.pdf`}
              >
                {({ loading }) => (
                  <Button
                    size="sm"
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    Unduh PDF
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          </div>

          {/* Opsi Cetak */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-3 items-end">
            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Tipe Format Blanko</Label>
              <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                <SelectTrigger className="mt-1 text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blanko">Blanko Kosong (Tanda Tangan Fisik)</SelectItem>
                  <SelectItem value="terisi">Format Terisi Nama Pegawai ({agenda.peserta.length} OPD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Ukuran Kertas</Label>
              <Select value={pageSize} onValueChange={(val: any) => setPageSize(val)}>
                <SelectTrigger className="mt-1 text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F4">F4 / Folio (215 x 330 mm)</SelectItem>
                  <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "blanko" ? (
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">Jumlah Baris Kosong</Label>
                <Input
                  type="number"
                  min={5}
                  max={200}
                  value={jumlahBaris}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) setJumlahBaris(val);
                  }}
                  className="mt-1 text-xs h-8"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-500 pb-1.5">
                Total {agenda.peserta.length} pegawai terdaftar
              </div>
            )}

            {/* Checkbox Opsi Tambahan */}
            <div className="flex flex-col gap-1.5 pb-0.5 text-xs text-slate-700 md:col-span-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tampilkanSpesifikEselon}
                  onChange={(e) => setTampilkanSpesifikEselon(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px]">Judul Spesifik Eselon II.b & III.a</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tampilkanFooterCatatan}
                  onChange={(e) => setTampilkanFooterCatatan(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px]">Catatan Peringatan Footer</span>
              </label>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Viewer Container */}
        <div className="flex-1 w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            {documentElement}
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
