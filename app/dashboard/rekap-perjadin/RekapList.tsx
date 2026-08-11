"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, MapPin, Calendar } from "lucide-react";
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
  trips: TripItem[];
};

function formatRupiah(val: string) {
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

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-sm">Belum ada data perjalanan dinas untuk tahun ini.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => {
        const isTop3 = item.rank <= 3;
        const isOpen = openId === item.pegawaiId;

        return (
          <div key={item.pegawaiId}>
            {/* Row utama — klik untuk toggle accordion */}
            <button
              className="w-full flex items-center gap-4 px-4 sm:px-6 py-3 hover:bg-slate-50 transition-colors text-left"
              onClick={() => setOpenId(isOpen ? null : item.pegawaiId)}
            >
              {/* Rank */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  isTop3
                    ? `${rankColors[item.rank - 1]} bg-slate-100`
                    : "text-slate-400 bg-slate-50"
                }`}
              >
                {item.rank}
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
                <p className="text-[11px] font-semibold text-indigo-600 mt-1 sm:hidden">
                  {formatRupiah(item.totalPengeluaran)}
                </p>
              </div>

              {/* Total Pengeluaran (Tampil di Desktop) */}
              <div className="hidden sm:block text-right shrink-0">
                <p className="text-xs text-slate-400">Total Pengeluaran</p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatRupiah(item.totalPengeluaran)}
                </p>
              </div>

              {/* Count badge + total hari */}
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <Badge
                  variant="secondary"
                  className={`font-bold text-xs px-2 py-0.5 ${
                    isTop3
                      ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.count}×
                </Badge>
                <span className="text-[10px] text-slate-400 font-medium">{item.totalHari} hari</span>
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
              <div className="bg-slate-50/70 border-t border-slate-100 px-4 sm:px-6 py-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Riwayat Perjalanan
                </p>
                <div className="space-y-2">
                  {item.trips.map((trip, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 bg-white border border-slate-100 rounded-lg px-3 py-2.5 text-xs"
                    >
                      {/* Tujuan */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-slate-700 font-medium truncate">
                          {trip.tempatBerangkat} → {trip.tempatTujuan}
                        </span>
                      </div>

                      {/* Tanggal */}
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
                        <span>
                          {formatWita(trip.tglBerangkat, 'd MMM yyyy')}
                          {trip.tglBerangkat !== trip.tglKembali &&
                            ` – ${formatWita(trip.tglKembali, 'd MMM yyyy')}`}
                        </span>
                      </div>

                      {/* Perihal */}
                      {trip.perihal && (
                        <span className="text-slate-400 truncate max-w-[200px] hidden sm:block" title={trip.perihal}>
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
  );
}
