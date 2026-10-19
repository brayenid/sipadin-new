"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import LaporanRekapBulanKegiatanPdf, {
  BulanGroupItem,
  PegawaiRekapStat,
} from "@/pdf/templates/LaporanRekapBulanKegiatanPdf";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[500px] w-full bg-slate-50 border rounded-lg gap-2 text-slate-500 text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span>Menyiapkan dokumen PDF Rekap Hierarki...</span>
      </div>
    ),
  }
);

export default function CetakRekapHierarkiModal({
  isOpen,
  onClose,
  tahun,
  periodeLabel,
  rekapPegawai,
  bulanGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  tahun: string;
  periodeLabel: string;
  rekapPegawai: PegawaiRekapStat[];
  bulanGroups: BulanGroupItem[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] !max-w-[94vw] sm:!max-w-[94vw] h-[92vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Rekapitulasi Presensi (Hierarki Bulan &amp; Kegiatan)
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Halaman awal: Rekapitulasi frekuensi kehadiran masing-masing pegawai • Halaman berikutnya: Rincian kehadiran menurut Bulan &gt; Nama Kegiatan &gt; Pegawai Hadir.
            </p>
          </div>
        </DialogHeader>

        {/* PDF Viewer Container */}
        <div className="flex-1 w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {isOpen && (
            <PDFViewer width="100%" height="100%" showToolbar={true}>
              <LaporanRekapBulanKegiatanPdf
                tahun={tahun}
                periodeLabel={periodeLabel}
                rekapPegawai={rekapPegawai}
                bulanGroups={bulanGroups}
                pageSize="F4"
              />
            </PDFViewer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
