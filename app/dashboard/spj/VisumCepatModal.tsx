"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { FileText, Loader2, Printer, MapPin, UserCheck, LayoutGrid } from "lucide-react";
import VisumPdf from "@/pdf/templates/VisumPdf";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 text-slate-500 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="text-xs font-medium">Memuat pratinjau visum...</span>
      </div>
    ),
  }
);

interface VisumCepatModalProps {
  pegawaiList: Array<{
    id: string;
    nama: string;
    nip?: string | null;
    jabatan?: string | null;
    pangkat?: string | null;
    golongan?: string | null;
    instansi?: string | null;
  }>;
  customTrigger?: React.ReactNode;
}

export default function VisumCepatModal({ pegawaiList, customTrigger }: VisumCepatModalProps) {
  const [open, setOpen] = useState(false);

  // Cari default Sekretaris Daerah jika ada di daftar pegawai
  const defaultSigner = useMemo(() => {
    return (
      pegawaiList.find((p) =>
        (p.jabatan || "").toLowerCase().includes("sekretaris daerah") ||
        (p.jabatan || "").toLowerCase().includes("sekda")
      ) || pegawaiList[0] || null
    );
  }, [pegawaiList]);

  const [tempatBerangkat, setTempatBerangkat] = useState("Sendawar");
  const [tempatTujuan, setTempatTujuan] = useState("");
  const [stageCount, setStageCount] = useState<number>(3);
  const [selectedPegawaiId, setSelectedPegawaiId] = useState<string>("");

  const effectivePegawaiId = selectedPegawaiId || defaultSigner?.id || "";

  const selectedPegawai = useMemo(() => {
    return pegawaiList.find((p) => p.id === effectivePegawaiId) || null;
  }, [pegawaiList, effectivePegawaiId]);

  const pegawaiOptions = useMemo(() => {
    return pegawaiList.map((p) => ({
      value: p.id,
      label: `${p.nama} - ${p.jabatan || "Pegawai"}`,
    }));
  }, [pegawaiList]);

  // Siapkan data dokumen VisumPdf
  const visumSpjData = useMemo(() => {
    return {
      tempatBerangkat: tempatBerangkat || "Sendawar",
      // Jika tujuan kosong, string kosong akan dirender sebagai titik-titik di VisumPdf
      tempatTujuan: tempatTujuan.trim(),
    };
  }, [tempatBerangkat, tempatTujuan]);

  const signerData = useMemo(() => {
    if (!selectedPegawai) return null;
    return {
      nama: selectedPegawai.nama,
      nip: selectedPegawai.nip || null,
      jabatan: selectedPegawai.jabatan || null,
      jabatanTampil: selectedPegawai.jabatan || null,
    };
  }, [selectedPegawai]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger ? (
        <DialogTrigger render={customTrigger as React.ReactElement} />
      ) : (
        <DialogTrigger
          render={
            <Button variant="outline" className="text-slate-700 bg-white hover:bg-slate-50 border-slate-200">
              <FileText className="w-4 h-4 mr-2 text-indigo-600" />
              Visum Cepat
            </Button>
          }
        />
      )}

      <DialogContent className="max-w-[95vw] sm:max-w-6xl w-full h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 px-6 border-b border-slate-200 bg-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                Cetak Visum Cepat
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Pratinjau langsung &amp; cetak lembar visum tanpa perlu membuat atau menyimpan transaksi SPJ.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-100">
          {/* Panel Kiri: Konfigurasi Cetak */}
          <div className="w-full lg:w-[360px] bg-white border-r border-slate-200 flex flex-col p-5 space-y-5 overflow-y-auto shrink-0 shadow-sm">
            {/* Lokasi Berangkat */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Tempat Berangkat (Kedudukan)
              </Label>
              <Input
                value={tempatBerangkat}
                onChange={(e) => setTempatBerangkat(e.target.value)}
                placeholder="Contoh: Sendawar"
                className="h-9 text-xs"
              />
            </div>

            {/* Lokasi Tujuan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  Tujuan Perjalanan (Opsional)
                </Label>
                <span className="text-[10px] text-slate-400">Boleh dikosongkan</span>
              </div>
              <Input
                value={tempatTujuan}
                onChange={(e) => setTempatTujuan(e.target.value)}
                placeholder="Contoh: Samarinda (Kosong = titik-titik manual)"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-500 leading-normal">
                {tempatTujuan.trim()
                  ? "Tujuan akan tercetak di lembar visum."
                  : "Dikosongkan: lembar visum akan mencetak titik-titik untuk ditulis manual."}
              </p>
            </div>

            {/* Pejabat Penandatangan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Pejabat Penandatangan (Pegawai Internal)
              </Label>
              <Combobox
                options={pegawaiOptions}
                value={effectivePegawaiId}
                onChange={setSelectedPegawaiId}
                placeholder="Pilih Pejabat Penandatangan..."
                emptyText="Pegawai internal tidak ditemukan."
                className="w-full text-xs"
              />
              {selectedPegawai && (
                <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200/80 text-[11px] space-y-0.5">
                  <div className="font-semibold text-slate-800">{selectedPegawai.nama}</div>
                  <div className="text-slate-600">NIP: {selectedPegawai.nip || "-"}</div>
                  <div className="text-slate-500 text-[10px]">{selectedPegawai.jabatan || "-"}</div>
                </div>
              )}
            </div>

            {/* Jumlah Kolom Kotak Visum */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                Jumlah Kolom Kotak Visum
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={stageCount}
                  onChange={(e) => setStageCount(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-24 h-9 text-xs text-center"
                />
                <span className="text-xs text-slate-500">kotak (Bawaan: 3)</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Jumlah tempat persinggahan yang distempel pada lembar cetak.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
              <Printer className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Gunakan menu cetak atau unduh langsung di area pratinjau.</span>
            </div>
          </div>

          {/* Panel Kanan: PDF Live Preview */}
          <div className="flex-1 h-full min-h-[300px] bg-slate-600 flex flex-col relative overflow-hidden">
            {open && (
              <PDFViewer
                key={`${tempatBerangkat}-${tempatTujuan}-${stageCount}-${effectivePegawaiId}`}
                width="100%"
                height="100%"
                className="border-none w-full h-full flex-1"
              >
                <VisumPdf
                  spj={visumSpjData}
                  stageCount={stageCount}
                  signer={signerData}
                />
              </PDFViewer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
