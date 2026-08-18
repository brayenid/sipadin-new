"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check, ExternalLink, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function QrCodeModal({
  isOpen,
  onClose,
  publicToken,
  namaKegiatan,
  tanggal,
  waktu,
  tempat,
}: {
  isOpen: boolean;
  onClose: () => void;
  publicToken: string | null;
  namaKegiatan: string;
  tanggal?: string;
  waktu?: string;
  tempat?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = publicToken ? `${baseUrl}/p/absensi/${publicToken}` : "";

  useEffect(() => {
    if (publicUrl && isOpen) {
      QRCode.toDataURL(publicUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: "#1e1b4b", // Deep indigo
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [publicUrl, isOpen]);

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Tautan presensi disalin ke clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = async () => {
    if (!publicUrl) return;
    setIsDownloading(true);

    try {
      // 1. Generate QR Code resolusi tinggi
      const qrData = await QRCode.toDataURL(publicUrl, {
        width: 600,
        margin: 1,
        color: {
          dark: "#0f172a", // Slate 900
          light: "#ffffff",
        },
      });

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrData;
      await new Promise((res, rej) => {
        qrImg.onload = res;
        qrImg.onerror = rej;
      });

      // 2. Muat Logo SIPADIN
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.src = "/sipadin.png";
      let logoLoaded = false;
      try {
        await new Promise((res) => {
          logoImg.onload = () => {
            logoLoaded = true;
            res(true);
          };
          logoImg.onerror = () => res(false);
        });
      } catch {
        logoLoaded = false;
      }

      // 3. Setup Layout & Dimensi Canvas
      const canvasWidth = 720;
      const topPadding = 50; // Jarak pinggir atas ke logo
      const logoTargetWidth = 175; // Logo SIPADIN lebih besar
      const logoTargetHeight = logoLoaded && logoImg.width > 0 
        ? (logoImg.height / logoImg.width) * logoTargetWidth 
        : 48;

      // Jarak logo ke QR sejajar dengan jarak atas ke logo
      const gapToQr = topPadding;
      const qrY = topPadding + logoTargetHeight + gapToQr;
      const qrSize = 480;
      const qrX = (canvasWidth - qrSize) / 2;

      // Dummy canvas untuk mengukur ketinggian teks dinamis
      const maxTextWidth = canvasWidth - 80;
      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");

      // 1. Keterangan instruksi absen (Di Atas Judul Agenda)
      const instructionText = "Pindai QR Code di atas menggunakan kamera ponsel untuk mengisi absensi secara mandiri.";
      const instLineHeight = 36;
      let instructionLines: string[] = [];
      if (measureCtx) {
        measureCtx.font = "24px system-ui, -apple-system, sans-serif";
        const instWords = instructionText.split(" ");
        let cur = "";
        for (let n = 0; n < instWords.length; n++) {
          const test = cur + instWords[n] + " ";
          if (measureCtx.measureText(test).width > maxTextWidth && n > 0) {
            instructionLines.push(cur.trim());
            cur = instWords[n] + " ";
          } else {
            cur = test;
          }
        }
        if (cur) instructionLines.push(cur.trim());
      } else {
        instructionLines = [instructionText];
      }

      // 2. Judul Agenda (Di Bawah Keterangan Instruksi, Diperbesar 28px)
      const titleLineHeight = 36;
      const titleWords = namaKegiatan.split(" ");
      let titleLines: string[] = [];
      if (measureCtx) {
        measureCtx.font = "bold 28px system-ui, -apple-system, sans-serif";
        let currentLine = "";
        for (let n = 0; n < titleWords.length; n++) {
          const testLine = currentLine + titleWords[n] + " ";
          const metrics = measureCtx.measureText(testLine);
          if (metrics.width > maxTextWidth && n > 0) {
            titleLines.push(currentLine.trim());
            currentLine = titleWords[n] + " ";
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) titleLines.push(currentLine.trim());
      } else {
        titleLines = [namaKegiatan];
      }

      // Hitung posisi Y masing-masing elemen
      const startInstY = qrY + qrSize + 36;
      const startTitleY = startInstY + (instructionLines.length * instLineHeight) + 16;
      const startMetaY = startTitleY + (titleLines.length * titleLineHeight) + 16;
      
      let metaCount = 0;
      if (tanggal || waktu) metaCount++;
      if (tempat) metaCount++;
      const endMetaY = startMetaY + (metaCount * 26);
      const footerY = endMetaY + 20;

      const totalCanvasHeight = Math.max(980, footerY + 50);

      // Render Final Canvas
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = totalCanvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background Putih Bersih
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, totalCanvasHeight);

      // Gambar Logo SIPADIN di Atas (Hitam Putih & Opacity Sedang)
      if (logoLoaded && logoImg.width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.45; // Opacity sedang
        ctx.filter = "grayscale(100%)"; // Hitam putih
        const logoX = (canvasWidth - logoTargetWidth) / 2;
        ctx.drawImage(logoImg, logoX, topPadding, logoTargetWidth, logoTargetHeight);
        ctx.restore();
      }

      // Gambar QR Code di Tengah
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 1. Gambar Keterangan Singkat Absen (Di Atas Judul)
      ctx.save();
      ctx.fillStyle = "#475569";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      let yInst = startInstY;
      for (const line of instructionLines) {
        ctx.fillText(line, canvasWidth / 2, yInst);
        yInst += instLineHeight;
      }

      // 2. Gambar Judul Kegiatan (Lebih Besar 28px bold)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
      let yText = startTitleY;
      for (const line of titleLines) {
        ctx.fillText(line, canvasWidth / 2, yText);
        yText += titleLineHeight;
      }

      // 3. Gambar Informasi Tempat & Waktu (Meta Lebih Besar 16px)
      ctx.fillStyle = "#334155";
      ctx.font = "16px system-ui, -apple-system, sans-serif";
      let yMeta = startMetaY;

      if (tanggal || waktu) {
        const timeMeta = [tanggal, waktu].filter(Boolean).join(" • ");
        ctx.fillText(`Waktu: ${timeMeta}`, canvasWidth / 2, yMeta);
        yMeta += 26;
      }

      if (tempat) {
        ctx.fillText(`Lokasi: ${tempat}`, canvasWidth / 2, yMeta);
        yMeta += 26;
      }

      // 4. Watermark footer identitas
      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px system-ui, -apple-system, sans-serif";
      ctx.fillText("Pemerintah Kabupaten Kutai Barat", canvasWidth / 2, yMeta + 12);
      ctx.restore();

      // Download file PNG
      const finalDataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = finalDataUrl;
      const safeName = namaKegiatan.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
      a.download = `QR_Absensi_${safeName}.png`;
      a.click();
      toast.success("Gambar QR Code berhasil diunduh");
    } catch (err) {
      console.error("Error creating QR download canvas:", err);
      if (qrDataUrl) {
        const a = document.createElement("a");
        a.href = qrDataUrl;
        a.download = `QR_Absensi_${namaKegiatan.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.png`;
        a.click();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="!flex !flex-col !gap-0 !max-w-[390px] sm:!max-w-[390px] w-[90vw] max-h-[88vh] overflow-y-auto text-center p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maxWidth: "390px" }}
      >
        <DialogHeader className="p-0 space-y-1">
          <div className="mx-auto w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1">
            <QrCode className="w-5 h-5" />
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
            QR Code Presensi Mandiri
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 line-clamp-1 max-w-[280px] mx-auto">
            {namaKegiatan}
          </DialogDescription>
        </DialogHeader>

        {/* QR Display Card */}
        <div className="mt-3.5 mb-1 flex flex-col items-center justify-center">
          {qrDataUrl ? (
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-2xs">
              <img
                src={qrDataUrl}
                alt="QR Code Presensi"
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl bg-white"
              />
            </div>
          ) : (
            <div className="w-44 h-44 sm:w-48 sm:h-48 bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">
              Menyiapkan QR Code...
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-2.5 max-w-[260px] leading-relaxed">
            Tampilkan QR Code ini di layar proyektor atau bagikan tautan kepada peserta rapat.
          </p>
        </div>

        {/* Action Controls */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between p-1.5 pl-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs overflow-hidden">
            <span className="font-mono text-slate-600 truncate text-[11px] pr-2 text-left">
              {publicUrl}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="h-7 px-2.5 text-indigo-600 font-bold shrink-0 hover:bg-indigo-50 bg-white border border-slate-200/60 rounded-lg text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl || isDownloading}
              className="text-xs font-semibold h-8.5 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {isDownloading ? "Mengunduh..." : "Unduh Gambar"}
            </Button>

            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button
                type="button"
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 rounded-xl shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Buka Halaman
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
