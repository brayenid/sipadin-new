"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check, ExternalLink, Download, Sparkles, Eye } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export default function QrCodeModal({
  isOpen,
  onClose,
  agendaId,
  publicToken,
  namaKegiatan,
  tanggal,
  waktu,
  tempat,
}: {
  isOpen: boolean;
  onClose: () => void;
  agendaId?: string;
  publicToken: string | null;
  namaKegiatan: string;
  tanggal?: string;
  waktu?: string;
  tempat?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedMonitor, setCopiedMonitor] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = publicToken ? `${baseUrl}/p/presensi/${publicToken}` : (agendaId ? `${baseUrl}/p/presensi/${agendaId}` : "");
  const monitorUrl = agendaId ? `${baseUrl}/p/presensi/${agendaId}/monitor` : "";

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

  const handleCopyMonitorLink = () => {
    if (!monitorUrl) return;
    navigator.clipboard.writeText(monitorUrl);
    setCopiedMonitor(true);
    toast.success("Tautan live monitor disalin ke clipboard");
    setTimeout(() => setCopiedMonitor(false), 2500);
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

      // 2. Muat Logo Lambang Kutai Barat (Atas) & Logo SIPADIN (Bawah)
      const kubarImg = new Image();
      kubarImg.crossOrigin = "anonymous";
      kubarImg.src = "/logo.png";
      let kubarLoaded = false;

      const sipadinImg = new Image();
      sipadinImg.crossOrigin = "anonymous";
      sipadinImg.src = "/sipadin.png";
      let sipadinLoaded = false;

      await Promise.all([
        new Promise((res) => {
          kubarImg.onload = () => {
            kubarLoaded = true;
            res(true);
          };
          kubarImg.onerror = () => res(false);
        }),
        new Promise((res) => {
          sipadinImg.onload = () => {
            sipadinLoaded = true;
            res(true);
          };
          sipadinImg.onerror = () => res(false);
        }),
      ]);

      // 3. Setup Layout & Dimensi Canvas
      const canvasWidth = 720;
      const topPadding = 36; // Jarak pinggir atas ke logo Kutai Barat
      const kubarTargetHeight = 96; // Logo Kubar proporsional & gagah
      const kubarTargetWidth = kubarLoaded && kubarImg.height > 0
        ? (kubarImg.width / kubarImg.height) * kubarTargetHeight
        : 80;
      const kubarX = (canvasWidth - kubarTargetWidth) / 2;

      // Teks Judul FORMULIR KEHADIRAN di bawah logo Kubar
      const textHeaderY = topPadding + kubarTargetHeight + 36;

      // Dimensi Card QR Code dengan Gradient Aksen
      const qrSize = 460;
      const qrCardPadding = 20;
      const qrCardW = qrSize + qrCardPadding * 2;
      const qrCardH = qrSize + qrCardPadding * 2;
      const qrCardX = (canvasWidth - qrCardW) / 2;
      const qrCardY = textHeaderY + 26; // Jarak aman di bawah FORMULIR KEHADIRAN

      const qrX = qrCardX + qrCardPadding;
      const qrY = qrCardY + qrCardPadding;
      const qrCardBottom = qrCardY + qrCardH;

      // Dummy canvas untuk mengukur ketinggian teks dinamis
      const maxTextWidth = canvasWidth - 80;
      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");

      // 1. Keterangan instruksi absen singkat
      const instructionText = "Pindai QR Code untuk mengisi presensi mandiri";
      const instLineHeight = 28;
      let instructionLines: string[] = [];
      if (measureCtx) {
        measureCtx.font = "18px system-ui, -apple-system, sans-serif";
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

      // 2. Judul Agenda (Di Bawah Keterangan Instruksi, Diperbesar 28px bold)
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

      // Hitung posisi Y masing-masing elemen dengan jarak lega dari batas bawah card (qrCardBottom)
      const startInstY = qrCardBottom + 36;
      const startTitleY = startInstY + (instructionLines.length * instLineHeight) + 14;
      const startMetaY = startTitleY + (titleLines.length * titleLineHeight) + 14;
      
      let metaCount = 0;
      if (tanggal || waktu) metaCount++;
      if (tempat) metaCount++;
      const endMetaY = startMetaY + (metaCount * 26);

      // Dimensi Logo SIPADIN di Bagian Bawah (Diperbesar sedikit dan diberi teks Bagian Organisasi)
      const gapToSipadin = 60;
      const sipadinTargetWidth = 140;
      const sipadinTargetHeight = sipadinLoaded && sipadinImg.width > 0
        ? (sipadinImg.height / sipadinImg.width) * sipadinTargetWidth
        : 36;
      const sipadinX = (canvasWidth - sipadinTargetWidth) / 2;
      const sipadinY = endMetaY + gapToSipadin;
      const textOrgY = sipadinY + sipadinTargetHeight + 16;

      const totalCanvasHeight = Math.max(1090, textOrgY + 45);

      // Render Final Canvas
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = totalCanvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background Putih Bersih
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, totalCanvasHeight);

      // 1. Gambar Logo Lambang Kutai Barat di Atas
      if (kubarLoaded && kubarImg.width > 0) {
        ctx.drawImage(kubarImg, kubarX, topPadding, kubarTargetWidth, kubarTargetHeight);
      }

      // 2. Teks FORMULIR KEHADIRAN di bawah Logo Atas
      ctx.save();
      ctx.fillStyle = "#475569"; // Soft slate
      ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("FORMULIR KEHADIRAN", canvasWidth / 2, textHeaderY);
      ctx.restore();

      // 3. Gambar Card Aksen Gradient di Belakang QR Code
      const qrCardRadius = 24;

      ctx.save();
      const qrCardGrad = ctx.createLinearGradient(qrCardX, qrCardY, qrCardX + qrCardW, qrCardY + qrCardH);
      qrCardGrad.addColorStop(0, "#f8faff");
      qrCardGrad.addColorStop(0.5, "#ffffff");
      qrCardGrad.addColorStop(1, "#eff4ff");

      ctx.beginPath();
      if (typeof (ctx as any).roundRect === "function") {
        (ctx as any).roundRect(qrCardX, qrCardY, qrCardW, qrCardH, qrCardRadius);
      } else {
        const r = qrCardRadius;
        ctx.moveTo(qrCardX + r, qrCardY);
        ctx.arcTo(qrCardX + qrCardW, qrCardY, qrCardX + qrCardW, qrCardY + qrCardH, r);
        ctx.arcTo(qrCardX + qrCardW, qrCardY + qrCardH, qrCardX, qrCardY + qrCardH, r);
        ctx.arcTo(qrCardX, qrCardY + qrCardH, qrCardX, qrCardY, r);
        ctx.arcTo(qrCardX, qrCardY, qrCardX + qrCardW, qrCardY, r);
        ctx.closePath();
      }
      ctx.fillStyle = qrCardGrad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(199, 210, 254, 0.8)";
      ctx.stroke();
      ctx.restore();

      // Gambar QR Code di Tengah Card
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 4. Gambar Keterangan Singkat Absen
      ctx.save();
      ctx.fillStyle = "#64748b";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      let yInst = startInstY;
      for (const line of instructionLines) {
        ctx.fillText(line, canvasWidth / 2, yInst);
        yInst += instLineHeight;
      }

      // 5. Gambar Judul Kegiatan (Lebih Besar 28px bold)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
      let yText = startTitleY;
      for (const line of titleLines) {
        ctx.fillText(line, canvasWidth / 2, yText);
        yText += titleLineHeight;
      }

      // 6. Gambar Informasi Tempat & Waktu (Meta 16px)
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
      ctx.restore();

      // 7. Gambar Logo SIPADIN di Bagian Bawah (Diperbesar & Opacity Lembut)
      if (sipadinLoaded && sipadinImg.width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.filter = "grayscale(100%)";
        ctx.drawImage(sipadinImg, sipadinX, sipadinY, sipadinTargetWidth, sipadinTargetHeight);
        ctx.restore();
      }

      // 8. Teks "Bagian Organisasi" di Bawah Logo SIPADIN
      ctx.save();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 13px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Bagian Organisasi", canvasWidth / 2, textOrgY);
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
            <div className="p-3 bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 border border-indigo-100/90 rounded-2xl shadow-xs">
              <img
                src={qrDataUrl}
                alt="QR Code Presensi"
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl bg-white shadow-2xs"
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

          {/* Live Monitor Link Card */}
          {monitorUrl && (
            <div className="mt-1 p-2 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold text-indigo-900 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-indigo-600" />
                  Tautan Pemantau (Live Monitor):
                </span>
                <span className="text-[9.5px] font-semibold text-indigo-600 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                  Read-Only
                </span>
              </div>
              <div className="flex items-center justify-between p-1 pl-2 bg-white border border-indigo-200/80 rounded-lg text-xs overflow-hidden">
                <span className="font-mono text-slate-600 truncate text-[10.5px] pr-2">
                  {monitorUrl}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMonitorLink}
                  className="h-6 px-2 text-indigo-700 font-bold shrink-0 hover:bg-indigo-50 bg-indigo-50/80 border border-indigo-200/60 rounded text-[11px]"
                >
                  {copiedMonitor ? <Check className="w-3 h-3 mr-1 text-emerald-600" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedMonitor ? "Tersalin" : "Salin"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
