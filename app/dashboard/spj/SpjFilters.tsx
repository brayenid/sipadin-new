"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "use-debounce";

export default function SpjFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(search, 400);

  const [jenis, setJenis] = useState(searchParams.get("jenis") || "");

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    const currentJenis = searchParams.get("jenis") || "";

    if (debouncedSearch === currentSearch && jenis === currentJenis) {
      return;
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }

      if (jenis) {
        params.set("jenis", jenis);
      } else {
        params.delete("jenis");
      }

      params.set("page", "1"); // Selalu reset ke halaman 1 jika filter berubah

      router.push(`/dashboard/spj?${params.toString()}`);
    });
  }, [debouncedSearch, jenis, router, searchParams]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cari sumber dana atau personel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="w-full sm:max-w-[200px]">
        <select
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/15 focus-visible:border-indigo-600 transition-colors"
        >
          <option value="">Semua Jenis SPJ</option>
          <option value="PERJADIN">Perjalanan Dinas</option>
          <option value="MAKAN_MINUM">Makan Minum</option>
          <option value="HONORARIUM">Honorarium</option>
        </select>
      </div>
      {isPending && (
        <div className="flex items-center">
          <span className="text-xs text-slate-500 animate-pulse">Memuat...</span>
        </div>
      )}
    </div>
  );
}
