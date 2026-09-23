"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  MapPin,
  Calendar,
  Search,
  ArrowUpDown,
  Filter,
  AlertCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";

export type TripItem = {
  spjId: string;
  perihal: string;
  tempatTujuan: string;
  tempatBerangkat: string;
  tglBerangkat: string;
  tglKembali: string;
  month: number;
};

export type MonthStat = {
  month: number;
  monthName: string;
  count: number;
  totalHari: number;
  isOverLimit: boolean;
};

export type RekapItem = {
  rank: number;
  pegawaiId: string;
  nama: string;
  jabatan?: string | null;
  nip?: string | null;
  timInternal: boolean;
  count: number;
  totalHari: number;
  totalPengeluaran: string;
  totalUangHarian?: string;
  isOverLimit: boolean;
  monthlyStats: MonthStat[];
  trips: TripItem[];
};

type SortKey = "count" | "totalHari" | "anggaran" | "nama";
type FilterBiaya = "all" | "uang_harian";
type FilterScope = "internal" | "all" | "overlimit";

function formatRupiah(val: string | number | bigint) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(val));
}

function countDays(tglBerangkat: string, tglKembali: string) {
  const start = new Date(tglBerangkat);
  const end = new Date(tglKembali);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1; // inklusif hari berangkat
}

const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];

