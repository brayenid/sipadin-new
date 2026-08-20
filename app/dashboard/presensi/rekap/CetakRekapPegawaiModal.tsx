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
import { Printer, Download, Loader2 } from "lucide-react";
import LaporanRekapPegawaiPdf, { RekapPegawaiPdfData } from "@/pdf/templates/LaporanRekapPegawaiPdf";

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

export default function CetakRekapPegawaiModal({
  isOpen,
  onClose,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: RekapPegawaiPdfData;
}) {
  const documentElement = <LaporanRekapPegawaiPdf data={data} />;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] !max-w-[94vw] sm:!max-w-[94vw] h-[92vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
            Laporan Rekapitulasi Kehadiran Pegawai
          </DialogTitle>
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
