"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Copy,
  Loader2,
  AlertTriangle,
  Building2,
  Receipt,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  duplicateSpjTransaction,
  getSpjDuplicateContext,
} from "@/app/actions/spj";

export type SpjDuplicateTarget = {
  id: string;
  perihal?: string | null;
  kodeRekeningId?: string;
  totalPengeluaran?: bigint | number;
  jenisSpj?: string;
  kodeRekening?: {
    id: string;
    kodeRekening: string;
    judulRekening: string;
    sisaSaldo?: bigint | number;
    subKegiatan?: {
      judulSub?: string;
      kegiatan?: {
        tahunAnggaran?: {
          tahun?: string;
        };
      };
    };
  } | null;
};

export interface SpjDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  spj: SpjDuplicateTarget;
  onSuccess?: (newSpjId: string) => void;
}

type RekeningItem = {
  id: string;
  kodeRekening: string;
  judulRekening: string;
  sisaSaldo: number;
  subKegiatanJudul: string;
  subKegiatanKode: string;
  tahun: string;
};

export default function SpjDuplicateModal({
  isOpen,
  onClose,
  spj,
  onSuccess,
}: SpjDuplicateModalProps) {
  const router = useRouter();

  // State form
  const [perihal, setPerihal] = useState<string>(spj.perihal || "");
  const [selectedRekeningId, setSelectedRekeningId] = useState<string>(
    spj.kodeRekeningId || ""
  );
  const [totalPengeluaran, setTotalPengeluaran] = useState<number>(
    Number(spj.totalPengeluaran || 0)
  );
  const [jenisSpj, setJenisSpj] = useState<string>(spj.jenisSpj || "PERJADIN");

  const [rekeningList, setRekeningList] = useState<RekeningItem[]>([]);
  const [loadingContext, setLoadingContext] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load context (detail SPJ + list rekening yang dapat diakses)
  useEffect(() => {
    if (!isOpen || !spj.id) return;

    let isCancelled = false;
    setLoadingContext(true);

    getSpjDuplicateContext(spj.id)
      .then((res) => {
        if (isCancelled) return;
        if (!res.success || !res.data) {
          toast.error(res.error || "Gagal memuat data rekening untuk duplikasi.");
          setLoadingContext(false);
          return;
        }

        const data = res.data;
        // Inisialisasi perihal bersih tanpa tulisan "(Salinan)"
        setPerihal((prev) => prev.trim() || data.perihal || "");
        setSelectedRekeningId((prev) => prev || data.kodeRekeningId || "");
        setTotalPengeluaran(data.totalPengeluaran);
        setJenisSpj(data.jenisSpj);
        setRekeningList(data.rekeningOptions);
        setLoadingContext(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("Error loading duplicate context:", err);
        toast.error("Terjadi kesalahan saat memuat data.");
        setLoadingContext(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, spj.id]);

  // Rekening yang sedang dipilih
  const selectedRekening = useMemo(() => {
    return rekeningList.find((r) => r.id === selectedRekeningId);
  }, [rekeningList, selectedRekeningId]);

  // Cek kecukupan saldo
  const isSaldoCukup = useMemo(() => {
    if (!selectedRekening) return true;
    if (totalPengeluaran <= 0) return true;
    return selectedRekening.sisaSaldo >= totalPengeluaran;
  }, [selectedRekening, totalPengeluaran]);

  // Format opsi untuk Combobox
  const comboboxOptions = useMemo(() => {
    return rekeningList.map((rek) => {
      const sisaFmt = formatCurrency(rek.sisaSaldo);
      const isCukup = totalPengeluaran <= 0 || rek.sisaSaldo >= totalPengeluaran;

      return {
        value: rek.id,
        label: `[TA ${rek.tahun}] ${rek.kodeRekening} - ${rek.judulRekening} (${rek.subKegiatanJudul}) • Sisa: ${sisaFmt}`,
        content: (
          <div className="flex flex-col py-1.5 gap-1 border-b border-slate-100 last:border-0 w-full overflow-hidden text-left">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                TA {rek.tahun}
              </span>
              <span
                className="text-xs font-medium text-slate-500 truncate"
                title={rek.subKegiatanJudul}
              >
                {rek.subKegiatanJudul}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-800 leading-snug">
              <span className="font-mono text-slate-500 mr-1.5">{rek.kodeRekening}</span>
              {rek.judulRekening}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[11px] font-bold ${
                  isCukup ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                Sisa Pagu: {sisaFmt}
              </span>
              {!isCukup && (
                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-semibold">
                  Saldo Kurang
                </span>
              )}
            </div>
          </div>
        ),
      };
    });
  }, [rekeningList, totalPengeluaran]);

  // Handle submit duplikasi
  const handleConfirmDuplicate = async () => {
    if (!perihal.trim()) {
      toast.error("Perihal SPJ tidak boleh kosong.");
      return;
    }

    if (!selectedRekeningId) {
      toast.error("Silakan pilih mata anggaran (kode rekening) terlebih dahulu.");
      return;
    }

    if (!isSaldoCukup) {
      toast.error("Saldo pada mata anggaran yang dipilih tidak mencukupi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await duplicateSpjTransaction(spj.id, {
        perihal: perihal.trim(),
        kodeRekeningId: selectedRekeningId,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menduplikasi SPJ.");
        setSubmitting(false);
        return;
      }

      toast.success("SPJ berhasil diduplikasi.");
      onClose();

      // Panggil callback atau redirect ke SPJ baru
      setTimeout(() => {
        if (onSuccess && res.newSpjId) {
          onSuccess(res.newSpjId);
        } else if (res.newSpjId) {
          router.push(`/dashboard/spj/${res.newSpjId}`);
        }
      }, 250);
    } catch (err: any) {
      toast.error(err.message || "Gagal menduplikasi SPJ.");
      setSubmitting(false);
    }
  };

  const getJenisLabel = (j: string) => {
    if (j === "PERJADIN") return "Perjalanan Dinas";
    if (j === "MAKAN_MINUM") return "Makan & Minum / ATK";
    if (j === "HONORARIUM") return "Honorarium";
    return j;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-xl w-full p-0 overflow-hidden bg-white rounded-xl shadow-2xl border-slate-200">
        {/* Header Modal */}
        <DialogHeader className="p-5 pb-4 bg-slate-50/80 border-b border-slate-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-xs">
              <Copy className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold text-slate-900">
                Konfirmasi Duplikat SPJ
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tentukan perihal dan pastikan mata anggaran sebelum menyalin seluruh data SPJ.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Modal */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Ringkasan SPJ Asli */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Jenis Transaksi
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                <Badge variant="outline" className="font-semibold text-slate-700 bg-white">
                  {getJenisLabel(jenisSpj)}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Biaya Pengeluaran
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(totalPengeluaran)}
                </span>
              </div>
            </div>
          </div>

          {/* Form Input Perihal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">
                Perihal SPJ Baru <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-slate-400">
                Bebas tulisan &quot;(Salinan)&quot;
              </span>
            </div>
            <Textarea
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              placeholder="Contoh: Perjalanan dinas koordinasi perencanaan..."
              className="text-xs min-h-[70px] resize-y bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={submitting || loadingContext}
            />
            <p className="text-[11px] text-slate-500">
              Sesuaikan narasi perihal agar sesuai dengan agenda atau transaksi baru.
            </p>
          </div>

          {/* Form Pemilihan Mata Anggaran */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Mata Anggaran / Sumber Dana <span className="text-rose-500">*</span>
            </Label>
            {loadingContext ? (
              <div className="h-10 bg-slate-100 rounded-md animate-pulse flex items-center px-3 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Memuat daftar rekening belanja...
              </div>
            ) : (
              <Combobox
                options={comboboxOptions}
                value={selectedRekeningId}
                onChange={setSelectedRekeningId}
                placeholder="Pilih Mata Anggaran (Kode Rekening)..."
                emptyText="Mata anggaran tidak ditemukan."
                className="w-full text-xs"
              />
            )}

            {/* Info Rincian Rekening Terpilih */}
            {selectedRekening && (
              <div className="mt-2 p-2.5 bg-slate-50/80 rounded-md border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Sub-Kegiatan:
                  </span>
                  <span className="font-semibold text-slate-800 text-right max-w-[280px] truncate">
                    {selectedRekening.subKegiatanJudul}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                  <span className="text-slate-600">Sisa Pagu Rekening:</span>
                  <span
                    className={`font-mono font-bold ${
                      isSaldoCukup ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {formatCurrency(selectedRekening.sisaSaldo)}
                  </span>
                </div>

                {!isSaldoCukup && (
                  <div className="mt-1 flex items-start gap-1.5 text-[11px] text-rose-700 font-semibold bg-rose-50 p-1.5 rounded border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                    <span>
                      Sisa pagu pada rekening ini tidak mencukupi untuk membiayai total pengeluaran SPJ (
                      {formatCurrency(totalPengeluaran)}). Silakan pilih rekening lain.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WARNING BOX SINGKAT (Sesuai Permintaan Spesifik) */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-lg p-3 text-amber-950 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-950">Perhatian Mata Anggaran Sebelum Duplikat</p>
              <p className="text-amber-900/90 leading-relaxed text-[11px]">
                Pastikan mata anggaran yang dipilih sudah sesuai dengan sub kegiatan belanja yang semestinya.
                Saldo pagu pada rekening tersebut akan otomatis terpotong sebesar{" "}
                <strong>{formatCurrency(totalPengeluaran)}</strong> setelah Anda menyalin SPJ ini.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmDuplicate}
            disabled={submitting || loadingContext || !isSaldoCukup || !perihal.trim() || !selectedRekeningId}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Menduplikasi SPJ...
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Duplikat SPJ Sekarang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
