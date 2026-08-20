"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkUpsertPegawai, getPegawaisPaginated } from "@/app/actions/pegawai";
import { resetPegawaiBiometric } from "@/app/actions/absensi";
import {
  Loader2,
  Plus,
  Trash2,
  Users,
  Save,
  AlertCircle,
  ScanFace,
  RotateCcw,
  CheckCircle2,
  FilterX,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileActionBar from "@/components/dashboard/MobileActionBar";
import PegawaiExcelActions from "./PegawaiExcelActions";
import ExcelColumnFilter, { FilterOption } from "./ExcelColumnFilter";

type Pegawai = {
  id: string;
  nip: string | null;
  nama: string;
  pangkat: string | null;
  golongan: string | null;
  jabatan: string;
  instansi: string | null;
  eselon: string | null;
  timInternal?: boolean;
  faceDescriptor?: string | null;
  faceEnrolledAt?: Date | string | null;
};

type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export default function PegawaiList({
  initialData,
  pagination,
  isSuperAdmin = false,
}: {
  initialData: Pegawai[];
  pagination?: PaginationMeta;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<Pegawai[]>(initialData);
  const [bulkData, setBulkData] = useState<Pegawai[]>(initialData.map((p) => ({ ...p })));
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Column Filters State (Excel-Like)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[] | null>>({
    pangkat: null,
    golongan: null,
    jabatan: null,
    instansi: null,
    eselon: null,
    biometrik: null,
  });

  // Biometric reset dialog state
  const [resetBiometricPegawai, setResetBiometricPegawai] = useState<Pegawai | null>(null);
  const [resettingBiometric, setResettingBiometric] = useState(false);

  // Auto Load More (Infinite Scroll) state
  const [page, setPage] = useState(pagination?.page || 1);
  const [hasMore, setHasMore] = useState((pagination?.totalPages || 1) > (pagination?.page || 1));
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Sync state when initialData changes from URL search / router
  useEffect(() => {
    setData(initialData);
    setBulkData(initialData.map((p) => ({ ...p })));
    setPage(pagination?.page || 1);
    setHasMore((pagination?.totalPages || 1) > (pagination?.page || 1));
    setDeleteIds([]);
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
        sort: (searchParams.get("sort") as any) || undefined,
        direction: (searchParams.get("dir") as any) || undefined,
      });

      if (res.items && res.items.length > 0) {
        setData((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const fresh = res.items.filter((i) => !existingIds.has(i.id));
          return [...prev, ...fresh];
        });
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
      if (val === undefined || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  // --- Single-pass High Performance Extraction of Unique Filter Options ---
  const {
    pangkatOptions,
    golonganOptions,
    jabatanOptions,
    instansiOptions,
    eselonOptions,
    biometrikOptions,
  } = useMemo(() => {
    const pangkatMap = new Map<string, number>();
    const golonganMap = new Map<string, number>();
    const jabatanMap = new Map<string, number>();
    const instansiMap = new Map<string, number>();
    const eselonMap = new Map<string, number>();
    let terdaftarCount = 0;
    let belumTerdaftarCount = 0;

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

      if (p.faceDescriptor) terdaftarCount++;
      else belumTerdaftarCount++;
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
      biometrikOptions: [
        { label: "Terdaftar", value: "TERDAFTAR", count: terdaftarCount },
        { label: "Belum Terdaftar", value: "BELUM_TERDAFTAR", count: belumTerdaftarCount },
      ],
    };
  }, [bulkData]);

  // --- Fast O(1) Filtered Display Rows (Instant Filtering for Thousands of Rows) ---
  const displayedData = useMemo(() => {
    const pangkatSet = columnFilters.pangkat ? new Set(columnFilters.pangkat) : null;
    const golonganSet = columnFilters.golongan ? new Set(columnFilters.golongan) : null;
    const jabatanSet = columnFilters.jabatan ? new Set(columnFilters.jabatan) : null;
    const instansiSet = columnFilters.instansi ? new Set(columnFilters.instansi) : null;
    const eselonSet = columnFilters.eselon ? new Set(columnFilters.eselon) : null;
    const biometrikSet = columnFilters.biometrik ? new Set(columnFilters.biometrik) : null;

    if (
      !pangkatSet &&
      !golonganSet &&
      !jabatanSet &&
      !instansiSet &&
      !eselonSet &&
      !biometrikSet
    ) {
      return bulkData;
    }

    return bulkData.filter((row) => {
      if (pangkatSet && !pangkatSet.has(row.pangkat || "(Kosong)")) return false;
      if (golonganSet && !golonganSet.has(row.golongan || "(Kosong)")) return false;
      if (jabatanSet && !jabatanSet.has(row.jabatan || "(Kosong)")) return false;
      if (instansiSet && !instansiSet.has(row.instansi || "Sekretariat Daerah")) return false;
      if (eselonSet && !eselonSet.has(row.eselon || "Non Eselon")) return false;
      if (biometrikSet) {
        const bio = row.faceDescriptor ? "TERDAFTAR" : "BELUM_TERDAFTAR";
        if (!biometrikSet.has(bio)) return false;
      }
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
      biometrik: null,
    });
  };

  // --- Computed Dirty States ---
  const isRowDirty = (row: Pegawai) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find((p) => p.id === row.id);
    if (!original) return false;
    return (
      (original.nip || "") !== (row.nip || "") ||
      original.nama !== row.nama ||
      (original.pangkat || "") !== (row.pangkat || "") ||
      (original.golongan || "") !== (row.golongan || "") ||
      original.jabatan !== row.jabatan ||
      (original.instansi || "") !== (row.instansi || "") ||
      (original.eselon || "") !== (row.eselon || "") ||
      Boolean(original.timInternal) !== Boolean(row.timInternal)
    );
  };

  const isFieldDirty = (row: Pegawai, field: keyof Pegawai) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find((p) => p.id === row.id);
    if (!original) return false;
    if (field === "timInternal") {
      return Boolean(original.timInternal) !== Boolean(row.timInternal);
    }
    return (original[field] || "") !== (row[field] || "");
  };

  const newRowsCount = bulkData.filter((r) => r.id.startsWith("temp-")).length;
  const updatedRowsCount = bulkData.filter((r) => !r.id.startsWith("temp-") && isRowDirty(r)).length;
  const deletedCount = deleteIds.length;
  const totalChanges = newRowsCount + updatedRowsCount + deletedCount;

  // ---------------- TABLE HANDLERS ----------------
  const addBulkRow = () => {
    setBulkData([
      {
        id: `temp-${Date.now()}`,
        nip: "",
        nama: "",
        pangkat: "",
        golongan: "",
        jabatan: "",
        instansi: "Sekretariat Daerah",
        eselon: "",
        timInternal: false,
        faceDescriptor: null,
      },
      ...bulkData,
    ]);
  };

  const updateBulkRow = (id: string, field: keyof Pegawai, value: any) => {
    const newData = [...bulkData];
    const index = newData.findIndex((r) => r.id === id);
    if (index !== -1) {
      newData[index] = { ...newData[index], [field]: value };
      setBulkData(newData);
    }
  };

  const removeBulkRow = (id: string) => {
    if (!id.startsWith("temp-")) {
      setDeleteIds([...deleteIds, id]);
    }
    const newData = bulkData.filter((r) => r.id !== id);
    setBulkData(newData);
  };

  const saveBulk = async () => {
    setBulkLoading(true);
    try {
      await bulkUpsertPegawai(bulkData, deleteIds);
      toast.success("Perubahan data pegawai berhasil disimpan.");
      router.refresh();
      setDeleteIds([]);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data massal.");
    }
    setBulkLoading(false);
  };

  const handleResetBiometric = async () => {
    if (!resetBiometricPegawai) return;
    setResettingBiometric(true);
    try {
      const res = await resetPegawaiBiometric(resetBiometricPegawai.id);
      if (res.success) {
        toast.success(`Data biometrik ${resetBiometricPegawai.nama} berhasil direset.`);
        setBulkData((prev) =>
          prev.map((p) => (p.id === resetBiometricPegawai.id ? { ...p, faceDescriptor: null } : p))
        );
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mereset data biometrik");
    }
    setResettingBiometric(false);
    setResetBiometricPegawai(null);
  };

  // Sort handlers (Server URL Sort)
  const currentSort = searchParams.get("sort") || "nama";
  const currentDir = searchParams.get("dir") || "asc";

  const handleSort = (field: "nama" | "golongan" | "jabatan" | "instansi", dir: "asc" | "desc") => {
    updateUrl({ sort: field, dir, page: "1" });
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      {/* Header Search & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="Cari nama, NIP, jabatan, atau OPD..."
              className="h-9 w-full text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isPending && (
              <div className="absolute right-2.5 top-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetAllFilters}
              className="h-9 px-2.5 text-xs text-indigo-700 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100/80 shrink-0 font-medium"
              title="Reset semua filter kolom"
            >
              <FilterX className="w-3.5 h-3.5 mr-1" />
              Reset Filter ({activeFiltersCount})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {isSuperAdmin && <PegawaiExcelActions data={data} />}
          {isSuperAdmin && (
            <div className="hidden lg:flex gap-2">
              <Button onClick={addBulkRow} size="sm" variant="outline" className="text-xs bg-white shadow-2xs">
                <Plus className="w-4 h-4 mr-1.5 text-indigo-600" /> Tambah Baris
              </Button>
              <Button
                onClick={saveBulk}
                size="sm"
                disabled={bulkLoading || totalChanges === 0}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 font-bold shadow-xs text-white"
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Simpan Perubahan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabel Utama Pegawai */}
      <Card className="p-0 gap-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 pb-3 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto flex-wrap">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Data Pegawai ({displayedData.length}
              {displayedData.length !== bulkData.length ? ` dari ${bulkData.length}` : ""})
              {isPending && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[11px] font-semibold">
                {activeFiltersCount} filter aktif
              </Badge>
            )}
            {totalChanges > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center text-[11px]">
                <AlertCircle className="w-3 h-3 mr-1" />
                {totalChanges} perubahan belum disimpan
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto relative">
            {isPending && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-slate-50 text-xs">
                <TableRow>
                  {/* 1. NIP - Tanpa Filter */}
                  <TableHead className="min-w-[160px] px-3 font-semibold text-slate-700">NIP</TableHead>

                  {/* 2. NAMA LENGKAP - Hanya Sort */}
                  <TableHead
                    className="min-w-[240px] px-3 cursor-pointer hover:bg-slate-100/70 select-none group transition-colors"
                    onClick={() => handleSort("nama", currentSort === "nama" && currentDir === "asc" ? "desc" : "asc")}
                    title="Klik untuk mengurutkan Nama Lengkap"
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

                  {/* 3. PANGKAT */}
                  <TableHead className="min-w-[130px] p-1">
                    <ExcelColumnFilter
                      title="Pangkat"
                      selectedValues={columnFilters.pangkat}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, pangkat: sel }))}
                      options={pangkatOptions}
                    />
                  </TableHead>

                  {/* 4. GOLONGAN */}
                  <TableHead className="min-w-[120px] p-1">
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

                  {/* 5. JABATAN */}
                  <TableHead className="min-w-[190px] p-1">
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

                  {/* 6. INSTANSI / OPD */}
                  <TableHead className="min-w-[210px] p-1">
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

                  {/* 7. ESELON */}
                  <TableHead className="min-w-[130px] p-1">
                    <ExcelColumnFilter
                      title="Eselon"
                      selectedValues={columnFilters.eselon}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, eselon: sel }))}
                      options={eselonOptions}
                    />
                  </TableHead>

                  {/* 8. TIM INTERNAL */}
                  <TableHead className="min-w-[120px] px-3 text-center font-semibold text-slate-700">
                    Tim Internal
                  </TableHead>

                  {/* 9. STATUS BIOMETRIK */}
                  <TableHead className="min-w-[145px] p-1">
                    <ExcelColumnFilter
                      title="Status Biometrik"
                      selectedValues={columnFilters.biometrik}
                      onFilterChange={(sel) => setColumnFilters((prev) => ({ ...prev, biometrik: sel }))}
                      options={biometrikOptions}
                      align="end"
                    />
                  </TableHead>

                  {isSuperAdmin && <TableHead className="w-[50px] text-center"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedData.map((row) => {
                  const rowIsNew = row.id.startsWith("temp-");
                  const hasBiometric = !!row.faceDescriptor;

                  return (
                    <TableRow
                      key={row.id}
                      className={rowIsNew ? "bg-emerald-50/40" : isRowDirty(row) ? "bg-amber-50/30" : ""}
                    >
                      <TableCell className="p-2">
                        <Input
                          value={row.nip || ""}
                          onChange={(e) => updateBulkRow(row.id, "nip", e.target.value)}
                          readOnly={!isSuperAdmin}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "nip") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                          }`}
                          placeholder="NIP..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.nama}
                          onChange={(e) => updateBulkRow(row.id, "nama", e.target.value)}
                          readOnly={!isSuperAdmin}
                          className={`h-8 text-xs font-semibold rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "nama") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                          }`}
                          placeholder="Nama lengkap..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.pangkat || ""}
                          onChange={(e) => updateBulkRow(row.id, "pangkat", e.target.value)}
                          readOnly={!isSuperAdmin}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "pangkat") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                          }`}
                          placeholder="Pangkat..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.golongan || ""}
                          onChange={(e) => updateBulkRow(row.id, "golongan", e.target.value)}
                          readOnly={!isSuperAdmin}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "golongan") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                          }`}
                          placeholder="Golongan..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.jabatan}
                          onChange={(e) => updateBulkRow(row.id, "jabatan", e.target.value)}
                          readOnly={!isSuperAdmin}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "jabatan") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                          }`}
                          placeholder="Jabatan..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.instansi || ""}
                          onChange={(e) => updateBulkRow(row.id, "instansi", e.target.value)}
                          readOnly={!isSuperAdmin}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "instansi") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                          }`}
                          placeholder="Instansi / OPD..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={row.eselon || "NON_ESELON"}
                          onValueChange={(val) =>
                            updateBulkRow(row.id, "eselon", val === "NON_ESELON" ? "" : val || "")
                          }
                          disabled={!isSuperAdmin}
                        >
                          <SelectTrigger
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                              isFieldDirty(row, "eselon") && !rowIsNew ? "bg-amber-50 font-medium text-amber-900 border-amber-200" : ""
                            }`}
                          >
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="I.a">I.a</SelectItem>
                            <SelectItem value="I.b">I.b</SelectItem>
                            <SelectItem value="II.a">II.a</SelectItem>
                            <SelectItem value="II.b">II.b</SelectItem>
                            <SelectItem value="III.a">III.a</SelectItem>
                            <SelectItem value="III.b">III.b</SelectItem>
                            <SelectItem value="IV.a">IV.a</SelectItem>
                            <SelectItem value="IV.b">IV.b</SelectItem>
                            <SelectItem value="NON_ESELON">Non Eselon</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* KOLOM TIM INTERNAL */}
                      <TableCell className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={Boolean(row.timInternal)}
                            onChange={(e) => updateBulkRow(row.id, "timInternal", e.target.checked)}
                            disabled={!isSuperAdmin}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          {row.timInternal ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              Ya
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              Tidak
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* KOLOM STATUS BIOMETRIK */}
                      <TableCell className="p-2">
                        {hasBiometric ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terdaftar
                            </span>
                            {isSuperAdmin && !rowIsNew && (
                              <button
                                type="button"
                                onClick={() => setResetBiometricPegawai(row)}
                                className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                                title="Reset Data Biometrik Master"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Belum Terdaftar
                          </span>
                        )}
                      </TableCell>

                      {isSuperAdmin && (
                        <TableCell className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeBulkRow(row.id)}
                            title={rowIsNew ? "Batalkan baris baru" : "Hapus Pegawai"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {displayedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-slate-500 text-xs">
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
                        "Tidak ada baris data. Klik \"Tambah Baris\" untuk mulai menginput."
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Infinite Scroll Sentinel & Indicator */}
          <div ref={observerRef} className="py-6 flex flex-col items-center justify-center min-h-[50px] border-t border-slate-100 bg-slate-50/30">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-full px-4 py-1.5 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat baris selanjutnya...</span>
              </div>
            )}
            {!hasMore && bulkData.length > 0 && (
              <p className="text-xs text-slate-400 font-medium">Semua data pegawai ({bulkData.length}) telah dimuat</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Konfirmasi Reset Biometrik Pegawai */}
      <AlertDialog
        open={!!resetBiometricPegawai}
        onOpenChange={(open) => !open && setResetBiometricPegawai(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-amber-600" />
              Reset Data Biometrik Master?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>
                Anda akan mereset master biometrik wajah untuk <b>{resetBiometricPegawai?.nama}</b> (NIP: {resetBiometricPegawai?.nip || "-"}).
              </p>
              <p>
                Setelah direset, saat pegawai bersangkutan melakukan presensi selfie berikutnya, foto barunya akan otomatis didaftarkan sebagai master biometrik baru (Status: <b>ENROLLED</b>).
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingBiometric}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetBiometric}
              disabled={resettingBiometric}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              {resettingBiometric ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1.5" />}
              Reset Biometrik
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Action Bar */}
      {isSuperAdmin && (
        <MobileActionBar>
          <div className="flex gap-2">
            <Button className="flex-1 text-xs" variant="outline" onClick={addBulkRow}>
              <Plus className="w-4 h-4 mr-1.5 text-indigo-600" /> Tambah Baris
            </Button>
            <Button
              className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              onClick={saveBulk}
              disabled={bulkLoading || totalChanges === 0}
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Simpan
            </Button>
          </div>
        </MobileActionBar>
      )}
    </div>
  );
}
