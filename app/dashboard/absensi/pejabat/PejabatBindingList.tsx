"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Users,
  Building2,
  Save,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { bulkUpdateBindingPejabat, getPegawaiForBindingPaginated } from "@/app/actions/absensi";

type Pegawai = {
  id: string;
  nip: string | null;
  nama: string;
  jabatan: string;
  instansi: string;
  eselon: string | null;
  kategoriPegawai?: string | null;
  wajibAbsenOpd: boolean;
  urutanOpd: number | null;
};

type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

type StatsMeta = {
  totalPegawai: number;
  totalBound: number;
  countEselon2: number;
  countEselon3: number;
  countNonEselon: number;
};

export default function PejabatBindingList({
  initialItems,
  pagination,
  stats,
}: {
  initialItems: Pegawai[];
  pagination: PaginationMeta;
  stats: StatsMeta;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for items
  const [internalList, setInternalList] = useState<Pegawai[]>(
    initialItems.map((p) => ({ ...p }))
  );
  const [page, setPage] = useState(pagination.page || 1);
  const [hasMore, setHasMore] = useState(pagination.totalPages > pagination.page);
  const [loadingMore, setLoadingMore] = useState(false);

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Sync internalList when initialItems updates from server
  useEffect(() => {
    setInternalList(initialItems.map((p) => ({ ...p })));
    setPage(pagination.page || 1);
    setHasMore(pagination.totalPages > pagination.page);
  }, [initialItems, pagination]);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const filterEselon = searchParams.get("eselon") || "ALL";
  const filterStatus = searchParams.get("status") || "ALL";
  const [saving, setSaving] = useState(false);

  // Debounced URL updates for search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearchInUrl = searchParams.get("search") || "";
      if (search !== currentSearchInUrl) {
        updateUrl({ search: search || undefined, page: "1" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const updateUrl = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === "" || (key === "eselon" && val === "ALL") || (key === "status" && val === "ALL")) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  // Auto Load More next batch
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await getPegawaiForBindingPaginated({
        page: nextPage,
        limit: 50,
        search: searchParams.get("search") || undefined,
        eselon: (searchParams.get("eselon") as any) || undefined,
        status: (searchParams.get("status") as any) || undefined,
      });

      if (res.items && res.items.length > 0) {
        setInternalList((prev) => {
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

  // Deteksi perubahan lokal
  const getDirtyItems = () => {
    return internalList.filter((item) => {
      const original = initialItems.find((p) => p.id === item.id);
      if (!original) return false;
      return (
        original.wajibAbsenOpd !== item.wajibAbsenOpd ||
        original.eselon !== item.eselon ||
        original.kategoriPegawai !== item.kategoriPegawai
      );
    });
  };

  const dirtyCount = getDirtyItems().length;

  const handleToggleSingle = (id: string, currentVal: boolean) => {
    setInternalList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, wajibAbsenOpd: !currentVal } : item))
    );
  };

  const handleEselonChange = (id: string, newEselon: string) => {
    setInternalList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, eselon: newEselon === "NON_ESELON" ? "" : newEselon } : item))
    );
  };

  const handleKategoriChange = (id: string, newKat: string) => {
    setInternalList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, kategoriPegawai: newKat || null } : item))
    );
  };

  // Toggle Semua Data yang Sedang Tampil
  const handleSelectAllCurrentPage = (checked: boolean) => {
    setInternalList((prev) =>
      prev.map((item) => ({
        ...item,
        wajibAbsenOpd: checked,
      }))
    );
  };

  const allCurrentPageSelected =
    internalList.length > 0 && internalList.every((item) => item.wajibAbsenOpd);
  const someCurrentPageSelected =
    internalList.some((item) => item.wajibAbsenOpd);

  const handleSaveBulk = async () => {
    const dirty = getDirtyItems();
    if (dirty.length === 0) {
      toast.info("Tidak ada perubahan yang perlu disimpan.");
      return;
    }

    setSaving(true);
    try {
      const payload = dirty.map((d) => ({
        pegawaiId: d.id,
        wajibAbsenOpd: d.wajibAbsenOpd,
        eselon: d.eselon || null,
        kategoriPegawai: d.kategoriPegawai || null,
      }));

      await bulkUpdateBindingPejabat(payload);
      toast.success(`Berhasil memperbarui ${dirty.length} data pegawai.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Kartu Ringkasan Atas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total Wajib Absen</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.totalBound}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Eselon II (Kadis/Kaban)</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.countEselon2}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Eselon III (Kabid/Sek)</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.countEselon3}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200/70 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Non-Eselon / Staf</p>
              <h3 className="text-xl font-bold text-slate-900">{stats.countNonEselon}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Kontrol Utama & Tabel */}
      <Card className="bg-white border-slate-200/70 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Daftar Pegawai Wajib Absen Apel/Upacara
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Pilih pegawai yang wajib terdaftar dalam presensi default apel gabungan OPD.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-1 px-2.5">
                {dirtyCount} perubahan belum disimpan
              </Badge>
            )}
            <Button
              onClick={handleSaveBulk}
              disabled={saving || dirtyCount === 0}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Simpan Perubahan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Cari nama pegawai, jabatan, atau instansi/OPD..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                value={filterEselon}
                onChange={(e) => updateUrl({ eselon: e.target.value, page: "1" })}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 h-9"
              >
                <option value="ALL">Semua (Termasuk Non-Eselon)</option>
                <option value="ESELON_ONLY">Semua yang Ber-Eselon</option>
                <option value="II.a">Eselon II.a</option>
                <option value="II.b">Eselon II.b</option>
                <option value="III.a">Eselon III.a</option>
                <option value="III.b">Eselon III.b</option>
                <option value="IV.a">Eselon IV.a</option>
                <option value="IV.b">Eselon IV.b</option>
                <option value="NON_ESELON">Khusus Non-Eselon / Staf</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => updateUrl({ status: e.target.value, page: "1" })}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 h-9"
              >
                <option value="ALL">Semua Status</option>
                <option value="WAJIB">Hanya Wajib Absen</option>
                <option value="TIDAK_WAJIB">Belum Wajib Absen</option>
              </select>

              <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-lg border border-slate-200/60">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAllCurrentPage(true)}
                  disabled={internalList.length === 0 || allCurrentPageSelected}
                  className="h-9 text-xs text-indigo-700 hover:bg-white hover:text-indigo-800 font-medium"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Pilih Halaman Ini
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAllCurrentPage(false)}
                  disabled={internalList.length === 0 || !someCurrentPageSelected}
                  className="h-9 text-xs text-slate-600 hover:bg-slate-100 font-medium"
                >
                  <UserX className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Batal Semua
                </Button>
              </div>
            </div>
          </div>

          {/* Tabel Pegawai */}
          <div className="border border-slate-200/60 rounded-lg overflow-x-auto relative">
            {isPending && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="w-20 text-center text-xs">Pilih</TableHead>
                  <TableHead className="text-xs">Nama Pegawai</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs">OPD</TableHead>
                  <TableHead className="text-center w-32 text-xs">Eselon</TableHead>
                  <TableHead className="text-center w-32 text-xs">Grup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {internalList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-xs">
                      Tidak ada data pegawai yang sesuai dengan filter
                    </TableCell>
                  </TableRow>
                ) : (
                  internalList.map((item, idx) => {
                    const original = initialItems.find((p) => p.id === item.id);
                    const isDirty =
                      original &&
                      (original.wajibAbsenOpd !== item.wajibAbsenOpd ||
                        original.eselon !== item.eselon ||
                        original.kategoriPegawai !== item.kategoriPegawai);

                    return (
                      <TableRow
                        key={item.id}
                        className={`transition-colors text-xs ${
                          isDirty
                            ? "bg-amber-50/40 hover:bg-amber-50/60"
                            : item.wajibAbsenOpd
                            ? "bg-indigo-50/15 hover:bg-indigo-50/30"
                            : "hover:bg-slate-50/50"
                        }`}
                      >
                        <TableCell className="text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={item.wajibAbsenOpd}
                              onCheckedChange={() => handleToggleSingle(item.id, item.wajibAbsenOpd)}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          <div>
                            <span>{item.nama}</span>
                            {item.nip && (
                              <span className="block text-[11px] text-slate-400 font-mono">
                                NIP: {item.nip}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{item.jabatan}</TableCell>
                        <TableCell className="text-slate-600">{item.instansi || "-"}</TableCell>
                        <TableCell className="text-center">
                          <select
                            value={item.eselon || "NON_ESELON"}
                            onChange={(e) => handleEselonChange(item.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white font-medium text-slate-700"
                          >
                            <option value="I.a">I.a</option>
                            <option value="I.b">I.b</option>
                            <option value="II.a">II.a</option>
                            <option value="II.b">II.b</option>
                            <option value="III.a">III.a</option>
                            <option value="III.b">III.b</option>
                            <option value="IV.a">IV.a</option>
                            <option value="IV.b">IV.b</option>
                            <option value="NON_ESELON">Non Eselon</option>
                          </select>
                        </TableCell>
                        <TableCell className="text-center">
                          <select
                            value={item.kategoriPegawai || "UMUM"}
                            onChange={(e) => handleKategoriChange(item.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white font-medium text-slate-700"
                          >
                            <option value="ESELON_2">Eselon II</option>
                            <option value="ESELON_3">Eselon III</option>
                            <option value="KECAMATAN">Kecamatan</option>
                            <option value="STAF">Staf Teknis</option>
                            <option value="UMUM">Umum</option>
                          </select>
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
                <span>Memuat data pejabat selanjutnya...</span>
              </div>
            )}
            {!hasMore && internalList.length > 0 && (
              <p className="text-xs text-slate-400 font-medium">Semua data ({internalList.length}) telah dimuat</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Bottom Fixed Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2">
        <Button
          onClick={handleSaveBulk}
          disabled={saving || dirtyCount === 0}
          className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan Perubahan {dirtyCount > 0 ? `(${dirtyCount})` : ""}
        </Button>
      </div>
    </div>
  );
}
