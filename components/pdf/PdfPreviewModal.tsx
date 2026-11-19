"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSpjMetaDokumen } from "@/app/actions/pdf-meta";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// PDFViewer client-side only
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full w-full bg-slate-100 animate-pulse"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div> }
);

export type PdfConfig = {
  styles?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
    isSrikandi?: boolean;
  };
  content?: Record<string, any>;
  isSrikandi?: boolean;
};

const DEFAULT_STYLES = {
  marginTop: 28,
  marginBottom: 32,
  marginHorizontal: 40,
  fontSize: 11,
  lineHeight: 1.35,
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  spjId: string;
  docKey: string; // e.g., 'suratTugasPdf'
  initialConfig?: PdfConfig;
  defaultStyles?: PdfConfig['styles'];
  renderDocument: (config: PdfConfig) => React.ReactElement<any>;
  fields: {
    key: string;
    label: string;
    type: "text" | "textarea";
    placeholder?: string;
  }[];
};

export default function PdfPreviewModal({
  isOpen,
  onClose,
  title,
  spjId,
  docKey,
  initialConfig,
  defaultStyles,
  renderDocument,
  fields
}: Props) {
  const router = useRouter();
  const effectiveDefaults = useMemo(() => ({
    ...DEFAULT_STYLES,
    ...(defaultStyles || {})
  }), [defaultStyles]);

  const buildConfig = (init?: PdfConfig): PdfConfig => ({
    styles: {
      ...effectiveDefaults,
      ...(init?.styles || {})
    },
    content: {
      ...(init?.content || {})
    }
  });

  // Raw styles state allows empty strings while user is editing/typing
  const [styleInputs, setStyleInputs] = useState<Record<string, any>>(() => ({
    ...effectiveDefaults,
    ...(initialConfig?.styles || {})
  }));
  const [contentInputs, setContentInputs] = useState<Record<string, any>>(() => initialConfig?.content || {});
  const [isSrikandi, setIsSrikandi] = useState<boolean>(() => Boolean(initialConfig?.isSrikandi ?? initialConfig?.styles?.isSrikandi));
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever modal is opened or initialConfig changes
  useEffect(() => {
    if (isOpen) {
      setStyleInputs({
        ...effectiveDefaults,
        ...(initialConfig?.styles || {})
      });
      setContentInputs(initialConfig?.content || {});
      setIsSrikandi(Boolean(initialConfig?.isSrikandi ?? initialConfig?.styles?.isSrikandi));
    }
  }, [isOpen, initialConfig, effectiveDefaults]);

  const handleStyleChange = (key: string, value: string) => {
    setStyleInputs(prev => ({
      ...prev,
      [key]: value === "" ? "" : value
    }));
  };

  const handleContentChange = (key: string, value: string) => {
    setContentInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Resolved config passed to renderDocument and saved to DB
  const resolvedConfig: PdfConfig = useMemo(() => {
    const parseNum = (val: any, fallback: number) => {
      if (val === "" || val === undefined || val === null) return fallback;
      const n = typeof val === "number" ? val : parseFloat(val);
      return isNaN(n) ? fallback : n;
    };

    return {
      styles: {
        marginTop: parseNum(styleInputs.marginTop, effectiveDefaults.marginTop),
        marginBottom: parseNum(styleInputs.marginBottom, effectiveDefaults.marginBottom),
        marginHorizontal: parseNum(styleInputs.marginHorizontal, effectiveDefaults.marginHorizontal),
        fontSize: parseNum(styleInputs.fontSize, effectiveDefaults.fontSize),
        lineHeight: parseNum(styleInputs.lineHeight, effectiveDefaults.lineHeight),
        isSrikandi,
      },
      content: contentInputs,
      isSrikandi,
    };
  }, [styleInputs, contentInputs, effectiveDefaults, isSrikandi]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSpjMetaDokumen(spjId, { [docKey]: resolvedConfig });
      toast.success("Konfigurasi layout berhasil disimpan!");
      router.refresh();
    } catch (err: any) {
      toast.error("Gagal menyimpan konfigurasi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] w-full h-[100dvh] sm:h-[95vh] max-h-[100dvh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 [&>button[data-slot=dialog-close]]:hidden rounded-none sm:rounded-lg border-0 sm:border">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="text-base sm:text-xl font-bold leading-tight line-clamp-1 text-left">
              {title.toLowerCase().startsWith("pratinjau") ? title : `Pratinjau: ${title}`}
            </DialogTitle>
            
            {/* Toggle Format: Standar vs Versi Srikandi */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsSrikandi(false)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded transition-all",
                  !isSrikandi
                    ? "bg-white text-slate-800 shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                Standar
              </button>
              <button
                type="button"
                onClick={() => setIsSrikandi(true)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5",
                  isSrikandi
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", isSrikandi ? "bg-emerald-300 animate-pulse" : "bg-slate-400")} />
                Versi Srikandi
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            {/* Mobile Toggle */}
            <div className="flex sm:hidden items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setIsSrikandi(false)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium rounded",
                  !isSrikandi ? "bg-white text-slate-800 font-bold shadow-xs" : "text-slate-500"
                )}
              >
                Std
              </button>
              <button
                type="button"
                onClick={() => setIsSrikandi(true)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium rounded",
                  isSrikandi ? "bg-indigo-600 text-white font-bold shadow-xs" : "text-slate-500"
                )}
              >
                Srikandi
              </button>
            </div>

            <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4">
              {isSaving ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />}
              <span className="hidden sm:inline">Simpan Layout</span>
              <span className="sm:hidden">Simpan</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10 border border-slate-200">
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col-reverse lg:flex-row min-h-0">
          {/* Left Panel: Editor */}
          <div className="h-[40vh] lg:h-auto w-full lg:w-[350px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <Tabs defaultValue="layout" className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b border-slate-200 h-12 bg-slate-50 shrink-0">
                <TabsTrigger value="layout" className="flex-1 data-[state=active]:bg-white">Layout</TabsTrigger>
                <TabsTrigger value="content" className="flex-1 data-[state=active]:bg-white">Teks Override</TabsTrigger>
              </TabsList>
              
              <TabsContent value="layout" className="p-4 m-0 space-y-4">
                <div className="space-y-2">
                  <Label>Margin Atas (pt)</Label>
                  <Input type="number" value={styleInputs.marginTop ?? ""} onChange={e => handleStyleChange('marginTop', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Margin Bawah (pt)</Label>
                  <Input type="number" value={styleInputs.marginBottom ?? ""} onChange={e => handleStyleChange('marginBottom', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Margin Kiri & Kanan (pt)</Label>
                  <Input type="number" value={styleInputs.marginHorizontal ?? ""} onChange={e => handleStyleChange('marginHorizontal', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ukuran Font Base (pt)</Label>
                  <Input type="number" value={styleInputs.fontSize ?? ""} onChange={e => handleStyleChange('fontSize', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tinggi Baris (Line Height)</Label>
                  <Input type="number" step="0.05" value={styleInputs.lineHeight ?? ""} onChange={e => handleStyleChange('lineHeight', e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="content" className="p-4 m-0 space-y-4">
                <p className="text-xs text-slate-500 mb-2">
                  Isi jika ingin menimpa (override) teks bawaan dari database. Kosongkan untuk menggunakan default.
                </p>
                {fields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.type === 'textarea' ? (
                      <Textarea 
                        placeholder={field.placeholder} 
                        value={contentInputs[field.key] || ''}
                        onChange={e => handleContentChange(field.key, e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <Input 
                        placeholder={field.placeholder} 
                        value={contentInputs[field.key] || ''}
                        onChange={e => handleContentChange(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel: Live PDF Preview */}
          <div className="flex-1 h-full bg-slate-500 flex flex-col relative min-h-0">
            {isOpen && (
              <PDFViewer
                key={JSON.stringify(resolvedConfig)}
                width="100%"
                height="100%"
                className="border-none w-full h-full flex-1"
              >
                {renderDocument(resolvedConfig)}
              </PDFViewer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
