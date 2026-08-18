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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import LaporanHasilAgendaPdf, { LaporanHasilAgendaData } from "@/pdf/templates/LaporanHasilAgendaPdf";
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

export default function ExportLaporanAgendaModal({
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
    waktu?: string | null;
    tempat: string;
    targetPeserta: string | null;
    targetLatitude?: number | null;
    targetLongitude?: number | null;
    radiusMeter?: number | null;
    peserta: {
      nama: string;
      nip?: string | null;
      jabatan: string;
      instansi: string;
      status: string;
      namaPerwakilan?: string | null;
      jabatanPerwakilan?: string | null;
      keterangan?: string | null;
      isSelfInput?: boolean;
      waktuInput?: Date | string | null;
      lokasiText?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    }[];
  };
}) {
  const [pageSize, setPageSize] = useState<"F4" | "A4">("F4");

  const formattedTanggal = formatWita(agenda.tanggal, "dd MMMM yyyy");

  const laporanData: LaporanHasilAgendaData = {
    namaKegiatan: agenda.namaKegiatan,
    hari: agenda.hari || formatWita(agenda.tanggal, "EEEE"),
    tanggalLabel: formattedTanggal,
    waktu: agenda.waktu,
    tempat: agenda.tempat,
    targetPeserta: agenda.targetPeserta,
    targetLatitude: agenda.targetLatitude,
    targetLongitude: agenda.targetLongitude,
    radiusMeter: agenda.radiusMeter,
    peserta: agenda.peserta.map((p) => ({
      nama: p.nama,
      nip: p.nip,
      jabatan: p.jabatan,
      instansi: p.instansi,
      status: p.status || "HADIR",
      namaPerwakilan: p.namaPerwakilan,
      jabatanPerwakilan: p.jabatanPerwakilan,
      keterangan: p.keterangan,
      isSelfInput: p.isSelfInput,
      waktuInput: p.waktuInput ? `${formatWita(p.waktuInput, "HH:mm")} WITA` : null,
      lokasiText: p.lokasiText,
      latitude: p.latitude,
      longitude: p.longitude,
    })),
  };

  const documentElement = (
    <LaporanHasilAgendaPdf data={laporanData} pageSize={pageSize} />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[94vw] w-[94vw] sm:!max-w-[94vw] h-[94vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                Laporan Hasil Presensi Kegiatan (PDF)
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {agenda.namaKegiatan} • {formattedTanggal}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-[11px] font-semibold text-slate-700">Kertas:</Label>
                <Select value={pageSize} onValueChange={(val: any) => setPageSize(val)}>
                  <SelectTrigger className="text-xs h-8 w-32 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F4">F4 / Folio</SelectItem>
                    <SelectItem value="A4">A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PDFDownloadLink
                document={documentElement}
                fileName={`Laporan_Presensi_${agenda.namaKegiatan.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`}
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
