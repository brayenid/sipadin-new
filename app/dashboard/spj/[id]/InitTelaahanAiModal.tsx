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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, RotateCcw, Loader2 } from "lucide-react";
import { evaluasiKonteksTelaahanAi, type EvaluasiKonteksResult } from "@/app/actions/ai-telaahan";
import { toast } from "sonner";

export type AiInitData = {
  isUndangan: boolean;
  pengirimUndangan?: string;
  nomorUndangan?: string;
  tanggalUndangan?: string;
  perihal: string;
  urgensiTambahan?: string;
  evaluasi?: EvaluasiKonteksResult;
};

export default function InitTelaahanAiModal({
  spj,
  currentPerihal,
  initialAiData,
  isAiInitialized,
  onApply,
  onReset,
}: {
  spj: any;
  currentPerihal?: string;
  initialAiData?: AiInitData | null;
  isAiInitialized: boolean;
  onApply: (data: AiInitData) => void;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const perjadin = spj?.perjadinDetail;
  const rosterNames = spj?.roster?.map((r: any) => r.nama).filter(Boolean) || [];

  const [isUndangan, setIsUndangan] = useState(initialAiData?.isUndangan ?? true);
  const [pengirimUndangan, setPengirimUndangan] = useState(initialAiData?.pengirimUndangan ?? "");
  const [nomorUndangan, setNomorUndangan] = useState(initialAiData?.nomorUndangan ?? "");
  const [tanggalUndangan, setTanggalUndangan] = useState(initialAiData?.tanggalUndangan ?? "");
  const [perihal, setPerihal] = useState(
    currentPerihal || initialAiData?.perihal || spj?.perihal || "Mengikuti Rapat Koordinasi Teknis"
  );
  const [urgensiTambahan, setUrgensiTambahan] = useState(initialAiData?.urgensiTambahan ?? "");
  const [evaluasi, setEvaluasi] = useState<EvaluasiKonteksResult | null>(initialAiData?.evaluasi ?? null);

  // Sinkronisasi dua arah: Jika perihal di form utama berubah, perihal di modal terupdate
  useEffect(() => {
    if (currentPerihal) {
      setPerihal(currentPerihal);
    }
  }, [currentPerihal]);

  // Load initial data if provided
  useEffect(() => {
    if (initialAiData) {
      setIsUndangan(initialAiData.isUndangan);
      setPengirimUndangan(initialAiData.pengirimUndangan || "");
      setNomorUndangan(initialAiData.nomorUndangan || "");
      setTanggalUndangan(initialAiData.tanggalUndangan || "");
      setUrgensiTambahan(initialAiData.urgensiTambahan || "");
      setEvaluasi(initialAiData.evaluasi || null);
    }
  }, [initialAiData]);

  const handleInit = async (forceApply = false) => {
    if (!perihal.trim()) {
      toast.error("Harap isi perihal/maksud telaahan terlebih dahulu.");
      return;
    }

    if (isUndangan && !pengirimUndangan.trim()) {
      toast.error("Harap isi nama instansi pengirim surat undangan.");
      return;
    }

    setEvaluating(true);
    try {
      const evalResult = await evaluasiKonteksTelaahanAi({
        isUndangan,
        pengirimUndangan: isUndangan ? pengirimUndangan : undefined,
        nomorUndangan: isUndangan ? nomorUndangan : undefined,
        tanggalUndangan: isUndangan ? tanggalUndangan : undefined,
        perihal: perihal.trim(),
        urgensiTambahan: urgensiTambahan.trim() || undefined,
      });

      setEvaluasi(evalResult);

      const initData: AiInitData = {
        isUndangan,
        pengirimUndangan: isUndangan ? pengirimUndangan : undefined,
        nomorUndangan: isUndangan ? nomorUndangan : undefined,
        tanggalUndangan: isUndangan ? tanggalUndangan : undefined,
        perihal: perihal.trim(),
        urgensiTambahan: urgensiTambahan.trim() || undefined,
        evaluasi: evalResult,
      };

      onApply(initData);

      if (evalResult.status === "RANCU" && !forceApply) {
        toast.warning("Konteks tersimpan, namun terdeteksi masih rancu/umum. Tinjau catatan evaluasi AI.");
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

      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[560px] max-h-[85vh] overflow-x-hidden overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
            Inisialisasi AI Telaahan Staf
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Isi data konteks agar AI dapat menyusun kalimat yang relevan dan tajam saat tombol <strong>AI Refine</strong> digunakan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 min-w-0 overflow-hidden">

          {/* Pertanyaan Kunci: Apakah Berdasarkan Undangan */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800">
              1. Apakah perjalanan ini berdasarkan Surat Undangan Masuk?
            </Label>
            <RadioGroup
              value={isUndangan ? "UNDANGAN" : "INISIATIF"}
              onValueChange={(v) => setIsUndangan(v === "UNDANGAN")}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              <div
                onClick={() => setIsUndangan(true)}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  isUndangan
                    ? "bg-slate-100 border-slate-400 text-slate-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem value="UNDANGAN" id="opt-undangan" />
                <Label htmlFor="opt-undangan" className="cursor-pointer text-xs font-medium">
                  Ada Surat Undangan
                </Label>
              </div>

              <div
                onClick={() => setIsUndangan(false)}
                className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  !isUndangan
                    ? "bg-slate-100 border-slate-400 text-slate-900 font-semibold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem value="INISIATIF" id="opt-inisiatif" />
                <Label htmlFor="opt-inisiatif" className="cursor-pointer text-xs font-medium">
                  Inisiatif / Tupoksi Rutin
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Jika Berdasarkan Undangan: Input Meta Surat Undangan */}
          {isUndangan && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Detail Surat Undangan Masuk
              </p>
              <div className="space-y-1">
                <Label className="text-xs">
                  Instansi / Pengirim Undangan <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={pengirimUndangan}
                  onChange={(e) => setPengirimUndangan(e.target.value)}
                  placeholder="Contoh: Kementerian Dalam Negeri RI / Bappeda Prov. Kaltim"
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nomor Surat (Opsional)</Label>
                  <Input
                    value={nomorUndangan}
                    onChange={(e) => setNomorUndangan(e.target.value)}
                    placeholder="Contoh: 000.1.2/123/SJ"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tanggal Surat (Opsional)</Label>
                  <Input
                    type="date"
                    value={tanggalUndangan}
                    onChange={(e) => setTanggalUndangan(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Perihal / Maksud Telaahan */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-800">
              2. Perihal / Maksud Telaahan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={perihal}
              onChange={(e) => {
                setPerihal(e.target.value);
                if (evaluasi) setEvaluasi(null);
              }}
              placeholder="Contoh: Mengikuti Rapat Koordinasi Penataan Kelembagaan Perangkat Daerah..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Catatan Urgensi Tambahan (Opsional) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800">
                3. Poin Urgensi / Catatan Tambahan
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
            </div>
            <Textarea
              value={urgensiTambahan}
              onChange={(e) => {
                setUrgensiTambahan(e.target.value);
                if (evaluasi) setEvaluasi(null);
              }}
              placeholder="Contoh: Sangat mendesak karena batas akhir input aplikasi SIPD tanggal 20 Juli..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* KARTU EVALUASI KRITIS AI PASCA INISIALISASI */}
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
                  const initData: AiInitData = {
                    isUndangan,
                    pengirimUndangan: isUndangan ? pengirimUndangan : undefined,
                    nomorUndangan: isUndangan ? nomorUndangan : undefined,
                    tanggalUndangan: isUndangan ? tanggalUndangan : undefined,
                    perihal: perihal.trim(),
                    urgensiTambahan: urgensiTambahan.trim() || undefined,
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
