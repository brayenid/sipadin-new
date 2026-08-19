"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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
      pageSize="F4"
      tampilkanSpesifikEselon={tampilkanSpesifikEselon}
      tampilkanFooterCatatan={tampilkanFooterCatatan}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[94vw] w-[94vw] sm:!max-w-[94vw] h-[94vh] flex flex-col p-3 sm:p-5 bg-white">
        <DialogHeader className="pb-2.5 border-b shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Cetak Blanko Daftar Hadir Lapangan
            </DialogTitle>
          </div>

          {/* Opsi Cetak Toolbar Mepet & Ringkas */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs">
            <div className="flex items-center gap-2">
              <Label className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">Format:</Label>
              <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                <SelectTrigger className="text-xs h-7.5 w-48 bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blanko">Blanko Kosong (Tanda Tangan Fisik)</SelectItem>
                  <SelectItem value="terisi">Format Terisi ({agenda.peserta.length} OPD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "blanko" ? (
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">Baris Kosong:</Label>
                <Input
                  type="number"
                  min={5}
                  max={200}
                  value={jumlahBaris}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1) setJumlahBaris(val);
                  }}
                  className="text-xs h-7.5 w-18 bg-white border-slate-300"
                />
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 font-medium">
                Total {agenda.peserta.length} pegawai terdaftar
              </div>
            )}

            <div className="flex items-center gap-3.5 pl-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tampilkanSpesifikEselon}
                  onChange={(e) => setTampilkanSpesifikEselon(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-700">Judul Spesifik Eselon II.b & III.a</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tampilkanFooterCatatan}
                  onChange={(e) => setTampilkanFooterCatatan(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-700">Catatan Peringatan Footer</span>
              </label>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Viewer Container */}
        <div className="flex-1 w-full mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            {documentElement}
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
