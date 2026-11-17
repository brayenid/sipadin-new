"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, ChevronDown, Search, X } from "lucide-react";
import LaporanRekapGrafisPdf from "@/pdf/templates/LaporanRekapGrafisPdf";
import {
  buildGrafisData,
  type GrafisData,
  type GrafisInput,
} from "./grafis/buildGrafisData";
import {
  getRekapFilterPreference,
  saveRekapFilterPreference,
} from "@/app/actions/absensi";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-[500px] w-full bg-slate-50 border rounded-lg gap-2 text-slate-500 text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <span>Menyiapkan dokumen PDF Laporan Grafis...</span>
      </div>
    ),
  }
);

export default function CetakRekapGrafisModal({
  isOpen,
  onClose,
  periodeLabel,
  kategoriLabel,
  data,
  initialUnits,
}: {
  isOpen: boolean;
  onClose: () => void;
  periodeLabel: string;
  kategoriLabel: string;
  data: GrafisInput;
  initialUnits?: string[];
}) {
  const [onlyInvited, setOnlyInvited] = useState(true);
  const [selectedUnits, setSelectedUnits] = useState<string[]>(initialUnits || []);
  const [unitSearch, setUnitSearch] = useState<string>("");

  // Ekstrak daftar seluruh unit / instansi unik
  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    (data.opdSummary || []).forEach((o) => {
      if (o.instansi?.trim()) set.add(o.instansi.trim());
    });
    (data.pegawaiSummary || []).forEach((p) => {
      if (p.instansi?.trim()) set.add(p.instansi.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [data.opdSummary, data.pegawaiSummary]);

  // Muat sesi filter terakhir saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    // 1. Fallback instan dari localStorage
    try {
      const localUnitsStr = localStorage.getItem("sipadin_rekap_selected_units");
      const localOnlyInvited = localStorage.getItem("sipadin_rekap_only_invited");
      if (initialUnits && initialUnits.length > 0) {
        setSelectedUnits(initialUnits);
      } else if (localUnitsStr) {
        const parsed = JSON.parse(localUnitsStr);
        if (Array.isArray(parsed)) setSelectedUnits(parsed);
      }
      if (localOnlyInvited !== null) {
        setOnlyInvited(localOnlyInvited === "true");
      }
    } catch {}

    // 2. Ambil sesi filter terakhir dari database
    let isCancelled = false;
    getRekapFilterPreference()
      .then((prefs) => {
        if (isCancelled || !prefs) return;
        if (!initialUnits || initialUnits.length === 0) {
          if (Array.isArray(prefs.rekapUnits)) {
            setSelectedUnits(prefs.rekapUnits);
          } else if (prefs.rekapUnit && prefs.rekapUnit !== "ALL") {
            setSelectedUnits([prefs.rekapUnit]);
          }
        }
        if (typeof prefs.onlyInvited === "boolean") {
          setOnlyInvited(prefs.onlyInvited);
        }
      })
      .catch((e) => console.error("Error loading filter preference:", e));

    return () => {
      isCancelled = true;
    };
  }, [isOpen, initialUnits]);

  // Handler toggle satu unit
  const handleToggleUnit = (unit: string) => {
    let next: string[];
    if (selectedUnits.includes(unit)) {
      next = selectedUnits.filter((u) => u !== unit);
    } else {
      next = [...selectedUnits, unit];
    }
    setSelectedUnits(next);
    try {
      localStorage.setItem("sipadin_rekap_selected_units", JSON.stringify(next));
    } catch {}
    saveRekapFilterPreference({ rekapUnits: next, onlyInvited }).catch(console.error);
  };

  // Handler toggle pilih semua unit
  const handleToggleAllUnits = () => {
    const next: string[] = []; // Kosong menandakan semua unit disertakan
    setSelectedUnits(next);
    try {
      localStorage.setItem("sipadin_rekap_selected_units", JSON.stringify(next));
    } catch {}
    saveRekapFilterPreference({ rekapUnits: next, onlyInvited }).catch(console.error);
  };

  // Handler reset filter unit
  const handleResetUnits = () => {
    setSelectedUnits([]);
    try {
      localStorage.setItem("sipadin_rekap_selected_units", JSON.stringify([]));
    } catch {}
    saveRekapFilterPreference({ rekapUnits: [], onlyInvited }).catch(console.error);
  };

  // Handler ubah hanya undangan
  const handleOnlyInvitedChange = (val: boolean) => {
    setOnlyInvited(val);
    try {
      localStorage.setItem("sipadin_rekap_only_invited", String(val));
    } catch {}
    saveRekapFilterPreference({ rekapUnits: selectedUnits, onlyInvited: val }).catch(console.error);
  };

  // Daftar opsi unit sesuai kata kunci pencarian
  const filteredUnitOptions = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return unitOptions;
    return unitOptions.filter((u) => u.toLowerCase().includes(q));
  }, [unitOptions, unitSearch]);

  const isAllSelected = selectedUnits.length === 0 || selectedUnits.length === unitOptions.length;

  const grafisData = useMemo<GrafisData | null>(() => {
    if (!isOpen) return null;
    return buildGrafisData(data, {
      onlyInvited,
      selectedUnits: selectedUnits.length > 0 ? selectedUnits : null,
    });
  }, [data, isOpen, onlyInvited, selectedUnits]);

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

  const unitLabel = useMemo(() => {
    if (selectedUnits.length === 1) return selectedUnits[0];
    if (selectedUnits.length > 1) return `${selectedUnits.length} Unit Terpilih`;
    return undefined;
  }, [selectedUnits]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[94vw] !max-w-[94vw] sm:!max-w-[94vw] h-[92vh] flex flex-col p-4 sm:p-6 bg-white">
        <DialogHeader className="pb-3 border-b shrink-0 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Laporan Grafis Rekapitulasi Kehadiran (PDF A4 — 2 Lembar)
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Lembar 1: Ringkasan Eksekutif &amp; Peringkat • Lembar 2: 30 Besar Kegiatan Ter-ramai Dihadiri
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mr-8 shrink-0">
            {/* Popover Filter Cekbox Unit / OPD */}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 px-2.5 text-xs font-semibold gap-1.5 border transition-colors cursor-pointer ${
                      selectedUnits.length > 0
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                    title="Saring pegawai berdasarkan unit kerja / OPD tertentu"
                  >
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="max-w-[180px] sm:max-w-[240px] truncate">
                      {selectedUnits.length === 0
                        ? "Semua Unit / OPD"
                        : selectedUnits.length === 1
                        ? selectedUnits[0]
                        : `${selectedUnits.length} Unit Dipilih`}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                  </Button>
                }
              />
              <PopoverContent align="end" className="w-80 p-3 bg-white shadow-xl rounded-xl border-slate-200">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-800">Filter Unit / OPD</span>
                    {selectedUnits.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetUnits}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        Reset Semua
                      </button>
                    )}
                  </div>

                  {/* Pencarian Unit */}
                  {unitOptions.length > 4 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <Input
                        placeholder="Cari unit..."
                        value={unitSearch}
                        onChange={(e) => setUnitSearch(e.target.value)}
                        className="h-7 pl-8 text-xs bg-slate-50"
                      />
                    </div>
                  )}

                  {/* Cekbox Pilih Semua */}
                  <div className="flex items-center justify-between pt-1 pb-1 border-b border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleAllUnits}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Pilih Semua Unit</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {selectedUnits.length === 0 ? unitOptions.length : selectedUnits.length} / {unitOptions.length}
                    </span>
                  </div>

                  {/* Daftar Cekbox Setiap Unit */}
                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 [scrollbar-width:thin]">
                    {filteredUnitOptions.map((unit) => {
                      const isChecked = selectedUnits.includes(unit);
                      return (
                        <label
                          key={unit}
                          className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                            isChecked
                              ? "bg-indigo-50/70 hover:bg-indigo-50 font-semibold text-indigo-950"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleUnit(unit)}
                            className="h-3.5 w-3.5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <span className="leading-snug break-words">{unit}</span>
                        </label>
                      );
                    })}
                    {filteredUnitOptions.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-3">Unit tidak ditemukan</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Checkbox Hanya Undangan */}
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              <input
                type="checkbox"
                checked={onlyInvited}
                onChange={(e) => handleOnlyInvitedChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Hanya Undangan</span>
            </label>
          </div>
        </DialogHeader>

        {/* PDF Viewer Bawaan Browser */}
        <div className="flex-1 w-full mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
          {isOpen && grafisData && (
            <PDFViewer
              key={`${selectedUnits.join(",")}-${onlyInvited}`}
              width="100%"
              height="100%"
              showToolbar={true}
            >
              <LaporanRekapGrafisPdf
                data={grafisData}
                periodeLabel={periodeLabel || "Semua Periode"}
                kategoriLabel={kategoriLabel}
                tanggalCetak={tanggalCetak}
                onlyInvited={onlyInvited}
                unitLabel={unitLabel}
              />
            </PDFViewer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
