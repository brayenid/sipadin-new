"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  RotateCw,
  Crop,
  Check,
  X,
  Loader2,
  FileText,
  ArrowLeft,
  ArrowRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  CompilerPageItem,
  DEFAULT_CORNERS,
  FourCorners,
  ScanFilterMode,
  ScannedImagePage,
  compilePagesToPdf,
  processScannedImagePage,
  readFileAsDataUrl,
} from "@/lib/document-scanner";

export interface UploadedBuktiDukungItem {
  id: string;
  spjId: string;
  judul: string;
  kategori: string;
  fileUrl: string;
  fileKey?: string | null;
  mimeType: string;
  fileSize: number;
  jumlahHalaman: number;
  createdAt: string | Date;
}

interface SpjScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spjId: string;
  defaultTitle?: string;
  onUploaded: (item: UploadedBuktiDukungItem) => void;
}

export const KATEGORI_BUKTI_OPTIONS = [
  { value: "BUNDEL_SPJ", label: "Bundel SPJ Lengkap" },
  { value: "KUITANSI", label: "Kuitansi & Nota Belanja" },
  { value: "TRANSPORT", label: "Tiket / Boarding Pass / BBM" },
  { value: "PENGINAPAN", label: "Bill Hotel / Penginapan" },
  { value: "DOKUMENTASI", label: "Foto Dokumentasi Kegiatan" },
  { value: "LAINNYA", label: "Dokumen Pendukung Lainnya" },
];

const FILTER_OPTIONS: { id: ScanFilterMode; label: string }[] = [
  { id: "AUTO", label: "Jernih" },
  { id: "BW", label: "B&W" },
  { id: "GRAY", label: "Abu" },
  { id: "ORIGINAL", label: "Asli" },
];

type ModalView = "LIST" | "CAMERA" | "CROP";
type CornerKey = keyof FourCorners;

