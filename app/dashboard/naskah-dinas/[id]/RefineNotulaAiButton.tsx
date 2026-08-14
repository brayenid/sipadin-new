"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Loader2,
  CheckCheck,
  ListOrdered,
  MessagesSquare,
  FileCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { refineNotulaAi, RefineNotulaInput } from "@/app/actions/ai-notula";
import { AiNotulaInitData } from "./InitNotulaAiModal";

export default function RefineNotulaAiButton({
  currentHtml,
  aiInitData,
  onApplyRefinedContent,
}: {
  currentHtml: string;
  aiInitData?: AiNotulaInitData | null;
  onApplyRefinedContent: (refinedHtml: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  const handleRefine = async (mode: "grammar" | "conclusion" | "discussion" | "expand" | "custom", customText?: string) => {
    if (!currentHtml || currentHtml.trim() === "<p></p>" || currentHtml.trim() === "") {
      toast.error("Editor Notula masih kosong. Tulis draf atau gunakan 'Init AI' terlebih dahulu.");
      return;
    }

    if (mode === "custom" && !customText?.trim()) {
      toast.error("Harap ketikkan instruksi khusus.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Groq AI sedang menyempurnakan naskah notula...");

    try {
      const input: RefineNotulaInput = {
        currentHtml,
        mode,
        instruction: customText?.trim() || undefined,
        aiInitData: {
          catatanRapat: aiInitData?.catatanRapat,
        },
      };

      const res = await refineNotulaAi(input);

      if (!res.htmlContent) {
        throw new Error("AI tidak menghasilkan teks respon.");
      }

      onApplyRefinedContent(res.htmlContent);
      toast.success(`Naskah Notula berhasil disempurnakan oleh ${res.source} AI!`, { id: toastId });
      setOpen(false);
      setCustomInstruction("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menyempurnakan naskah dengan AI.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Refine AI</span>
          </Button>
        }
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
        <span>Refine AI</span>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-[360px] sm:w-[380px] p-3 bg-white shadow-xl rounded-xl border border-slate-200 text-xs space-y-3 z-50"
      >
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Asisten AI Notula</span>
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
            Groq Llama 3.3
          </span>
        </div>

        {/* Quick Action Presets */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500 mb-1">Aksi Cepat:</p>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => handleRefine("grammar")}
            className="w-full justify-start h-8 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 gap-2 px-2 text-left"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Rapikan Ejaan & Tata Bahasa (EYD)</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => handleRefine("conclusion")}
            className="w-full justify-start h-8 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 gap-2 px-2 text-left"
          >
            <ListOrdered className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Pertajam Butir Kesimpulan & Tindak Lanjut</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => handleRefine("discussion")}
            className="w-full justify-start h-8 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 gap-2 px-2 text-left"
          >
            <MessagesSquare className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="truncate">Lengkapi Sesi Diskusi & Tanya Jawab OPD</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => handleRefine("expand")}
            className="w-full justify-start h-8 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 gap-2 px-2 text-left"
          >
            <FileCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Perdalam Seluruh Pembahasan Materi</span>
          </Button>
        </div>

        {/* Custom Instruction Input */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500">Instruksi Kustom:</p>
          <div className="flex gap-1.5">
            <Input
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleRefine("custom", customInstruction);
                }
              }}
              placeholder="Contoh: Tambahkan tanggapan dari Inspektorat..."
              disabled={loading}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              size="sm"
              disabled={loading || !customInstruction.trim()}
              onClick={() => handleRefine("custom", customInstruction)}
              className="h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              title="Kirim Instruksi"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
