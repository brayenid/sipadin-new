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
  onViewMap,
}: {
  isOpen: boolean;
  onClose: () => void;
  peserta: {
    id?: string;
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
  onViewMap?: () => void;
}) {
  if (!peserta || !peserta.fotoUrl) return null;

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
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[3/4] max-w-xs mx-auto flex items-center justify-center border border-slate-200 shadow-inner">
            <img
              src={peserta.fotoUrl}
              alt={`Foto ${peserta.nama}`}
              className="w-full h-full object-cover"
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

            {peserta.latitude && peserta.longitude && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Lokasi GPS:
                </span>
                {onViewMap ? (
                  <button
                    type="button"
                    onClick={onViewMap}
                    className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                  >
                    Lihat Titik di Peta <MapPin className="w-3 h-3 text-emerald-600" />
                  </button>
                ) : (
                  <span className="font-mono text-slate-700 text-[11px]">
                    {peserta.latitude.toFixed(5)}, {peserta.longitude.toFixed(5)}
                  </span>
                )}
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
