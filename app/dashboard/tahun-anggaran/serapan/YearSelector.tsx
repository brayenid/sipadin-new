"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function YearSelector({ 
  tahunList, 
  currentTahun 
}: { 
  tahunList: string[], 
  currentTahun: string 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTahunChange = (val: string | null) => {
    if (val) {
      setLoading(true);
      router.push(`/dashboard/tahun-anggaran/serapan?tahun=${val}`);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-4 sm:mt-0">
      <span className="text-xs sm:text-sm font-medium text-slate-600 hidden sm:inline">Pilih Tahun:</span>
      <Select value={currentTahun} onValueChange={handleTahunChange} disabled={loading}>
        <SelectTrigger className="h-9 text-xs sm:text-sm font-medium w-full sm:w-[120px] bg-white">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          {tahunList.map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
