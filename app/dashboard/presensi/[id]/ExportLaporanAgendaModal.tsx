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
    enableCheckOut?: boolean;
    picNama?: string | null;
    picNip?: string | null;
    picJabatan?: string | null;
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
      waktuPulang?: Date | string | null;
      lokasiText?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      faceScore?: number | null;
      faceMatchStatus?: string | null;
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
    enableCheckOut: agenda.enableCheckOut,
    pic: agenda.picNama
      ? {
          nama: agenda.picNama,
          nip: agenda.picNip,
          jabatan: agenda.picJabatan,
        }
      : null,
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
      waktuPulang: p.waktuPulang ? `${formatWita(p.waktuPulang, "HH:mm")} WITA` : null,
      lokasiText: p.lokasiText,
      latitude: p.latitude,
      longitude: p.longitude,
      faceScore: p.faceScore,
      faceMatchStatus: p.faceMatchStatus,
    })),
  };

  const documentElement = (
    <LaporanHasilAgendaPdf data={laporanData} pageSize="F4" />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[94vw] w-[94vw] sm:!max-w-[94vw] h-[94vh] flex flex-col p-3 sm:p-5 bg-white">
        <DialogHeader className="pb-2.5 border-b shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Hasil Presensi Kegiatan
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {agenda.namaKegiatan} • {formattedTanggal}
            </p>
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
