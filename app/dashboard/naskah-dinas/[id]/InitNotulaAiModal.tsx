"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Sparkles, Check, FileText, RotateCcw, Loader2, Users, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { initNotulaAi, InitNotulaInput } from "@/app/actions/ai-notula";

export type AiNotulaInitData = {
  catatanRapat: string;
  instruksiKhusus?: string;
};

export default function InitNotulaAiModal({
  formData,
  initialAiData,
  isAiInitialized,
  onApplyGeneratedContent,
  onReset,
}: {
  formData: {
    acara: string;
    tanggalRapat?: string;
    pukul?: string;
    tempat?: string;
    ketuaNama?: string;
    ketuaJabatan?: string;
    pesertaRapat?: string;
  };
  initialAiData?: AiNotulaInitData | null;
  isAiInitialized: boolean;
  onApplyGeneratedContent: (htmlContent: string, initData: AiNotulaInitData) => void;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catatanRapat, setCatatanRapat] = useState(
    initialAiData?.catatanRapat || ""
  );
  const [instruksiKhusus, setInstruksiKhusus] = useState(
    initialAiData?.instruksiKhusus || ""
  );

  const handleGenerate = async () => {
    if (!catatanRapat.trim() && !formData.acara.trim()) {
      toast.error("Harap isi Catatan / Pokok Bahasan Rapat terlebih dahulu.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Groq AI sedang menyusun draf Notula Rapat lengkap...");

    try {
      const input: InitNotulaInput = {
        acara: formData.acara || "Rapat Koordinasi Dinas",
        hariTanggal: formData.tanggalRapat || "",
        pukul: formData.pukul || "",
        tempat: formData.tempat || "",
        ketuaNama: formData.ketuaNama || "",
        ketuaJabatan: formData.ketuaJabatan || "",
        pesertaRapat: formData.pesertaRapat || "",
        catatanRapat: catatanRapat.trim(),
        instruksiKhusus: instruksiKhusus.trim() || undefined,
      };

      const res = await initNotulaAi(input);

      if (!res.htmlContent) {
        throw new Error("AI tidak menghasilkan teks naskah.");
      }

      onApplyGeneratedContent(res.htmlContent, {
        catatanRapat: catatanRapat.trim(),
        instruksiKhusus: instruksiKhusus.trim() || undefined,
      });

      toast.success(`Draf Notula Rapat berhasil disusun oleh ${res.source} AI!`, { id: toastId });
      setOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyusun draf dengan AI.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-8 px-2.5 sm:h-9 sm:px-3.5 text-xs sm:text-sm flex items-center gap-1.5"
          >
            {isAiInitialized ? (
              <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
            ) : (
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            )}
            <span>{isAiInitialized ? "AI Aktif" : "Init AI"}</span>
          </Button>
        }
      >
        {isAiInitialized ? (
          <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
        ) : (
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
        )}
        <span>{isAiInitialized ? "AI Aktif" : "Init AI"}</span>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto sm:max-w-[560px] max-h-[85vh] overflow-x-hidden overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg text-slate-900">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Inisialisasi Draf AI Notula Rapat
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Masukkan poin-poin bahasan atau transkrip ringkas rapat. Groq AI akan langsung menyusun naskah notula resmi lengkap (<strong>I. Pembukaan</strong>, <strong>II. Pembahasan</strong>, <strong>III. Tanya Jawab</strong>, dan <strong>IV. Kesimpulan</strong>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 min-w-0 overflow-hidden text-xs">
          {/* Metadata Ringkas Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-slate-700">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Acara: {formData.acara || "(Belum diisi di form)"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formData.tanggalRapat || "-"}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{formData.tempat || "Ruang Rapat"}</span>
              </div>
              <div className="col-span-2 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                <span className="truncate">Peserta: {formData.pesertaRapat || "OPD Terkait"}</span>
              </div>
            </div>
          </div>

          {/* Catatan Pokok Bahasan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Catatan / Poin Pokok Bahasan & Hasil Rapat <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={catatanRapat}
              onChange={(e) => setCatatanRapat(e.target.value)}
              placeholder="Tuliskan poin-poin yang dibahas dalam rapat...
Contoh:
- Pimpinan menyampaikan urgensi penerapan sistem kerja berbasis digital.
- Bagian Organisasi memaparkan draf peraturan bupati tentang tata kerja jabatan fungsional.
- Bappeda menanyakan kesiapan anggaran dan timeline implementasi.
- Disepakati pembentukan tim perumus yang akan menyelesaikan draf regulasi sebelum 30 September."
              rows={6}
              className="text-xs resize-y min-h-[120px] leading-relaxed font-sans"
            />
          </div>

          {/* Instruksi Khusus (Opsional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              Instruksi Khusus Tambahan (Opsional)
            </Label>
            <Input
              value={instruksiKhusus}
              onChange={(e) => setInstruksiKhusus(e.target.value)}
              placeholder="Contoh: Fokuskan pada pembagian tugas OPD, gunakan gaya bahasa ringkas..."
              className="text-xs h-8"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto h-9 text-xs"
            >
              Batal
            </Button>
            {isAiInitialized && onReset && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={loading}
                className="w-full sm:w-auto h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset AI
              </Button>
            )}
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-semibold text-white gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Menyusun Draf...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {isAiInitialized ? "Generate Ulang dengan AI" : "Generate Draf dengan AI"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
