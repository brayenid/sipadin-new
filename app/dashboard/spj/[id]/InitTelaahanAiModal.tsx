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
import { Sparkles, Mail, Compass, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export type AiInitData = {
  isUndangan: boolean;
  pengirimUndangan?: string;
  nomorUndangan?: string;
  tanggalUndangan?: string;
  perihal: string;
  urgensiTambahan?: string;
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
    }
  }, [initialAiData]);

  const handleInit = () => {
    if (!perihal.trim()) {
      toast.error("Harap isi perihal/maksud telaahan terlebih dahulu.");
      return;
    }

    if (isUndangan && !pengirimUndangan.trim()) {
      toast.error("Harap isi nama instansi pengirim surat undangan.");
      return;
    }

    const initData: AiInitData = {
      isUndangan,
      pengirimUndangan: isUndangan ? pengirimUndangan : undefined,
      nomorUndangan: isUndangan ? nomorUndangan : undefined,
      tanggalUndangan: isUndangan ? tanggalUndangan : undefined,
      perihal: perihal.trim(),
      urgensiTambahan: urgensiTambahan.trim() || undefined,
    };

    onApply(initData);
    toast.success("AI Berhasil Di-Inisialisasi! Gunakan tombol 'AI Refine' pada setiap kolom.");
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

      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[560px] max-h-[85vh] overflow-x-hidden overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Inisialisasi AI Telaahan Staf
          </DialogTitle>
          <DialogDescription className="text-xs">
            Isi data konteks di bawah ini agar AI dapat menyusun kalimat yang lebih relevan dan sesuai dengan kegiatan perjalanan dinas ini. Tombol <strong>AI Refine</strong> sudah tersedia di setiap kolom, inisialisasi ini membantu AI memahami konteks sebelum menyempurnakan kalimat.
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
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isUndangan
                    ? "bg-indigo-50/70 border-indigo-300 text-indigo-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem value="UNDANGAN" id="opt-undangan" />
                <Label htmlFor="opt-undangan" className="cursor-pointer text-xs flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" /> Ada Surat Undangan
                </Label>
              </div>

              <div
                onClick={() => setIsUndangan(false)}
                className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  !isUndangan
                    ? "bg-indigo-50/70 border-indigo-300 text-indigo-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <RadioGroupItem value="INISIATIF" id="opt-inisiatif" />
                <Label htmlFor="opt-inisiatif" className="cursor-pointer text-xs flex items-center gap-1.5 font-medium">
                  <Compass className="w-3.5 h-3.5 text-indigo-500" /> Inisiatif / Tupoksi Rutin
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Jika Berdasarkan Undangan: Input Meta Surat Undangan */}
          {isUndangan && (
            <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-lg space-y-3">
              <p className="text-[11px] font-semibold text-indigo-900 uppercase tracking-wider">
                Detail Surat Undangan Masuk
              </p>
              <div className="space-y-1.5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nomor Surat Undangan (Opsional)</Label>
                  <Input
                    value={nomorUndangan}
                    onChange={(e) => setNomorUndangan(e.target.value)}
                    placeholder="Contoh: 000.1.2/123/SJ"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal Surat Undangan (Opsional)</Label>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800">
              2. Perihal / Maksud Telaahan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              placeholder="Contoh: Mengikuti Rapat Koordinasi Penataan Kelembagaan Perangkat Daerah..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Catatan Urgensi Tambahan (Opsional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800">
                3. Poin Urgensi / Catatan Tambahan
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
            </div>
            <Textarea
              value={urgensiTambahan}
              onChange={(e) => setUrgensiTambahan(e.target.value)}
              placeholder="Contoh: Sangat mendesak karena batas akhir input aplikasi SIPD tanggal 20 Juli..."
              rows={2}
              className="text-xs resize-none"
            />
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
