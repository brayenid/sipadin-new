"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  bulkUpdatePegawaiTimInternal,
  getPegawaisPaginated,
} from "@/app/actions/pegawai";
import {
  Loader2,
  Users,
  UserCheck,
  UserX,
  Building2,
  Save,
  AlertCircle,
  Search,
  CheckCircle2,
  ShieldCheck,
  FilterX,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import ExcelColumnFilter from "../pegawai/ExcelColumnFilter";

type Pegawai = {
  id: string;
  nip: string | null;
  nama: string;
  pangkat: string | null;
  golongan: string | null;
  jabatan: string;
  instansi: string | null;
  eselon: string | null;
  timInternal: boolean;
  faceDescriptor?: string | null;
  faceEnrolledAt?: Date | string | null;
};

type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

type StatsMeta = {
  totalPegawai: number;
  totalInternal: number;
  totalEksternal: number;
  countEselon: number;
};

export default function PegawaiInternalList({
  initialData,
  pagination,
  stats,
  isSuperAdmin = false,
}: {
  initialData: Pegawai[];
  pagination: PaginationMeta;
  stats: StatsMeta;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [bulkData, setBulkData] = useState<Pegawai[]>(initialData.map((p) => ({ ...p })));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Column Filters State (Excel-Like)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({
    pangkat: null,
    golongan: null,
    jabatan: null,
    instansi: null,
    eselon: null,
  });

  // Auto Load More (Infinite Scroll) state
  const [page, setPage] = useState(pagination?.page || 1);
  const [hasMore, setHasMore] = useState((pagination?.totalPages || 1) > (pagination?.page || 1));
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  const filterStatus = searchParams.get("status") || "ALL";
  const filterEselon = searchParams.get("eselon") || "ALL";

  // Sync state when initialData changes from URL search / router
  useEffect(() => {
    setBulkData(initialData.map((p) => ({ ...p })));
    setPage(pagination?.page || 1);
    setHasMore((pagination?.totalPages || 1) > (pagination?.page || 1));
  }, [initialData, pagination]);

  // Load more next batch of rows
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await getPegawaisPaginated({
        page: nextPage,
        limit: 50,
        search: searchParams.get("search") || undefined,
        timInternal: (searchParams.get("status") as any) || undefined,
        eselon: (searchParams.get("eselon") as any) || undefined,
        sort: (searchParams.get("sort") as any) || undefined,
        direction: (searchParams.get("dir") as any) || undefined,
      });

      if (res.items && res.items.length > 0) {
        setBulkData((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const fresh = res.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...fresh.map((p) => ({ ...p }))];
        });
        setPage(nextPage);
        setHasMore(nextPage < res.pagination.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[AutoLoadMore Error]:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup IntersectionObserver for auto load more
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !isPending) {
          handleLoadMore();
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, isPending]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get("search") || "";
      if (searchQuery !== current) {
        updateUrl({ search: searchQuery || undefined, page: "1" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateUrl = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (
        val === undefined ||
        val === "" ||
        (key === "status" && val === "ALL") ||
        (key === "eselon" && val === "ALL")
      ) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  // --- Filter Options Extraction ---
  const {
    pangkatOptions,
    golonganOptions,
    jabatanOptions,
    instansiOptions,
    eselonOptions,
  } = useMemo(() => {
    const pangkatMap = new Map<string, number>();
    const golonganMap = new Map<string, number>();
    const jabatanMap = new Map<string, number>();
    const instansiMap = new Map<string, number>();
    const eselonMap = new Map<string, number>();

    for (let i = 0; i < bulkData.length; i++) {
      const p = bulkData[i];
      const pangkat = p.pangkat || "(Kosong)";
      const golongan = p.golongan || "(Kosong)";
      const jabatan = p.jabatan || "(Kosong)";
      const instansi = p.instansi || "Sekretariat Daerah";
      const eselon = p.eselon || "Non Eselon";

      pangkatMap.set(pangkat, (pangkatMap.get(pangkat) || 0) + 1);
      golonganMap.set(golongan, (golonganMap.get(golongan) || 0) + 1);
      jabatanMap.set(jabatan, (jabatanMap.get(jabatan) || 0) + 1);
      instansiMap.set(instansi, (instansiMap.get(instansi) || 0) + 1);
      eselonMap.set(eselon, (eselonMap.get(eselon) || 0) + 1);
    }

    const toSortedOptions = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([val, count]) => ({ label: val, value: val, count }))
        .sort((a, b) => a.label.localeCompare(b.label, "id", { sensitivity: "base" }));

    return {
      pangkatOptions: toSortedOptions(pangkatMap),
      golonganOptions: toSortedOptions(golonganMap),
      jabatanOptions: toSortedOptions(jabatanMap),
      instansiOptions: toSortedOptions(instansiMap),
      eselonOptions: toSortedOptions(eselonMap),
    };
  }, [bulkData]);

  // Fast Filtered Data
  const displayedData = useMemo(() => {
    const pangkatSet = columnFilters.pangkat ? new Set(columnFilters.pangkat) : null;
    const golonganSet = columnFilters.golongan ? new Set(columnFilters.golongan) : null;
    const jabatanSet = columnFilters.jabatan ? new Set(columnFilters.jabatan) : null;
    const instansiSet = columnFilters.instansi ? new Set(columnFilters.instansi) : null;
    const eselonSet = columnFilters.eselon ? new Set(columnFilters.eselon) : null;

    if (!pangkatSet && !golonganSet && !jabatanSet && !instansiSet && !eselonSet) {
      return bulkData;
    }

    return bulkData.filter((row) => {
      if (pangkatSet && !pangkatSet.has(row.pangkat || "(Kosong)")) return false;
      if (golonganSet && !golonganSet.has(row.golongan || "(Kosong)")) return false;
      if (jabatanSet && !jabatanSet.has(row.jabatan || "(Kosong)")) return false;
      if (instansiSet && !instansiSet.has(row.instansi || "Sekretariat Daerah")) return false;
      if (eselonSet && !eselonSet.has(row.eselon || "Non Eselon")) return false;
      return true;
    });
  }, [bulkData, columnFilters]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(columnFilters).filter((f) => f !== null).length;
  }, [columnFilters]);

  const handleResetAllFilters = () => {
    setColumnFilters({
      pangkat: null,
      golongan: null,
      jabatan: null,
      instansi: null,
      eselon: null,
    });
  };

  // --- Computed Dirty States ---
  const getDirtyItems = () => {
    return bulkData.filter((row) => {
      const original = initialData.find((p) => p.id === row.id);
      if (!original) return false;
      return original.timInternal !== row.timInternal;
    });
  };

  const dirtyItems = getDirtyItems();
  const totalChanges = dirtyItems.length;

  // Single Row Toggle
  const handleToggleSingle = (id: string, currentVal: boolean) => {
    setBulkData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, timInternal: !currentVal } : item))
    );
  };

  // Bulk toggle for all currently displayed rows in local state (Save button required to persist)
  const allCurrentSelected =
    displayedData.length > 0 && displayedData.every((item) => item.timInternal);

  const handleSelectAll = (timInternal: boolean) => {
    const displayedIds = new Set(displayedData.map((d) => d.id));
    setBulkData((prev) =>
      prev.map((item) => (displayedIds.has(item.id) ? { ...item, timInternal } : item))
    );
  };

  // Save changes
  const handleSaveBulk = async () => {
    if (dirtyItems.length === 0) {
      toast.info("Tidak ada perubahan yang perlu disimpan.");
      return;
    }

    setBulkLoading(true);
    try {
      const payload = dirtyItems.map((d) => ({
        id: d.id,
        timInternal: d.timInternal,
      }));

      await bulkUpdatePegawaiTimInternal(payload);
      toast.success(`Berhasil memperbarui ${dirtyItems.length} data pegawai internal.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data pegawai.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Sort handlers (Server URL Sort)
  const currentSort = searchParams.get("sort") || "nama";
  const currentDir = searchParams.get("dir") || "asc";

  const handleSort = (field: "nama" | "golongan" | "jabatan" | "instansi", dir: "asc" | "desc") => {
    updateUrl({ sort: field, dir, page: "1" });
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Kartu Ringkasan Atas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Pegawai</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.totalPegawai}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Tim Internal (SPJ & Naskah)</p>
              <h3 className="text-xl font-bold text-emerald-600">{stats.totalInternal}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pegawai Eksternal/Luar</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.totalEksternal}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Internal Ber-Eselon</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.countEselon}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="bg-white border-slate-200/70 shadow-xs overflow-hidden rounded-xl">
        <CardHeader className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Kelola Tim Internal
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {displayedData.length}
                {displayedData.length !== bulkData.length ? ` dari ${bulkData.length}` : ""}
              </span>
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Centang pegawai yang termasuk dalam Tim Internal. Hanya pegawai yang dicentang yang akan muncul di dropdown pembuatan SPJ, personel, dan penandatangan Naskah Dinas.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {totalChanges > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center text-xs">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {totalChanges} belum disimpan
              </Badge>
            )}
            <Button
              onClick={handleSaveBulk}
              disabled={bulkLoading || isPending || totalChanges === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 font-bold shadow-xs"
            >
              {bulkLoading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Simpan Perubahan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama pegawai, NIP, jabatan, atau OPD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
              {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <select
                value={filterStatus}
                onChange={(e) => updateUrl({ status: e.target.value, page: "1" })}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 h-9"
              >
                <option value="ALL">Semua Status (Semua Pegawai)</option>
                <option value="INTERNAL">Hanya Tim Internal (Aktif SPJ & Naskah)</option>
                <option value="EKSTERNAL">Hanya Eksternal / Belum Masuk Tim</option>
              </select>

              <select
                value={filterEselon}
                onChange={(e) => updateUrl({ eselon: e.target.value, page: "1" })}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 h-9"
              >
                <option value="ALL">Semua Eselon</option>
                <option value="I.a">Eselon I.a</option>
                <option value="I.b">Eselon I.b</option>
                <option value="II.a">Eselon II.a</option>
                <option value="II.b">Eselon II.b</option>
                <option value="III.a">Eselon III.a</option>
                <option value="III.b">Eselon III.b</option>
                <option value="IV.a">Eselon IV.a</option>
                <option value="IV.b">Eselon IV.b</option>
                <option value="NON_ESELON">Non Eselon / Staf</option>
              </select>

              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetAllFilters}
                  className="h-9 px-2.5 text-xs text-indigo-700 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100/80 font-medium"
                >
                  <FilterX className="w-3.5 h-3.5 mr-1" />
                  Reset Filter ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Tabel Pegawai Internal */}
          <div className="border border-slate-200/60 rounded-lg overflow-x-auto relative">
            {isPending && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-slate-50/70 text-xs">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  
                  {/* Kolom Toggle Tim Internal dengan Bulk Action */}
                  <TableHead className="min-w-[150px] text-center text-xs">
                    <div
                      className="flex items-center justify-center gap-1.5 cursor-pointer select-none py-1 hover:text-indigo-600 transition-colors"
                      onClick={() => handleSelectAll(!allCurrentSelected)}
                      title={allCurrentSelected ? "Batalkan pilihan semua pegawai pada tabel" : "Pilih semua pegawai pada tabel sebagai Tim Internal"}
                    >
                      <Checkbox
                        checked={allCurrentSelected}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                        aria-label="Pilih Semua Tim Internal"
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                        TIM INTERNAL
                      </span>
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[150px] px-3 font-semibold text-slate-700">NIP</TableHead>

                  <TableHead
                    className="min-w-[220px] px-3 cursor-pointer hover:bg-slate-100/70 select-none group transition-colors"
                    onClick={() => handleSort("nama", currentSort === "nama" && currentDir === "asc" ? "desc" : "asc")}
                    title="Klik untuk mengurutkan Nama"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Nama Lengkap</span>
                      {currentSort === "nama" ? (
                        currentDir === "asc" ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="min-w-[130px] p-1">
                    <ExcelColumnFilter
                      title="Pangkat"
                      selectedValues={columnFilters.pangkat}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, pangkat: sel }))}
                      options={pangkatOptions}
                    />
                  </TableHead>

                  <TableHead className="min-w-[110px] p-1">
                    <ExcelColumnFilter
                      title="Golongan"
                      selectedValues={columnFilters.golongan}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, golongan: sel }))}
                      options={golonganOptions}
                      onSortAsc={() => handleSort("golongan", "asc")}
                      onSortDesc={() => handleSort("golongan", "desc")}
                      isSortedAsc={currentSort === "golongan" && currentDir === "asc"}
                      isSortedDesc={currentSort === "golongan" && currentDir === "desc"}
                    />
                  </TableHead>

                  <TableHead className="min-w-[180px] p-1">
                    <ExcelColumnFilter
                      title="Jabatan"
                      selectedValues={columnFilters.jabatan}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, jabatan: sel }))}
                      options={jabatanOptions}
                      onSortAsc={() => handleSort("jabatan", "asc")}
                      onSortDesc={() => handleSort("jabatan", "desc")}
                      isSortedAsc={currentSort === "jabatan" && currentDir === "asc"}
                      isSortedDesc={currentSort === "jabatan" && currentDir === "desc"}
                    />
                  </TableHead>

                  <TableHead className="min-w-[200px] p-1">
                    <ExcelColumnFilter
                      title="Instansi / OPD"
                      selectedValues={columnFilters.instansi}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, instansi: sel }))}
                      options={instansiOptions}
                      onSortAsc={() => handleSort("instansi", "asc")}
                      onSortDesc={() => handleSort("instansi", "desc")}
                      isSortedAsc={currentSort === "instansi" && currentDir === "asc"}
                      isSortedDesc={currentSort === "instansi" && currentDir === "desc"}
                    />
                  </TableHead>

                  <TableHead className="min-w-[120px] p-1">
                    <ExcelColumnFilter
                      title="Eselon"
                      selectedValues={columnFilters.eselon}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, eselon: sel }))}
                      options={eselonOptions}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400 text-xs">
                      {activeFiltersCount > 0 || searchQuery ? (
                        <div className="flex flex-col items-center gap-2">
                          <p>Tidak ada data pegawai yang sesuai dengan filter yang dipilih.</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetAllFilters}
                            className="text-xs text-indigo-600 border-indigo-200"
                          >
                            <FilterX className="w-3.5 h-3.5 mr-1" />
                            Bersihkan Filter Kolom
                          </Button>
                        </div>
                      ) : (
                        "Tidak ada data pegawai."
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedData.map((row, idx) => {
                    const original = initialData.find((p) => p.id === row.id);
                    const isDirty = original && original.timInternal !== row.timInternal;

                    return (
                      <TableRow
                        key={row.id}
                        className={`transition-colors text-xs ${
                          isDirty
                            ? "bg-amber-50/40 hover:bg-amber-50/60"
                            : row.timInternal
                            ? "bg-indigo-50/15 hover:bg-indigo-50/30 font-medium"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <TableCell className="text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </TableCell>

                        {/* Checkbox Status Tim Internal */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={row.timInternal}
                              onCheckedChange={() => handleToggleSingle(row.id, row.timInternal)}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                            {row.timInternal ? (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Internal
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Luar</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-slate-600">
                          {row.nip || "-"}
                        </TableCell>

                        <TableCell className="font-medium text-slate-900">
                          {row.nama}
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {row.pangkat || "-"}
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {row.golongan || "-"}
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {row.jabatan}
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {row.instansi || "Sekretariat Daerah"}
                        </TableCell>

                        <TableCell className="text-slate-600">
                          {row.eselon ? (
                            <Badge variant="outline" className="text-[10px] font-normal text-slate-600 bg-slate-50">
                              {row.eselon}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Infinite Scroll Sentinel & Indicator */}
          <div ref={observerRef} className="py-6 flex flex-col items-center justify-center min-h-[50px]">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-full px-4 py-1.5 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat data pegawai selanjutnya...</span>
              </div>
            )}
            {!hasMore && bulkData.length > 0 && (
              <p className="text-xs text-slate-400 font-medium">
                Semua data ({bulkData.length}) telah dimuat
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Floating Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2">
        <Button
          onClick={handleSaveBulk}
          disabled={bulkLoading || totalChanges === 0}
          className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
        >
          {bulkLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan Perubahan {totalChanges > 0 ? `(${totalChanges})` : ""}
        </Button>
      </div>
    </div>
  );
}
