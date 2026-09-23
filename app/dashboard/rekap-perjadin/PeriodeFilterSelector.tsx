"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange, Calendar } from "lucide-react";
import { NAMA_BULAN } from "./constants";

export default function PeriodeFilterSelector({
  tahunList,
  selectedTahun,
  selectedBulan,
}: {
  tahunList: string[];
  selectedTahun?: string;
  selectedBulan?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentBulan = selectedBulan || searchParams.get("bulan") || "all";
  const currentTahun = selectedTahun || searchParams.get("tahun") || tahunList[0] || "";

  const handleTahunChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tahun", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBulanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = e.target.value;
    if (val === "all") {
      params.delete("bulan");
    } else {
      params.set("bulan", val);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="inline-flex items-center bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-2xs divide-x divide-slate-200">
      {/* Selector Tahun */}
      <div className="flex items-center gap-1.5 px-2.5 py-1">
        <CalendarRange className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">TA</span>
        <select
          value={currentTahun}
          onChange={handleTahunChange}
          className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer py-0.5 pr-1"
        >
          {tahunList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Selector Bulan */}
      <div className="flex items-center gap-1.5 px-2.5 py-1">
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select
          value={currentBulan}
          onChange={handleBulanChange}
          className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer py-0.5 pr-1 max-w-[170px] sm:max-w-none truncate"
        >
          {NAMA_BULAN.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
