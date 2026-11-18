"use client";

import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  Share2,
  Copy,
  ExternalLink,
  Check,
  Loader2,
  Tv2,
  Trash2,
  Power,
  ShieldCheck,
  Calendar,
  Building2,
} from "lucide-react";
import {
  createRekapSharedToken,
  getRekapSharedTokens,
  toggleRekapSharedTokenActive,
  deleteRekapSharedToken,
} from "@/app/actions/absensi";

interface BagikanRekapLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodeLabel: string;
  kategoriLabel: string;
  startDate: string;
  endDate: string;
  kategoriAgenda: "ALL" | "RAPAT" | "APEL" | "RUTIN";
  selectedUnits: string[];
  onlyInvited: boolean;
}

export default function BagikanRekapLiveModal({
  isOpen,
  onClose,
  periodeLabel,
  kategoriLabel,
  startDate,
  endDate,
  kategoriAgenda,
  selectedUnits,
  onlyInvited,
}: BagikanRekapLiveModalProps) {
  const [title, setTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // List of active shared tokens
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  const fetchTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const data = await getRekapSharedTokens();
      setTokens(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTitle(`Rekap Kehadiran - ${periodeLabel} (${kategoriLabel})`);
      setCreatedUrl(null);
      setCopied(false);
      fetchTokens();
    }
  }, [isOpen, periodeLabel, kategoriLabel]);

  const handleCreateToken = async () => {
    setIsGenerating(true);
    try {
      const res = await createRekapSharedToken({
        title,
        startDate,
        endDate,
        kategoriAgenda,
        selectedUnits,
        onlyInvited,
      });

      if (res.success && res.token) {
        const fullUrl = `${window.location.origin}/p/rekap/${res.token}`;
        setCreatedUrl(fullUrl);
        toast.success("Tautan live monitor pimpinan berhasil dibuat!");
        fetchTokens();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat tautan monitor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Tautan disalin ke papan klip!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleRekapSharedTokenActive(id, !currentActive);
      setTokens((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: !currentActive } : t))
      );
      toast.success(
        !currentActive
          ? "Tautan monitor diaktifkan kembali."
          : "Tautan monitor berhasil dinonaktifkan."
      );
    } catch {
      toast.error("Gagal mengubah status tautan.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus tautan monitor ini secara permanen?")) return;
    try {
      await deleteRekapSharedToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tautan monitor dihapus.");
    } catch {
      toast.error("Gagal menghapus tautan.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Tv2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Tautan Live Monitor Pimpinan
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Bagikan live infografis tanpa shell SIPADIN untuk layar monitor TV atau perangkat pimpinan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Box Parameter Aktif */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Periode Terkunci:
              </span>
              <span className="font-semibold text-slate-900">{periodeLabel}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Unit / OPD Terpilih:
              </span>
              <span className="font-semibold text-slate-900">
                {selectedUnits && selectedUnits.length > 0
                  ? `${selectedUnits.length} Unit Kerja`
                  : "Semua Unit Kerja OPD"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Kategori Agenda:
              </span>
              <span className="font-semibold text-slate-900">{kategoriLabel}</span>
            </div>
          </div>

          {/* Form Buat Tautan Baru */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Judul / Keterangan Tampilan Monitor (Opsional)
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Monitor Rekap Triwulan I - Ruang Rapat Pimpinan"
                className="h-9 text-xs"
              />
            </div>

            <Button
              onClick={handleCreateToken}
              disabled={isGenerating}
              className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs gap-1.5"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              Buat Tautan Monitor Baru
            </Button>
          </div>

          {/* URL Hasil Generate */}
          {createdUrl && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Tautan Aktif Siap Dibagikan
                </span>
                <a
                  href={createdUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline underline-offset-2"
                >
                  Buka Monitor <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  readOnly
                  value={createdUrl}
                  className="h-8 text-xs bg-white text-slate-800 font-mono select-all border-emerald-300"
                />
                <Button
                  size="sm"
                  onClick={() => handleCopy(createdUrl)}
                  className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-bold gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
              </div>
            </div>
          )}

          {/* Daftar Tautan Sebelumnya */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>Riwayat Tautan Monitor Tim ({tokens.length})</span>
              {isLoadingTokens && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </h4>

            {tokens.length === 0 && !isLoadingTokens ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Belum ada tautan monitor yang dibuat sebelumnya.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {tokens.map((t) => {
                  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/rekap/${t.token}`;
                  return (
                    <div
                      key={t.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-colors ${
                        t.isActive
                          ? "bg-white border-slate-200"
                          : "bg-slate-50 border-slate-200/60 opacity-60"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              t.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                            }`}
                          />
                          <p className="font-semibold text-slate-900 truncate">
                            {t.title || "Tautan Monitor Rekap"}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                          {t.startDate} s/d {t.endDate} • {t.selectedUnits?.length || 0} OPD
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(url)}
                          className="h-7 px-2 text-slate-600 hover:text-slate-900 text-xs"
                          title="Salin Tautan"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="h-7 px-2 inline-flex items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs"
                          title="Buka Monitor"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(t.id, t.isActive)}
                          className={`h-7 px-2 text-xs ${
                            t.isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"
                          }`}
                          title={t.isActive ? "Nonaktifkan Tautan" : "Aktifkan Tautan"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(t.id)}
                          className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
