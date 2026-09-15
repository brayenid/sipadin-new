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
  DollarSign,
  Clock,
  Repeat
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";

export type TripItem = {
  spjId: string;
  perihal: string;
  tempatTujuan: string;
  tempatBerangkat: string;
  tglBerangkat: string;
  tglKembali: string;
};

export type RekapItem = {
  rank: number;
  pegawaiId: string;
  nama: string;
  jabatan?: string | null;
  nip?: string | null;
  count: number;
  totalHari: number;
  totalPengeluaran: string;
  totalUangHarian?: string;
  trips: TripItem[];
};

type SortKey = "count" | "totalHari" | "anggaran";
type FilterBiaya = "all" | "uang_harian";

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

export default function RekapList({ items }: { items: RekapItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("count");
  const [filterBiaya, setFilterBiaya] = useState<FilterBiaya>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const processedItems = useMemo(() => {
    // 1. Filter pencarian nama / NIP / jabatan
    let list = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.nama.toLowerCase().includes(q) ||
          (item.nip && item.nip.toLowerCase().includes(q)) ||
          (item.jabatan && item.jabatan.toLowerCase().includes(q))
      );
    }

    // 2. Sorting
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
      return 0;
    });

    // 3. Assign dynamic rank
    return sorted.map((item, idx) => ({
      ...item,
      dynamicRank: idx + 1,
    }));
  }, [items, sortBy, filterBiaya, searchQuery]);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-sm">Belum ada data perjalanan dinas untuk tahun ini.</p>
      </div>
    );
  }

  return (
    <div>
      {/* TOOLBAR FILTER & SORT */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau NIP pegawai..."
            className="pl-9 h-9 text-xs sm:text-sm bg-slate-50/70 border-slate-200"
          />
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Jenis Anggaran */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1 hidden sm:inline-flex">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Biaya:
            </span>
            <select
              value={filterBiaya}
              onChange={(e) => setFilterBiaya(e.target.value as FilterBiaya)}
              className="text-xs font-semibold border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="all">Semua Biaya (Total)</option>
              <option value="uang_harian">Hanya Uang Harian</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1 hidden sm:inline-flex">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-xs font-semibold border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
            >
              <option value="count">Berapa Kali (Frekuensi)</option>
              <option value="totalHari">Total Hari Dinas</option>
              <option value="anggaran">
                Besaran Anggaran {filterBiaya === "uang_harian" ? "(Uang Harian)" : "(Total)"}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* HASIL KOSONG DARI PENCARIAN */}
      {processedItems.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">Tidak ada pegawai yang cocok dengan pencarian.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {processedItems.map((item) => {
            const isTop3 = item.dynamicRank <= 3;
            const isOpen = openId === item.pegawaiId;
            const displayedAnggaran =
              filterBiaya === "uang_harian"
                ? item.totalUangHarian || "0"
                : item.totalPengeluaran;

            return (
              <div key={item.pegawaiId}>
                {/* Row utama — klik untuk toggle accordion */}
                <button
                  className="w-full flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setOpenId(isOpen ? null : item.pegawaiId)}
                >
                  {/* Rank */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      isTop3
                        ? `${rankColors[item.dynamicRank - 1]} bg-slate-100 ring-1 ring-slate-200`
                        : "text-slate-400 bg-slate-50"
                    }`}
                  >
                    {item.dynamicRank}
                  </div>

                  {/* Nama & Jabatan */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.nama}</p>
                    {item.jabatan && (
                      <p className="text-[11px] text-slate-400 truncate">{item.jabatan}</p>
                    )}
                    {item.nip && (
                      <p className="text-[10px] text-slate-300 font-mono">{item.nip}</p>
                    )}
                    {/* Total Pengeluaran (Tampil di Mobile) */}
                    <div className="mt-1 sm:hidden flex items-center gap-1.5">
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

                  {/* Count badge + total hari */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className={`font-bold text-xs px-2 py-0.5 ${
                        sortBy === "count"
                          ? "bg-indigo-600 text-white"
                          : isTop3
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.count}×
                    </Badge>
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
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Riwayat Perjalanan ({item.trips.length} kegiatan)
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
