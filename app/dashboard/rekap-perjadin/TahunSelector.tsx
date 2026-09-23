"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

export default function TahunSelector({
  tahunList,
  selected,
}: {
  tahunList: string[];
  selected?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tahun", e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
        <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
        Tahun
      </label>
      <select
        value={selected || ""}
        onChange={handleChange}
        className="text-xs sm:text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer h-9"
      >
        {tahunList.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