export default function SpjScannerModal({
  isOpen,
  onClose,
  spjId,
  defaultTitle,
  onUploaded,
}: SpjScannerModalProps) {
  const [view, setView] = useState<ModalView>("LIST");
  const [pages, setPages] = useState<CompilerPageItem[]>([]);
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState("BUNDEL_SPJ");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // File input refs
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Crop / Edit page state
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [draftCorners, setDraftCorners] = useState<FourCorners>(DEFAULT_CORNERS);
  const [draftFilter, setDraftFilter] = useState<ScanFilterMode>("AUTO");
  const [draftRotation, setDraftRotation] = useState<0 | 90 | 180 | 270>(0);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [draggingCorner, setDraggingCorner] = useState<CornerKey | null>(null);
  const cropStageRef = useRef<HTMLDivElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Reset saat modal dibuka/ditutup
  useEffect(() => {
    if (isOpen) {
      setJudul(defaultTitle || "Bukti Dukung SPJ");
      setKategori("BUNDEL_SPJ");
      setView("LIST");
      setCameraError(null);
      setUploadStage(null);
    } else {
      stopCamera();
      setPages([]);
      setEditingPageId(null);
      setView("LIST");
    }
  }, [isOpen, defaultTitle, stopCamera]);

  // Mulai kamera saat masuk view CAMERA
  useEffect(() => {
    if (view !== "CAMERA" || !isOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      setCameraError(null);
      setCameraReady(false);
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Browser tidak mendukung kamera langsung. Gunakan tombol Kamera Sistem.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err: any) {
        setCameraError(
          err?.name === "NotAllowedError"
            ? "Izin kamera ditolak. Izinkan akses kamera atau gunakan Kamera Sistem / Galeri."
            : "Kamera tidak terdeteksi pada perangkat ini. Silakan pilih foto dari galeri."
        );
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [view, isOpen, stopCamera]);

  const editingPage = pages.find(
    (p): p is ScannedImagePage => p.id === editingPageId && p.kind === "IMAGE"
  );

  // Render preview saat mode pratinjau aktif di editor crop
  useEffect(() => {
    if (view !== "CROP" || !showLivePreview || !editingPage) {
      setLivePreviewUrl(null);
      return;
    }
    let active = true;
    setIsRenderingPreview(true);
    processScannedImagePage({
      sourceDataUrl: editingPage.originalDataUrl,
      corners: draftCorners,
      filter: draftFilter,
      rotation: draftRotation,
      maxDimension: 1200,
      jpegQuality: 0.78,
    })
      .then((url) => {
        if (active) setLivePreviewUrl(url);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsRenderingPreview(false);
      });

    return () => {
      active = false;
    };
  }, [view, showLivePreview, editingPage, draftCorners, draftFilter, draftRotation]);

  const openCropEditor = (page: ScannedImagePage) => {
    setEditingPageId(page.id);
    setDraftCorners(page.corners);
    setDraftFilter(page.filter);
    setDraftRotation(page.rotation);
    setShowLivePreview(false);
    setLivePreviewUrl(null);
    setView("CROP");
  };

  const addImageFromDataUrl = async (dataUrl: string, fileName?: string, openCropAfter = false) => {
    setIsProcessing(true);
    try {
      const processedUrl = await processScannedImagePage({
        sourceDataUrl: dataUrl,
        corners: DEFAULT_CORNERS,
        filter: "AUTO",
        rotation: 0,
      });
      const newPage: ScannedImagePage = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        kind: "IMAGE",
        originalDataUrl: dataUrl,
        previewDataUrl: processedUrl,
        corners: DEFAULT_CORNERS,
        filter: "AUTO",
        rotation: 0,
        fileName,
      };
      setPages((prev) => [...prev, newPage]);
      if (openCropAfter) {
        openCropEditor(newPage);
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal memproses gambar.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureFromCamera = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    stopCamera();
    await addImageFromDataUrl(dataUrl, `scan_${pages.length + 1}.jpg`, true);
  };

  const handleFilesSelected = async (files: FileList | null, fromNativeCamera = false) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    try {
      const fileArray = Array.from(files);
      let firstNewImage: ScannedImagePage | null = null;

      for (const file of fileArray) {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const buf = new Uint8Array(await file.arrayBuffer());
          const loaded = await PDFDocument.load(buf);
          const pageCount = loaded.getPageCount();
          setPages((prev) => [
            ...prev,
            {
              id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              kind: "PDF",
              fileName: file.name,
              pageCount,
              pdfBytes: buf,
            },
          ]);
        } else if (file.type.startsWith("image/")) {
          const dataUrl = await readFileAsDataUrl(file);
          const processedUrl = await processScannedImagePage({
            sourceDataUrl: dataUrl,
            corners: DEFAULT_CORNERS,
            filter: "AUTO",
            rotation: 0,
          });
          const item: ScannedImagePage = {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            kind: "IMAGE",
            originalDataUrl: dataUrl,
            previewDataUrl: processedUrl,
            corners: DEFAULT_CORNERS,
            filter: "AUTO",
            rotation: 0,
            fileName: file.name,
          };
          setPages((prev) => [...prev, item]);
          if (!firstNewImage) firstNewImage = item;
        }
      }

      // Jika hanya 1 foto dari kamera HP, langsung buka editor 4-sudut agar bisa diluruskan
      if ((fromNativeCamera || fileArray.length === 1) && firstNewImage) {
        openCropEditor(firstNewImage);
      } else {
        setView("LIST");
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal membaca berkas yang dipilih.");
    } finally {
      setIsProcessing(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
    }
  };

  const handleSaveCropEdit = async (nextAction: "LIST" | "CAMERA" = "LIST") => {
    if (!editingPage) return;
    setIsProcessing(true);
    try {
      const processedUrl = await processScannedImagePage({
        sourceDataUrl: editingPage.originalDataUrl,
        corners: draftCorners,
        filter: draftFilter,
        rotation: draftRotation,
      });

      setPages((prev) =>
        prev.map((p) =>
          p.id === editingPage.id && p.kind === "IMAGE"
            ? {
                ...p,
                previewDataUrl: processedUrl,
                corners: draftCorners,
                filter: draftFilter,
                rotation: draftRotation,
              }
            : p
        )
      );
      setEditingPageId(null);
      setView(nextAction);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan hasil edit halaman.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickRotate = async (page: ScannedImagePage) => {
    const nextRot = ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    setIsProcessing(true);
    try {
      const processedUrl = await processScannedImagePage({
        sourceDataUrl: page.originalDataUrl,
        corners: page.corners,
        filter: page.filter,
        rotation: nextRot,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id && p.kind === "IMAGE"
            ? { ...p, rotation: nextRot, previewDataUrl: processedUrl }
            : p
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePage = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Drag corner logic (mendukung sentuhan jari & mouse)
  const updateCornerFromPointer = (clientX: number, clientY: number, corner: CornerKey) => {
    const stage = cropStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const nx = Math.max(0.01, Math.min(0.99, (clientX - rect.left) / rect.width));
    const ny = Math.max(0.01, Math.min(0.99, (clientY - rect.top) / rect.height));
    setDraftCorners((prev) => ({
      ...prev,
      [corner]: { x: nx, y: ny },
    }));
  };

  const totalPageCount = pages.reduce(
    (sum, item) => sum + (item.kind === "PDF" ? item.pageCount : 1),
    0
  );

  const handleCompileAndUpload = async () => {
    if (pages.length === 0) {
      toast.error("Tambahkan minimal 1 halaman dokumen terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    setUploadStage("Mengompilasi halaman menjadi PDF...");
    try {
      const { pdfBytes, totalPages } = await compilePagesToPdf(pages, {
        title: judul.trim() || "Bukti Dukung SPJ",
      });

      const pdfCopy = new Uint8Array(pdfBytes.byteLength);
      pdfCopy.set(pdfBytes);
      const pdfBlob = new Blob([pdfCopy.buffer], { type: "application/pdf" });
      if (pdfBlob.size > 20 * 1024 * 1024) {
        throw new Error(
          "Ukuran PDF hasil kompilasi melebihi 20 MB. Kurangi jumlah halaman atau gunakan filter Hitam-Putih."
        );
      }

      setUploadStage("Mengunggah PDF ke Cloudflare R2...");
      const formData = new FormData();
      formData.append("file", pdfBlob, "bukti-dukung.pdf");
      formData.append("spjId", spjId);
      formData.append("judul", judul.trim() || "Bukti Dukung SPJ");
      formData.append("kategori", kategori);
      formData.append("jumlahHalaman", String(totalPages));

      const res = await fetch("/api/spj/upload-bukti", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengunggah bukti dukung.");
      }

      toast.success(`Bukti dukung PDF (${totalPages} hal.) berhasil diunggah ke Cloudflare R2!`);
      onUploaded(json.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat kompilasi/unggah PDF.");
    } finally {
      setIsProcessing(false);
      setUploadStage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Hidden file inputs (selalu tersedia di semua view) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, false)}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files, true)}
      />

      {/* VIEW 1: FULL-SCREEN EDGE-TO-EDGE CAMERA (SEPERTI GOOGLE DRIVE) */}
      {view === "CAMERA" && (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-black text-white flex flex-col">
          <div className="relative flex-1 w-full h-full overflow-hidden bg-black flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center space-y-4 max-w-sm">
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  >
                    Kamera HP
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-slate-900 bg-white text-xs"
                  >
                    Pilih Foto / PDF
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center gap-2 text-xs text-slate-200">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyiapkan kamera...
                  </div>
                )}
              </>
            )}

            {/* Tombol Tutup Minimal di Kiri Atas */}
            <button
              type="button"
              onClick={() => setView("LIST")}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              title="Kembali"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter halaman jika sudah ada halaman sebelumnya */}
            {totalPageCount > 0 && (
              <button
                type="button"
                onClick={() => setView("LIST")}
                className="absolute top-4 right-4 h-9 px-3 rounded-full bg-black/55 backdrop-blur-xs text-white text-xs font-bold tabular-nums"
              >
                {totalPageCount} hal.
              </button>
            )}

            {/* Hanya Tombol Ambil Gambar di Bawah */}
            {!cameraError && (
              <div className="absolute bottom-7 inset-x-0 flex items-center justify-center">
                <button
                  type="button"
                  disabled={!cameraReady || isProcessing}
                  onClick={handleCaptureFromCamera}
                  className="w-[72px] h-[72px] rounded-full bg-white/95 border-4 border-white/60 active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center shadow-xl"
                  title="Ambil Gambar"
                >
                  <span className="w-14 h-14 rounded-full bg-white border-2 border-slate-900/15 block" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL-SCREEN SEDERHANA LURUSKAN SUDUT & FILTER */}
      {view === "CROP" && editingPage && (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-slate-950 text-white flex flex-col">
          {/* Top Bar Ringkas */}
          <div className="shrink-0 h-12 px-3 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setEditingPageId(null);
                setView("LIST");
              }}
              className="w-9 h-9 rounded-full hover:bg-slate-800 text-slate-200 flex items-center justify-center"
              title="Batal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setDraftRotation(((draftRotation + 90) % 360) as 0 | 90 | 180 | 270)
                }
                className="h-8 px-2.5 rounded-md text-xs font-semibold text-slate-200 hover:bg-slate-800 inline-flex items-center gap-1"
                title="Putar 90 derajat"
              >
                <RotateCw className="w-4 h-4" />
                <span>Putar</span>
              </button>
              <button
                type="button"
                onClick={() => setDraftCorners(DEFAULT_CORNERS)}
                className="h-8 px-2.5 rounded-md text-xs font-semibold text-slate-200 hover:bg-slate-800 inline-flex items-center gap-1"
                title="Reset sudut"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setShowLivePreview((prev) => !prev)}
                className={`h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                  showLivePreview
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                {showLivePreview ? <Crop className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showLivePreview ? "Sudut" : "Lihat"}</span>
              </button>
            </div>
          </div>

          {/* Area Gambar Penuh */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden">
            {showLivePreview ? (
              <div className="w-full h-full flex items-center justify-center">
                {isRenderingPreview || !livePreviewUrl ? (
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  <img
                    src={livePreviewUrl}
                    alt="Pratinjau"
                    className="max-h-full max-w-full object-contain rounded bg-white shadow-xl"
                  />
                )}
              </div>
            ) : (
              <div
                ref={cropStageRef}
                className="relative inline-flex max-h-full max-w-full select-none touch-none"
                onPointerMove={(e) => {
                  if (!draggingCorner) return;
                  e.preventDefault();
                  updateCornerFromPointer(e.clientX, e.clientY, draggingCorner);
                }}
                onPointerUp={() => setDraggingCorner(null)}
                onPointerCancel={() => setDraggingCorner(null)}
              >
                <img
                  src={editingPage.originalDataUrl}
                  alt="Atur sudut dokumen"
                  draggable={false}
                  className="max-h-[calc(100dvh-190px)] max-w-full object-contain block pointer-events-none"
                />

                {/* Garis Poligon 4 Sudut */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={`${draftCorners.tl.x * 100},${draftCorners.tl.y * 100} ${draftCorners.tr.x * 100},${draftCorners.tr.y * 100} ${draftCorners.br.x * 100},${draftCorners.br.y * 100} ${draftCorners.bl.x * 100},${draftCorners.bl.y * 100}`}
                    fill="rgba(59, 130, 246, 0.14)"
                    stroke="#3b82f6"
                    strokeWidth="0.9"
                  />
                </svg>

                {/* 4 Draggable Corner Handles */}
                {(["tl", "tr", "br", "bl"] as CornerKey[]).map((key) => {
                  const pt = draftCorners[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setDraggingCorner(key);
                      }}
                      style={{
                        left: `${pt.x * 100}%`,
                        top: `${pt.y * 100}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/90 border-2 border-white shadow-lg cursor-move flex items-center justify-center touch-none active:scale-110"
                      title="Geser sudut"
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kontrol Bawah Sederhana: 1 Baris Filter + 1 Baris Tombol */}
          <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-3 pt-2.5 pb-4 space-y-2.5 max-w-xl w-full mx-auto">
            <div className="grid grid-cols-4 gap-1.5">
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDraftFilter(f.id)}
                  className={`h-8 rounded-md text-xs font-semibold border transition-colors ${
                    draftFilter === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing}
                onClick={() => handleSaveCropEdit("CAMERA")}
                className="h-10 bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs font-semibold"
              >
                + Scan Lagi
              </Button>
              <Button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSaveCropEdit("LIST")}
                className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Selesai"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DIALOG DAFTAR HALAMAN & KOMPILASI PDF */}
      <Dialog
        open={isOpen && view === "LIST"}
        onOpenChange={(open) => !open && !isProcessing && onClose()}
      >
        <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xl">
          <DialogHeader className="px-4 py-3.5 sm:px-5 bg-slate-50 border-b border-slate-200">
            <DialogTitle className="text-sm sm:text-base font-bold text-slate-900">
              Scan &amp; Kompilasi PDF Bukti Dukung
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Pindai halaman atau pilih foto/PDF untuk dikompilasi ke 1 PDF di Cloudflare R2.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
            {pages.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50/60 space-y-3">
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-sm font-semibold text-slate-900">
                    Pilih sumber dokumen untuk dikompilasi ke PDF
                  </p>
                  <p className="text-xs text-slate-500">
                    Bisa pindai beberapa halaman beruntun dari kamera atau pilih foto/PDF dari perangkat.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setView("CAMERA")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 px-4"
                  >
                    Scan Kamera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isProcessing}
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-xs font-semibold h-9 px-4 border-slate-300 bg-white"
                  >
                    Pilih Foto / PDF
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Grid Multi-Halaman */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {pages.map((item, idx) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex flex-col shadow-2xs"
                    >
                      <div className="relative aspect-[3/4] bg-slate-200/70 flex items-center justify-center overflow-hidden">
                        {item.kind === "IMAGE" ? (
                          <img
                            src={item.previewDataUrl}
                            alt={`Halaman ${idx + 1}`}
                            className="w-full h-full object-contain bg-white"
                          />
                        ) : (
                          <div className="p-3 text-center space-y-1.5">
                            <FileText className="w-8 h-8 text-rose-600 mx-auto" />
                            <p className="text-[11px] font-bold text-slate-800 line-clamp-2 break-all">
                              {item.fileName}
                            </p>
                            <span className="inline-block text-[10px] font-semibold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                              PDF • {item.pageCount} hal.
                            </span>
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold tabular-nums">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="p-1.5 bg-white border-t border-slate-200 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePage(idx, -1)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                            title="Geser kiri"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === pages.length - 1}
                            onClick={() => handleMovePage(idx, 1)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30"
                            title="Geser kanan"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {item.kind === "IMAGE" && (
                            <>
                              <button
                                type="button"
                                onClick={() => openCropEditor(item)}
                                className="p-1 rounded hover:bg-indigo-50 text-indigo-700"
                                title="Crop 4-Sudut & Filter"
                              >
                                <Crop className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickRotate(item)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-700"
                                title="Putar 90 derajat"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePage(item.id)}
                            className="p-1 rounded hover:bg-rose-50 text-rose-600"
                            title="Hapus halaman"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Kartu + Tambah Halaman */}
                  <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/70 aspect-[3/4] flex flex-col items-center justify-center gap-2 p-2.5 text-center">
                    <span className="text-[11px] font-bold text-slate-700">Tambah Halaman</span>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => setView("CAMERA")}
                      className="w-full h-7 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Camera className="w-3 h-3 mr-1" />
                      Kamera
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isProcessing}
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full h-7 text-[11px]"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Foto / PDF
                    </Button>
                  </div>
                </div>

                {/* Metadata Dokumen & Tombol Simpan ke R2 */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Judul Dokumen PDF
                      </Label>
                      <Input
                        value={judul}
                        onChange={(e) => setJudul(e.target.value)}
                        placeholder="Contoh: Bundel Kuitansi & Nota SPJ"
                        className="h-9 text-xs bg-white"
                      />
                    </div>
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Kategori</Label>
                      <select
                        value={kategori}
                        onChange={(e) => setKategori(e.target.value)}
                        className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                      >
                        {KATEGORI_BUKTI_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-600">
                      Siap dikompilasi:{" "}
                      <span className="font-bold text-slate-900 tabular-nums">
                        {totalPageCount} halaman
                      </span>{" "}
                      menjadi 1 file PDF di Cloudflare R2
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        onClick={onClose}
                        className="h-9 text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isProcessing || pages.length === 0}
                        onClick={handleCompileAndUpload}
                        className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            {uploadStage || "Memproses..."}
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Kompilasi PDF &amp; Unggah ke R2
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
