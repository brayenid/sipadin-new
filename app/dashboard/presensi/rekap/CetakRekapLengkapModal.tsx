"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LaporanRekapKegiatanLengkapPdf, {
  SingleAgendaData,
} from "@/pdf/templates/LaporanRekapKegiatanLengkapPdf";
import { getRekapKegiatanLengkap } from "@/app/actions/absensi";
import { formatWita } from "@/lib/date-utils";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[500px] w-full bg-slate-50 border rounded-lg gap-2 text-slate-500 text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span>Menyiapkan dokumen laporan PDF...</span>
      </div>
    ),
  }
);

export default function CetakRekapLengkapModal({
  isOpen,
  onClose,
  periodeLabel,
  filters,
}: {
  isOpen: boolean;
  onClose: () => void;
  periodeLabel: string;
  filters: {
    startDate?: string;
    endDate?: string;
    kategoriAgenda?: "ALL" | "RAPAT" | "APEL" | "RUTIN";
  };
}) {
  const [filterFilledOnly, setFilterFilledOnly] = useState(false);
  const [pageSize, setPageSize] = useState<"F4" | "A4">("F4");
  const [loading, setLoading] = useState(false);
  const [agendasData, setAgendasData] = useState<SingleAgendaData[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    getRekapKegiatanLengkap(filters)
      .then((res) => {
        if (!isMounted) return;
        const formatted = res.map((ag) => ({
          id: ag.id,
          namaKegiatan: ag.namaKegiatan,
          hari: ag.hari || formatWita(ag.tanggal, "EEEE"),
          tanggal: ag.tanggal,
          tanggalLabel: formatWita(ag.tanggal, "dd MMMM yyyy"),
          waktu: ag.waktu,
          tempat: ag.tempat,
          targetPeserta: ag.targetPeserta,
          targetLatitude: ag.targetLatitude,
          targetLongitude: ag.targetLongitude,
          radiusMeter: ag.radiusMeter,
          enableCheckOut: ag.enableCheckOut,
          pic: ag.picNama
            ? {
                nama: ag.picNama,
                nip: ag.picNip,
                jabatan: ag.picJabatan,
              }
            : null,
          peserta: ag.peserta.map((p) => ({
            nama: p.nama,
            nip: p.nip,
            jabatan: p.jabatan,
            instansi: p.instansi,
            status: p.status || "HADIR",
            namaPerwakilan: p.namaPerwakilan,
            jabatanPerwakilan: p.jabatanPerwakilan,
            keterangan: p.keterangan,
            isSelfInput: p.isSelfInput,
            isNonUndangan: (p as any).isNonUndangan,
            waktuInput: p.waktuInput ? `${formatWita(p.waktuInput, "HH:mm")} WITA` : null,
            waktuPulang: p.waktuPulang ? `${formatWita(p.waktuPulang, "HH:mm")} WITA` : null,
            lokasiText: p.lokasiText,
            latitude: p.latitude,
            longitude: p.longitude,
            distanceMeters: (p as any).distanceMeters,
            isInsideRadius: (p as any).isInsideRadius,
          })),
        }));
        setAgendasData(formatted);
      })
      .catch((err) => {
        console.error("Gagal mengambil data rekap kegiatan lengkap:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, filters.startDate, filters.endDate, filters.kategoriAgenda]);

  // Hitung total peserta & yang mengisi di semua kegiatan
  const totalPesertaAll = agendasData.reduce(
    (acc, ag) => acc + (ag.peserta ? ag.peserta.length : 0),
    0
  );
  const totalFilledAll = agendasData.reduce(
    (acc, ag) =>
      acc +
      (ag.peserta
        ? ag.peserta.filter(
            (p) => p.status === "HADIR" || p.status === "MEWAKILI" || p.status === "IZIN"
          ).length
        : 0),
    0
  );

  const documentElement = (
    <LaporanRekapKegiatanLengkapPdf
      agendas={agendasData}
      filterFilledOnly={filterFilledOnly}
      pageSize={pageSize}
    />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-[95vw] sm:!max-w-[95vw] h-[94vh] flex flex-col p-3 sm:p-5 bg-white">
        <DialogHeader className="pb-2.5 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Lengkap Seluruh Kegiatan
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Periode: {periodeLabel} • {agendasData.length} Agenda Kegiatan
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Filter Peserta */}
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
              Filter Data:
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setFilterFilledOnly(false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  !filterFilledOnly
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Peserta ({totalPesertaAll})
              </button>
              <button
                type="button"
                onClick={() => setFilterFilledOnly(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  filterFilledOnly
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hanya Yang Mengisi ({totalFilledAll})
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Viewer Container */}
        <div className="flex-1 w-full mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 gap-2 text-slate-500 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span>Memuat seluruh data kegiatan dan presensi...</span>
            </div>
          ) : (
            <PDFViewer width="100%" height="100%" showToolbar={true}>
              {documentElement}
            </PDFViewer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
