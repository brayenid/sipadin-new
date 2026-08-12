"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, FileText, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type AiLaporanInitData = {
  konteksKegiatan: string;
};

export default function InitLaporanAiModal({
  spj,
  initialAiData,
  isAiInitialized,
  onApply,
  onReset,
}: {
  spj: any;
  initialAiData?: AiLaporanInitData | null;
  isAiInitialized: boolean;
  onApply: (data: AiLaporanInitData) => void;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [konteksKegiatan, setKonteksKegiatan] = useState(
    initialAiData?.konteksKegiatan || ""
  );

  useEffect(() => {
    if (initialAiData) {
      setKonteksKegiatan(initialAiData.konteksKegiatan || "");
    }
  }, [initialAiData]);

  const handleInit = () => {
    if (!konteksKegiatan.trim()) {
      toast.error("Harap isi konteks / ringkasan hasil kegiatan terlebih dahulu.");
      return;
    }

    const initData: AiLaporanInitData = {
      konteksKegiatan: konteksKegiatan.trim(),
    };

    onApply(initData);
    toast.success("AI Berhasil Di-Inisialisasi! Gunakan tombol 'AI Refine' pada masing-masing item laporan.");
    setOpen(false);
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      toast.info("Inisialisasi AI telah dibatalkan / di-reset.");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-8 px-2.5 sm:h-9 sm:px-3.5 text-xs sm:text-sm flex items-center"
          >
            {isAiInitialized ? (
              <Check className="w-4 h-4 mr-1.5 text-emerald-300 stroke-[3]" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5 text-white" />
            )}
            Init AI
          </Button>
        }
      >
        {isAiInitialized ? (
          <Check className="w-4 h-4 mr-1.5 text-emerald-300 stroke-[3]" />
        ) : (
          <Sparkles className="w-4 h-4 mr-1.5 text-white" />
        )}
        Init AI
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[540px] max-h-[85vh] overflow-x-hidden overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Inisialisasi AI Laporan Hasil
          </DialogTitle>
          <DialogDescription className="text-xs">
            Masukkan gambaran umum / poin hasil utama kegiatan perjalanan dinas ini. Inputan ini menjadi rujukan utama AI dalam menyempurnakan bagian <strong>Pembuka</strong>, <strong>Poin Hasil</strong>, maupun <strong>Narasi Laporan</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 min-w-0 overflow-hidden">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              Konteks / Poin Ringkas Hasil Kegiatan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={konteksKegiatan}
              onChange={(e) => setKonteksKegiatan(e.target.value)}
              placeholder="Contoh: Mengikuti Rapat Koordinasi SIPD di Samarinda. Hasil rapat menyepakati perpanjangan jadwal penginputan hingga 25 Agustus, dan dibutuhkannya pembentukan tim kerja teknis kecamatan..."
              rows={5}
              className="text-xs resize-y min-h-[100px] leading-relaxed"
            />
            <p className="text-[11px] text-slate-500 italic">
              *Tuliskan catatan singkat atau poin-poin utama kegiatan di atas. AI akan membaca konteks ini saat Anda menekan tombol <strong>AI Refine</strong> pada setiap item laporan.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto h-9 text-xs"
            >
              Batal
            </Button>
            {isAiInitialized && onReset && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="w-full sm:w-auto h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset AI
              </Button>
            )}
          </div>
          <Button
            type="button"
            onClick={handleInit}
            className="w-full sm:w-auto h-9 text-xs bg-indigo-600 hover:bg-indigo-700"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-white" />
            {isAiInitialized ? "Perbarui Inisialisasi AI" : "Inisialisasi AI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
