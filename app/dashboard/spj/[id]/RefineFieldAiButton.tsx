"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, RefreshCw, Check, Trash2, Plus } from "lucide-react";
import { refineFieldAi } from "@/app/actions/ai-telaahan";
import { toast } from "sonner";

export default function RefineFieldAiButton({
  fieldName,
  fieldLabel,
  currentDoc,
  aiInitData,
  isAiInitialized,
  quotaRemaining,
  onUseQuota,
  onApplyText,
  onApplyList,
}: {
  fieldName: "dasar" | "praAnggapan" | "fakta" | "analisis" | "kesimpulan" | "saran";
  fieldLabel: string;
  currentDoc: {
    perihal: string;
    dasar: string;
    praAnggapan: string[];
    fakta: string[];
    analisis: string;
    kesimpulan: string;
    saran: string;
  };
  aiInitData: any;
  isAiInitialized: boolean;
  quotaRemaining: number;
  onUseQuota: () => void;
  onApplyText?: (text: string) => void;
  onApplyList?: (items: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  // State untuk resolusi modal preview hasil AI
  const [showResolution, setShowResolution] = useState(false);
  const [proposedText, setProposedText] = useState("");
  const [proposedList, setProposedList] = useState<string[]>([]);
  const [aiSource, setAiSource] = useState<"Gemini" | "Groq">("Gemini");

  const isListField = fieldName === "praAnggapan" || fieldName === "fakta";
  const disabled = quotaRemaining <= 0;

  // Nilai saat ini sebelum diubah AI
  const currentValue = isListField
    ? currentDoc[fieldName].filter(i => i.trim() !== "")
    : currentDoc[fieldName] || "";

  const handleRefine = async () => {
    if (!isAiInitialized) {
      toast.warning("Harap lakukan inisialisasi AI terlebih dahulu dengan mengklik tombol 'Init AI' di bagian atas.");
      return;
    }

    if (quotaRemaining <= 0) {
      toast.error("Kuota AI Refine untuk kolom ini sudah habis (Maksimal 3x).");
      return;
    }

    setLoading(true);
    try {
      const result = await refineFieldAi({
        targetField: fieldName,
        instruction: instruction.trim() || undefined,
        currentDoc,
        aiInitData: aiInitData || undefined,
      });

      setAiSource(result.source);

      if (isListField && result.items) {
        setProposedList(result.items);
      } else if (!isListField && result.text) {
        setProposedText(result.text);
      }

      // Buka modal resolusi untuk preview
      onUseQuota(); // Kuota dikurangi saat AI berhasil menjawab, bukan saat "Gunakan" ditekan
      setShowResolution(true);
      setOpen(false); // Tutup popover
      setInstruction("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyempurnakan dengan AI");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyResolution = () => {
    if (isListField && onApplyList) {
      onApplyList(proposedList.filter(item => item.trim() !== ""));
    } else if (!isListField && onApplyText) {
      onApplyText(proposedText);
    }

    setShowResolution(false);
    toast.success(`Bagian ${fieldLabel} berhasil diperbarui oleh ${aiSource}!`, {
      icon: "✨",
      duration: 4000,
    });
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isAiInitialized) {
      e.preventDefault();
      e.stopPropagation();
      toast.warning("Harap lakukan inisialisasi AI terlebih dahulu dengan mengklik tombol 'Init AI' di bagian atas.");
    }
  };

  return (
    <>
      <Popover open={open && isAiInitialized} onOpenChange={(newOpen) => { if (isAiInitialized) setOpen(newOpen); }}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTriggerClick}
              disabled={disabled}
              className="h-7 text-[10px] sm:text-xs text-indigo-700 bg-indigo-50/70 border-indigo-200/80 hover:bg-indigo-100 hover:text-indigo-900 font-semibold px-2 gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>AI ({quotaRemaining})</span>
            </Button>
          }
        >
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>AI ({quotaRemaining})</span>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] sm:w-[320px] p-3 text-xs space-y-2.5" align="end">
          <div>
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Sempurnakan {fieldLabel}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              AI akan menulis ulang bagian ini sesuai preset daerah dan metadata inisialisasi. (Sisa kuota: {quotaRemaining}x)
            </p>
          </div>

          <div className="space-y-1">
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Instruksi khusus (misal: persingkat / buat lebih tegas)..."
              className="h-8 text-xs bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleRefine();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-7 text-[11px] px-2 text-slate-500"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRefine}
              disabled={loading || disabled}
              className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Perbarui
                </>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* MODAL RESOLUSI HASIL AI */}
      <Dialog open={showResolution} onOpenChange={setShowResolution}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto p-4 sm:p-6 text-xs">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-1.5 text-slate-900 text-sm sm:text-base font-bold">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Resolusi Hasil AI untuk {fieldLabel}
              </DialogTitle>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                Sumber: {aiSource} AI
              </span>
            </div>
            <DialogDescription className="text-[11px] text-slate-500">
              Bandingkan draft lama dengan draf usulan AI di bawah ini sebelum menerapkannya ke dokumen. Anda dapat mengedit usulan AI secara langsung di sisi kanan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 border-y border-slate-100 my-2">
            {/* Sisi Kiri: Nilai Saat Ini */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 space-y-2">
              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b pb-1">
                Saat Ini
              </p>
              <div className="min-h-[160px] text-slate-600 leading-relaxed max-h-[260px] overflow-y-auto whitespace-pre-line text-xs font-medium">
                {isListField ? (
                  Array.isArray(currentValue) && currentValue.length > 0 ? (
                    <ul className="list-decimal pl-4 space-y-1.5">
                      {currentValue.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="italic text-slate-400 text-[11px]">Kosong / belum terisi</span>
                  )
                ) : (
                  currentValue || <span className="italic text-slate-400 text-[11px]">Kosong / belum terisi</span>
                )}
              </div>
            </div>

            {/* Sisi Ranan: Rekomendasi AI (EDITABLE) */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2 relative">
              <p className="font-bold text-indigo-800 uppercase tracking-wider text-[10px] border-b border-indigo-100 pb-1 flex items-center justify-between">
                <span>Usulan AI</span>
                <span className="text-[9px] text-indigo-500 font-semibold lowercase">Bisa langsung disesuaikan</span>
              </p>
              <div className="min-h-[160px] max-h-[260px] overflow-y-auto">
                {isListField ? (
                  <div className="space-y-2">
                    {proposedList.map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1">
                        <span className="mt-2 text-[10px] font-bold text-indigo-400 w-3 text-right shrink-0">{idx + 1}.</span>
                        <textarea
                          value={item}
                          onChange={(e) => {
                            const updated = [...proposedList];
                            updated[idx] = e.target.value;
                            setProposedList(updated);
                          }}
                          rows={2}
                          className="w-full text-xs p-1.5 border border-indigo-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 resize-none leading-relaxed font-medium"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 mt-1"
                          onClick={() => {
                            setProposedList(proposedList.filter((_, i) => i !== idx));
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] text-indigo-600 border-indigo-100 hover:bg-indigo-50/50 w-full mt-1 flex items-center justify-center gap-1 font-semibold"
                      onClick={() => setProposedList([...proposedList, ""])}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Poin
                    </Button>
                  </div>
                ) : (
                  <textarea
                    value={proposedText}
                    onChange={(e) => setProposedText(e.target.value)}
                    rows={8}
                    className="w-full text-xs p-2 border border-indigo-100 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 resize-y leading-relaxed font-medium min-h-[150px]"
                    placeholder="Hasil draf AI..."
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResolution(false)}
              className="w-full sm:w-auto h-9 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleApplyResolution}
              className="w-full sm:w-auto h-9 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Gunakan Rekomendasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
