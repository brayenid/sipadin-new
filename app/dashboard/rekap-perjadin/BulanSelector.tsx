"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";

export const NAMA_BULAN = [
  { value: "all", label: "Semua Bulan (Jan - Des)" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function BulanSelector({ selected }: { selected?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentBulan = selected || searchParams.get("bulan") || "all";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        Bulan
      </label>
      <select
        value={currentBulan}
        onChange={handleChange}
        className="text-xs sm:text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer h-9"
      >
        {NAMA_BULAN.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
    </div>
  );
}
