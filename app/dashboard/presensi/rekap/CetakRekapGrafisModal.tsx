"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import RekapGrafisCanvas from "./grafis/RekapGrafisCanvas";
import { buildGrafisData, type GrafisData, type GrafisInput } from "./grafis/buildGrafisData";
import { copySvgAsPngToClipboard, downloadSvgAsPng } from "@/lib/export-svg-png";

export default function CetakRekapGrafisModal({
  isOpen,
  onClose,
  periodeLabel,
  kategoriLabel,
  data,
}: {
  isOpen: boolean;
  onClose: () => void;
  periodeLabel: string;
  kategoriLabel: string;
  data: GrafisInput;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState<"download" | "copy" | null>(null);
  const [grafisData, setGrafisData] = useState<GrafisData | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  // Jalankan kalkulasi di micro-delay agar animasi dialog modal tetap 60fps tanpa lag
  useEffect(() => {
    let active = true;
    setIsPreparing(true);
    const timer = setTimeout(() => {
      const res = buildGrafisData(data);
      if (active) {
        setGrafisData(res);
        setIsPreparing(false);
      }
    }, 20);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [data]);

  const tanggalCetak = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar",
      }).format(new Date()),
    []
  );

  const slug = periodeLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const handleDownload = async () => {
    if (!svgRef.current) return;
    setBusy("download");
    try {
      await downloadSvgAsPng(svgRef.current, `rekap-kehadiran-${slug || "periode"}.png`, 2);
      toast.success("Gambar PNG berhasil diunduh.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunduh PNG.");
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    if (!svgRef.current) return;
    setBusy("copy");
    try {
      await copySvgAsPngToClipboard(svgRef.current, 2);
      toast.success("Gambar disalin ke clipboard.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyalin gambar.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] !max-w-[94vw] sm:!max-w-[1100px] h-[92vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-row items-center justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Grafis Kehadiran (PNG)
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Infografis ringkas: KPI, status, eselon, Top 5 pegawai, peringkat OPD, dan peta kehadiran per bulan.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mr-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={busy !== null || isPreparing || !grafisData}
              className="h-9 text-xs"
            >
              {busy === "copy" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              Salin
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={busy !== null || isPreparing || !grafisData}
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {busy === "download" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
              Unduh PNG
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 mt-3 overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2 sm:p-4">
          {isPreparing || !grafisData ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Menyiapkan infografis kehadiran...</p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[900px] shadow-sm [&>svg]:w-full [&>svg]:h-auto">
              <RekapGrafisCanvas
                ref={svgRef}
                data={grafisData}
                periodeLabel={periodeLabel}
                kategoriLabel={kategoriLabel}
                tanggalCetak={tanggalCetak}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
