"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  ExternalLink,
  Eye,
  Trash2,
  Loader2,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";
import { toast } from "sonner";
import { deleteSpjBuktiDukung } from "@/app/actions/spj";
import {
  KATEGORI_BUKTI_OPTIONS,
  UploadedBuktiDukungItem,
} from "./SpjScannerModal";

interface SpjBuktiDukungCardProps {
  buktiList: UploadedBuktiDukungItem[];
  driveUrl?: string | null;
  onOpenScanner: () => void;
  onOpenEditDriveLink: () => void;
  onDeleted: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getKategoriLabel(val: string): string {
  return KATEGORI_BUKTI_OPTIONS.find((k) => k.value === val)?.label || val;
}

export default function SpjBuktiDukungCard({
  buktiList,
  driveUrl,
  onOpenScanner,
  onOpenEditDriveLink,
  onDeleted,
}: SpjBuktiDukungCardProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<UploadedBuktiDukungItem | null>(null);

  const handleCopyLink = async (item: UploadedBuktiDukungItem) => {
    try {
      const fullUrl =
        item.fileUrl.startsWith("/") && typeof window !== "undefined"
          ? `${window.location.origin}${item.fileUrl}`
          : item.fileUrl;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(item.id);
      toast.success("Link dokumen PDF berhasil disalin!");
      setTimeout(() => {
        setCopiedId((curr) => (curr === item.id ? null : curr));
      }, 2000);
    } catch {
      toast.error("Gagal menyalin link dokumen.");
    }
  };

  const handleDelete = async (item: UploadedBuktiDukungItem) => {
    if (!confirm(`Hapus dokumen PDF "${item.judul}" dari penyimpanan Cloudflare R2?`)) return;
    setDeletingId(item.id);
    try {
      await deleteSpjBuktiDukung(item.id);
      onDeleted(item.id);
      toast.success("Dokumen bukti dukung berhasil dihapus.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal menghapus bukti dukung.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between pt-3 pb-2.5 sm:p-5 bg-slate-50/40 border-b gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold truncate">
              Bukti Dukung SPJ (Scan PDF &amp; Arsip)
            </CardTitle>
            <Badge variant="secondary" className="text-[11px] font-bold tabular-nums">
              {buktiList.length} PDF
            </Badge>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onOpenScanner}
            className="h-8 sm:h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shrink-0"
          >
            Scan / Unggah PDF
          </Button>
        </CardHeader>

        <CardContent className="p-3 sm:p-5 space-y-4">
          {/* Pilihan Utama: Daftar PDF di Cloudflare R2 */}
          {buktiList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Belum ada dokumen PDF bukti dukung.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={onOpenScanner}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8 px-3.5"
              >
                Mulai Scan / Unggah PDF
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
              {buktiList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.judul}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-slate-500 tabular-nums">
                        <span className="font-semibold text-indigo-700">
                          {getKategoriLabel(item.kategori)}
                        </span>
                        <span>•</span>
                        <span>{item.jumlahHalaman} halaman</span>
                        <span>•</span>
                        <span>{formatBytes(item.fileSize)}</span>
                        <span>•</span>
                        <span>{formatWita(item.createdAt, "dd MMM yyyy HH:mm")} WITA</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(item)}
                      className="h-8 px-2.5 text-xs"
                      title="Salin link dokumen PDF"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Salin Link
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewItem(item)}
                      className="h-8 px-2.5 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Pratinjau
                    </Button>
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-2.5 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium"
                      title="Buka / Unduh PDF"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Buka
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item)}
                      className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Hapus dokumen"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pilihan Kedua: Tautan URL Eksternal / Google Drive */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-semibold shrink-0">
                Tautan URL Eksternal (Opsional):
              </span>
              {driveUrl ? (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline font-medium truncate inline-flex items-center gap-1"
                >
                  <span className="truncate">{driveUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Tidak ditautkan</span>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenEditDriveLink}
              className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900 self-start sm:self-auto shrink-0"
            >
              {driveUrl ? "Ubah Tautan URL" : "Tambah Tautan URL"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Pratinjau PDF Inline */}
      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 gap-0 flex flex-col overflow-hidden bg-white">
          <DialogHeader className="px-4 py-3 border-b border-slate-200 flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="text-sm font-bold text-slate-900 truncate pr-4">
              {previewItem?.judul || "Pratinjau Dokumen PDF"}
            </DialogTitle>
            {previewItem && (
              <div className="flex items-center gap-3 mr-6 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyLink(previewItem)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1"
                >
                  {copiedId === previewItem.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
                <a
                  href={previewItem.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  Buka Tab Baru <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 bg-slate-100 min-h-0">
            {previewItem && (
              <iframe
                src={previewItem.fileUrl}
                title={previewItem.judul}
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