export default function RekapList({
  items,
  isMonthFiltered = false,
  selectedBulanNumber = null,
}: {
  items: RekapItem[];
  isMonthFiltered?: boolean;
  selectedBulanNumber?: number | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("count");
  const [filterBiaya, setFilterBiaya] = useState<FilterBiaya>("all");
  const [filterScope, setFilterScope] = useState<FilterScope>("internal");
  const [searchQuery, setSearchQuery] = useState("");

  const processedItems = useMemo(() => {
    // 1. Filter scope (Internal / Semua / Overlimit)
    let list = items;
    if (filterScope === "internal") {
      list = list.filter((item) => item.timInternal);
    } else if (filterScope === "overlimit") {
      list = list.filter((item) => item.isOverLimit);
    }

    // 2. Filter search nama / NIP / jabatan
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          (item.nip && item.nip.toLowerCase().includes(q)) ||
          (item.jabatan && item.jabatan.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "count") {
        if (b.count !== a.count) return b.count - a.count;
        return b.totalHari - a.totalHari;
      }
      if (sortBy === "totalHari") {
        if (b.totalHari !== a.totalHari) return b.totalHari - a.totalHari;
        return b.count - a.count;
      }
      if (sortBy === "anggaran") {
        const valA =
          filterBiaya === "uang_harian"
            ? BigInt(a.totalUangHarian || "0")
            : BigInt(a.totalPengeluaran || "0");
        const valB =
          filterBiaya === "uang_harian"
            ? BigInt(b.totalUangHarian || "0")
            : BigInt(b.totalPengeluaran || "0");
        if (valA !== valB) {
          return valB > valA ? 1 : -1;
        }
        return b.count - a.count;
      }
      if (sortBy === "nama") {
        return a.nama.localeCompare(b.nama);
      }
      return 0;
    });

    // 4. Assign dynamic rank
    return sorted.map((item, idx) => ({
      ...item,
      dynamicRank: idx + 1,
    }));
  }, [items, sortBy, filterBiaya, filterScope, searchQuery]);

  return (
    <div>
      {/* TOOLBAR FILTER & SORT (COMPACT & UNIFIED) */}
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIP, jabatan..."
            className="pl-8 h-8 text-xs bg-white border-slate-200/90 shadow-2xs"
          />
        </div>

        {/* Compact Segmented Filter Group */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          {/* Segmented Controls Wrapper */}
          <div className="inline-flex items-center bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-2xs divide-x divide-slate-200 w-full sm:w-auto overflow-x-auto">
            {/* Filter Scope Pegawai */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as FilterScope)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer py-1 pr-1"
              >
                <option value="internal">Pegawai Internal Saja</option>
                <option value="all">Semua Pegawai (Internal + Eksternal)</option>
                <option value="overlimit">⚠️ Over Limit (&gt;15×)</option>
              </select>
            </div>

            {/* Filter Jenis Anggaran */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={filterBiaya}
                onChange={(e) => setFilterBiaya(e.target.value as FilterBiaya)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer py-1 pr-1"
              >
                <option value="all">Semua Biaya (Total)</option>
                <option value="uang_harian">Hanya Uang Harian</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer py-1 pr-1"
              >
                <option value="count">Frekuensi Terbanyak</option>
                <option value="totalHari">Total Hari Dinas</option>
                <option value="anggaran">
                  Besaran Anggaran {filterBiaya === "uang_harian" ? "(Uang Harian)" : "(Total)"}
                </option>
                <option value="nama">Nama (A - Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* HASIL KOSONG DARI PENCARIAN / FILTER */}
      {processedItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm font-medium">Tidak ada data pegawai yang cocok dengan filter atau pencarian.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {processedItems.map((item) => {
            const isTop3 = item.dynamicRank <= 3 && item.count > 0;
            const isOpen = openId === item.pegawaiId;
            const displayedAnggaran =
              filterBiaya === "uang_harian"
                ? item.totalUangHarian || "0"
                : item.totalPengeluaran;

            // Apakah baris ini over limit?
            const isRowOverLimit = isMonthFiltered
              ? item.count > 15
              : item.monthlyStats.some((m) => m.isOverLimit);

            return (
              <div
                key={item.pegawaiId}
                className={isRowOverLimit ? "bg-rose-50/20" : undefined}
              >
                {/* Row utama — klik untuk toggle accordion */}
                <button
                  className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50/80 transition-colors text-left"
                  onClick={() => setOpenId(isOpen ? null : item.pegawaiId)}
                >
                  {/* Rank */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      item.count === 0
                        ? "text-slate-300 bg-slate-100"
                        : isTop3
                        ? `${rankColors[item.dynamicRank - 1]} bg-slate-100 ring-1 ring-slate-200`
                        : "text-slate-500 bg-slate-100"
                    }`}
                  >
                    {item.dynamicRank}
                  </div>

                  {/* Nama, Jabatan & Breakdown Bulanan */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.nama}</p>
                      {item.timInternal ? (
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-semibold border border-indigo-100">
                          Internal
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          Luar
                        </span>
                      )}
                    </div>

                    {item.jabatan && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.jabatan}</p>
                    )}
                    {item.nip && (
                      <p className="text-[10px] text-slate-400 font-mono">{item.nip}</p>
                    )}

                    {/* Matrix Bulanan (Tampil jika Semua Bulan dipilih) */}
                    {!isMonthFiltered && (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        {item.monthlyStats.map((ms) => {
                          const hasTrip = ms.count > 0;
                          return (
                            <span
                              key={ms.month}
                              title={`${ms.monthName}: ${ms.count}x jalan (${ms.totalHari} hari)`}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium transition-all ${
                                ms.isOverLimit
                                  ? "bg-rose-600 text-white font-bold ring-2 ring-rose-300 animate-pulse"
                                  : hasTrip
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold"
                                  : "bg-slate-100 text-slate-300"
                              }`}
                            >
                              {ms.monthName}:{ms.count}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Total Pengeluaran (Tampil di Mobile) */}
                    <div className="mt-1.5 sm:hidden flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-indigo-600">
                        {formatRupiah(displayedAnggaran)}
                      </span>
                      {filterBiaya === "uang_harian" && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-medium">
                          Uang Harian
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Total Pengeluaran (Tampil di Desktop) */}
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                      {filterBiaya === "uang_harian" ? (
                        <span className="text-emerald-600 font-medium">Uang Harian</span>
                      ) : (
                        "Total Pengeluaran"
                      )}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {formatRupiah(displayedAnggaran)}
                    </p>
                  </div>

                  {/* Frekuensi & Limit Warning */}
                  <div className="shrink-0 flex flex-col items-end gap-1 min-w-[70px]">
                    {/* Badge Frekuensi */}
                    {isRowOverLimit ? (
                      <Badge
                        variant="destructive"
                        className="font-black text-xs px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow-sm"
                        title="Melebihi batas maksimal 15x perjalanan dalam satu bulan"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {item.count}×
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={`font-bold text-xs px-2 py-0.5 ${
                          item.count === 0
                            ? "bg-slate-100 text-slate-400"
                            : sortBy === "count"
                            ? "bg-indigo-600 text-white"
                            : isTop3
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.count}×
                      </Badge>
                    )}

                    <span
                      className={`text-[10px] font-medium ${
                        sortBy === "totalHari"
                          ? "text-indigo-600 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {item.totalHari} hari
                    </span>
                  </div>

                  {/* Chevron */}
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Accordion content */}
                {isOpen && (
                  <div className="bg-slate-50/70 border-t border-slate-100 px-4 sm:px-6 py-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Riwayat Perjalanan ({item.trips.length} kegiatan)</span>
                        {isRowOverLimit && (
                          <span className="text-rose-600 font-bold normal-case text-xs inline-flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" /> Melebihi limit 15x/bulan
                          </span>
                        )}
                      </p>
                      {item.totalUangHarian && (
                        <span className="text-[11px] text-slate-500">
                          Total Uang Harian:{" "}
                          <strong className="text-emerald-700">
                            {formatRupiah(item.totalUangHarian)}
                          </strong>{" "}
                          | Total Keseluruhan:{" "}
                          <strong className="text-slate-700">
                            {formatRupiah(item.totalPengeluaran)}
                          </strong>
                        </span>
                      )}
                    </div>

                    {item.trips.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Pegawai ini belum memiliki riwayat perjalanan dinas pada periode ini.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {item.trips.map((trip, i) => (
                          <div
                            key={i}
                            className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 bg-white border border-slate-200/70 rounded-lg px-3.5 py-2.5 text-xs shadow-2xs"
                          >
                            {/* Tujuan */}
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-slate-800 font-semibold truncate">
                                {trip.tempatBerangkat} → {trip.tempatTujuan}
                              </span>
                            </div>

                            {/* Tanggal */}
                            <div className="flex items-center gap-1.5 shrink-0 text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatWita(trip.tglBerangkat, "d MMM yyyy")}
                                {trip.tglBerangkat !== trip.tglKembali &&
                                  ` – ${formatWita(trip.tglKembali, "d MMM yyyy")}`}
                              </span>
                            </div>

                            {/* Perihal */}
                            {trip.perihal && (
                              <span
                                className="text-slate-400 truncate max-w-[220px] hidden sm:block"
                                title={trip.perihal}
                              >
                                {trip.perihal}
                              </span>
                            )}

                            {/* Total Hari */}
                            <div className="flex">
                              <span className="shrink-0 inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
                                {countDays(trip.tglBerangkat, trip.tglKembali)} hari
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
