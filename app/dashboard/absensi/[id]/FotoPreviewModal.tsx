"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, User, Camera, MapPin, Clock } from "lucide-react";
import { formatWita } from "@/lib/date-utils";

export default function FotoPreviewModal({
  isOpen,
  onClose,
  peserta,
}: {
  isOpen: boolean;
  onClose: () => void;
  peserta: {
    nama: string;
    jabatan: string;
    instansi: string;
    status: string;
    fotoUrl?: string | null;
    waktuInput?: Date | string | null;
    lokasiText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}) {
  if (!peserta || !peserta.fotoUrl) return null;

  const mapsUrl =
    peserta.latitude && peserta.longitude
      ? `https://www.google.com/maps?q=${peserta.latitude},${peserta.longitude}`
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white rounded-3xl border border-slate-200 text-center">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Foto Selfie Kehadiran
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {peserta.nama} - {peserta.instansi}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-4/3 flex items-center justify-center border border-slate-200">
            <img
              src={peserta.fotoUrl}
              alt={`Foto ${peserta.nama}`}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-left space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Waktu Presensi:
              </span>
              <span className="font-semibold text-slate-800">
                {peserta.waktuInput
                  ? `${formatWita(peserta.waktuInput, "dd MMM yyyy, HH:mm:ss")} WITA`
                  : "-"}
              </span>
            </div>

            {mapsUrl && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Lokasi GPS:
                </span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Lihat Titik di Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="w-full text-xs font-semibold"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
