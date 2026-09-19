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
import { Check, RotateCcw, Loader2 } from "lucide-react";
import { evaluasiKonteksLaporanAi, type EvaluasiLaporanResult } from "@/app/actions/ai-laporan";
import { toast } from "sonner";

export type AiLaporanInitData = {
  konteksKegiatan: string;
  evaluasi?: EvaluasiLaporanResult;
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
  const [evaluating, setEvaluating] = useState(false);
  const [konteksKegiatan, setKonteksKegiatan] = useState(
    initialAiData?.konteksKegiatan || ""
  );
  const [evaluasi, setEvaluasi] = useState<EvaluasiLaporanResult | null>(
    initialAiData?.evaluasi ?? null
  );

  useEffect(() => {
    if (initialAiData) {
      setKonteksKegiatan(initialAiData.konteksKegiatan || "");
      setEvaluasi(initialAiData.evaluasi || null);
    }
  }, [initialAiData]);

  const handleInit = async (forceApply = false) => {
    if (!konteksKegiatan.trim()) {
      toast.error("Harap isi konteks / ringkasan hasil kegiatan terlebih dahulu.");
      return;
    }

    setEvaluating(true);
    try {
      const evalResult = await evaluasiKonteksLaporanAi({
        konteksKegiatan: konteksKegiatan.trim(),
        kegiatanDefault: spj?.perihal,
      });

      setEvaluasi(evalResult);

      const initData: AiLaporanInitData = {
        konteksKegiatan: konteksKegiatan.trim(),
        evaluasi: evalResult,
      };

      onApply(initData);

      if (evalResult.status === "RANCU" && !forceApply) {
        toast.warning("Konteks tersimpan, namun terdeteksi masih normatif/rancu. Tinjau catatan evaluasi AI.");
      } else {
        toast.success("Inisialisasi AI berhasil disimpan.");
        setOpen(false);
      }
    } catch (err: any) {
      toast.error("Gagal melakukan evaluasi konteks AI.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      setEvaluasi(null);
      toast.info("Inisialisasi AI telah di-reset.");
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
            ) : null}
            Init AI
          </Button>
        }
      >
        {isAiInitialized ? (
          <Check className="w-4 h-4 mr-1.5 text-emerald-300 stroke-[3]" />
        ) : null}
        Init AI
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[540px] max-h-[85vh] overflow-x-hidden overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
            Inisialisasi AI Laporan Hasil
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Masukkan catatan hasil riil kegiatan perjalanan dinas sebagai rujukan AI saat melakukan refine narasi dan butir poin hasil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 min-w-0 overflow-hidden">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800">
              Konteks / Poin Ringkas Hasil Kegiatan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={konteksKegiatan}
              onChange={(e) => {
                setKonteksKegiatan(e.target.value);
                if (evaluasi) setEvaluasi(null);
              }}
              placeholder="Contoh: Menghadiri Rakor di Samarinda. Disepakati perpanjangan jadwal penginputan SIPD sampai 25 Agustus dan perlunya pembentukan tim teknis per kecamatan..."
              rows={4}
              className="text-xs resize-y min-h-[90px] leading-relaxed"
            />
          </div>

          {/* KARTU EVALUASI KRITIS PASCA INISIALISASI */}
          {evaluasi && (
            <div
              className={`p-3 rounded-lg border text-xs space-y-2 ${
                evaluasi.status === "RANCU"
                  ? "bg-amber-50/70 border-amber-300 text-amber-950"
                  : evaluasi.status === "CUKUP"
                  ? "bg-slate-50 border-slate-300 text-slate-800"
                  : "bg-emerald-50/70 border-emerald-300 text-emerald-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Evaluasi Kesiapan Konteks: {evaluasi.ringkasanStatus}
                </span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                    evaluasi.status === "RANCU"
                      ? "bg-amber-200 text-amber-900"
                      : evaluasi.status === "CUKUP"
                      ? "bg-slate-200 text-slate-800"
                      : "bg-emerald-200 text-emerald-900"
                  }`}
                >
                  {evaluasi.status}
                </span>
              </div>

              <p className="leading-relaxed">{evaluasi.catatanKritis}</p>

              {evaluasi.saranPertanyaan && evaluasi.saranPertanyaan.length > 0 && (
                <div className="pt-1 border-t border-dashed border-current/20 space-y-1">
                  <p className="font-semibold text-[10px] uppercase tracking-wider">
                    Saran Tambahan Informasi:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {evaluasi.saranPertanyaan.map((q, idx) => (
                      <li key={idx} className="leading-tight">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-2 border-t mt-2">
          <div>
            {isAiInitialized && onReset ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset AI
              </Button>
            ) : <div />}
          </div>
          <div className="flex items-center gap-2">
            {evaluasi ? (
              <Button
                type="button"
                onClick={() => {
                  const initData: AiLaporanInitData = {
                    konteksKegiatan: konteksKegiatan.trim(),
                    evaluasi,
                  };
                  onApply(initData);
                  toast.success("Inisialisasi AI diterapkan.");
                  setOpen(false);
                }}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4"
              >
                Laksanakan Saja
              </Button>
            ) : (
              <Button
                type="button"
                disabled={evaluating}
                onClick={() => handleInit(false)}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4"
              >
                {evaluating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Mengevaluasi...
                  </>
                ) : (
                  "Inisialisasi & Evaluasi"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
