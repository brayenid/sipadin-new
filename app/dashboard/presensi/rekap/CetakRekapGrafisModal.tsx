"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import LaporanRekapGrafisPdf from "@/pdf/templates/LaporanRekapGrafisPdf";
import {
  buildGrafisData,
  type GrafisData,
  type GrafisInput,
} from "./grafis/buildGrafisData";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[500px] w-full bg-slate-50 border rounded-lg gap-2 text-slate-500 text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span>Menyiapkan dokumen PDF Laporan Grafis...</span>
      </div>
    ),
  }
);

export default function CetakRekapGrafisModal({
  isOpen,
  onClose,
  periodeLabel,
  kategoriLabel,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  periodeLabel: string;
  kategoriLabel: string;
  data: GrafisInput;
}) {
  const grafisData = useMemo<GrafisData | null>(() => {
    if (!isOpen) return null;
    return buildGrafisData(data);
  }, [data, isOpen]);

  const tanggalCetak = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar",
      }).format(new Date()),
    []
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] !max-w-[94vw] sm:!max-w-[94vw] h-[92vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Grafis Rekapitulasi Kehadiran (PDF A4 — 2 Lembar)
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Lembar 1: KPI, Komposisi Partisipasi, Kehadiran per Eselon, Top Pegawai, &amp; Peringkat OPD • Lembar 2: Peta Kehadiran OPD × Bulan
            </p>
          </div>
        </DialogHeader>

        {/* PDF Viewer Bawaan Browser */}
        <div className="flex-1 w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {isOpen && grafisData && (
            <PDFViewer width="100%" height="100%" showToolbar={true}>
              <LaporanRekapGrafisPdf
                data={grafisData}
                periodeLabel={periodeLabel || "Semua Periode"}
                kategoriLabel={kategoriLabel}
                tanggalCetak={tanggalCetak}
              />
            </PDFViewer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
