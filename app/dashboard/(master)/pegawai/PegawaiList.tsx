"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createPegawai, deletePegawai, bulkUpsertPegawai, getPegawaisPaginated } from "@/app/actions/pegawai";
import { Loader2, Plus, Trash2, Users, Save, AlertCircle, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileActionBar from "@/components/dashboard/MobileActionBar";
import PegawaiExcelActions from "./PegawaiExcelActions";

type Pegawai = {
  id: string;
  nip: string | null;
  nama: string;
  pangkat: string | null;
  golongan: string | null;
  jabatan: string;
  instansi: string | null;
  eselon: string | null;
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

  const activeTab = searchParams.get("tab") || "kartu";

  const [data, setData] = useState<Pegawai[]>(initialData);
  const [bulkData, setBulkData] = useState<Pegawai[]>(initialData.map((p) => ({ ...p })));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

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

  // Single Card Mode State
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      (original.eselon || "") !== (row.eselon || "")
    );
  };

  const isFieldDirty = (row: Pegawai, field: keyof Pegawai) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find((p) => p.id === row.id);
    if (!original) return false;
    return (original[field] || "") !== (row[field] || "");
  };

  const newRowsCount = bulkData.filter((r) => r.id.startsWith("temp-")).length;
  const updatedRowsCount = bulkData.filter((r) => !r.id.startsWith("temp-") && isRowDirty(r)).length;
  const deletedCount = deleteIds.length;
  const totalChanges = newRowsCount + updatedRowsCount + deletedCount;

  // ---------------- SINGLE MODE HANDLERS ----------------
  const handleTabChange = (val: string) => {
    updateUrl({ tab: val });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const nip = formData.get("nip") as string;
    const nama = formData.get("nama") as string;
    const pangkat = formData.get("pangkat") as string;
    const golongan = formData.get("golongan") as string;
    const jabatan = formData.get("jabatan") as string;
    const eselon = formData.get("eselon") as string;

    try {
      await createPegawai({ nip, nama, pangkat, golongan, jabatan, eselon });
      setIsOpen(false);
      toast.success("Pegawai berhasil ditambahkan");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan Pegawai");
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deletePegawai(deleteId);
      toast.success("Pegawai berhasil dihapus");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data.");
    }
    setLoading(false);
    setDeleteId(null);
  };

  // ---------------- BULK MODE HANDLERS ----------------
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
      },
      ...bulkData,
    ]);
  };

  const updateBulkRow = (id: string, field: keyof Pegawai, value: string) => {
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
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data massal.");
    }
    setBulkLoading(false);
  };

  // Sort handlers
  const currentSort = searchParams.get("sort") || "nama";
  const currentDir = searchParams.get("dir") || "asc";

  const toggleSort = (field: "nama" | "golongan" | "jabatan") => {
    const nextDir = currentSort === field && currentDir === "asc" ? "desc" : "asc";
    updateUrl({ sort: field, dir: nextDir, page: "1" });
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Header Search & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
        {isSuperAdmin && <PegawaiExcelActions data={data} />}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="kartu" className="text-xs">Mode Kartu</TabsTrigger>
            <TabsTrigger value="tabel" className="text-xs">Mode Tabel (Cepat)</TabsTrigger>
          </TabsList>
        </div>

        {/* ================= MODE KARTU ================= */}
        <TabsContent value="kartu" className="space-y-6">
          {isSuperAdmin && (
            <div className="hidden lg:flex justify-end">
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Pegawai</Button>} />
                <DialogContent>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <DialogHeader>
                      <DialogTitle>Tambah Pegawai Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>NIP (Opsional)</Label>
                      <Input name="nip" placeholder="199001012020121001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nama Lengkap</Label>
                      <Input name="nama" required placeholder="Dr. Budi Santoso, S.Kom" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pangkat</Label>
                        <Input name="pangkat" placeholder="Penata Tk. I" />
                      </div>
                      <div className="space-y-2">
                        <Label>Golongan</Label>
                        <Input name="golongan" placeholder="III/d" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Jabatan</Label>
                        <Input name="jabatan" required placeholder="Kepala Bidang E-Gov" />
                      </div>
                      <div className="space-y-2">
                        <Label>Eselon</Label>
                        <Select name="eselon" defaultValue="NON_ESELON">
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Eselon" />
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
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full mt-2">
                      {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {data.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="pt-6 text-center text-slate-500 py-12 flex flex-col items-center">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p>{searchQuery ? "Tidak ada pegawai yang cocok dengan pencarian." : "Belum ada data Pegawai."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative">
              {isPending && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              )}
              {data.map((pegawai) => (
                <Card key={pegawai.id} className="relative overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-5 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{pegawai.nama}</h3>
                      <p className="text-xs text-slate-500 mt-1">{pegawai.nip || "Non-ASN / NIP tidak ada"}</p>

                      <div className="mt-4 space-y-1">
                        <p className="text-sm text-slate-700"><span className="font-semibold">Jabatan:</span> {pegawai.jabatan}</p>
                        <p className="text-xs text-slate-600"><span className="font-medium">Instansi:</span> {pegawai.instansi || "-"}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(pegawai.pangkat || pegawai.golongan) && (
                            <span className="text-xs text-slate-500">
                              Pangkat/Gol: {pegawai.pangkat || "-"} ({pegawai.golongan || "-"})
                            </span>
                          )}
                          {pegawai.eselon && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-300 font-medium">
                              Eselon {pegawai.eselon}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 absolute top-3 right-3"
                        onClick={() => setDeleteId(pegawai.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel & Indicator */}
          <div ref={observerRef} className="py-6 flex flex-col items-center justify-center min-h-[50px]">
            {loadingMore && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-full px-4 py-1.5 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memuat data pegawai selanjutnya...</span>
              </div>
            )}
            {!hasMore && data.length > 0 && (
              <p className="text-xs text-slate-400 font-medium">Semua data pegawai ({data.length}) telah dimuat</p>
            )}
          </div>
        </TabsContent>

        {/* ================= MODE TABEL (BULK) ================= */}
        <TabsContent value="tabel">
          <Card className="p-0 gap-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  Data Pegawai (Mode Tabel)
                  {isPending && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                </CardTitle>
                {totalChanges > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {totalChanges} perubahan belum disimpan
                  </Badge>
                )}
              </div>
              <div className="hidden lg:flex gap-2">
                {isSuperAdmin && (
                  <>
                    <Button onClick={addBulkRow} size="sm" variant="outline" className="bg-slate-50">
                      <Plus className="w-4 h-4 mr-2" /> Tambah Baris
                    </Button>
                    <Button onClick={saveBulk} size="sm" disabled={bulkLoading || totalChanges === 0}>
                      {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Simpan Perubahan
                    </Button>
                  </>
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
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="min-w-[170px]">NIP</TableHead>
                      <TableHead
                        className="min-w-[250px] cursor-pointer hover:bg-slate-100/50 select-none group"
                        onClick={() => toggleSort("nama")}
                      >
                        <div className="flex items-center">
                          Nama Lengkap
                          {currentSort === "nama" ? (
                            currentDir === "asc" ? <ChevronUp className="ml-2 w-4 h-4 text-primary" /> : <ChevronDown className="ml-2 w-4 h-4 text-primary" />
                          ) : (
                            <ArrowUpDown className="ml-2 w-4 h-4 text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[130px]">Pangkat</TableHead>
                      <TableHead
                        className="min-w-[120px] cursor-pointer hover:bg-slate-100/50 select-none group"
                        onClick={() => toggleSort("golongan")}
                      >
                        <div className="flex items-center">
                          Golongan
                          {currentSort === "golongan" ? (
                            currentDir === "asc" ? <ChevronUp className="ml-2 w-4 h-4 text-primary" /> : <ChevronDown className="ml-2 w-4 h-4 text-primary" />
                          ) : (
                            <ArrowUpDown className="ml-2 w-4 h-4 text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[200px]">Jabatan</TableHead>
                      <TableHead className="min-w-[130px]">Eselon</TableHead>
                      {isSuperAdmin && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkData.map((row) => {
                      const rowIsNew = row.id.startsWith("temp-");
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
                              className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'nip') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                              placeholder=""
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={row.nama}
                              onChange={(e) => updateBulkRow(row.id, "nama", e.target.value)}
                              readOnly={!isSuperAdmin}
                              className={`h-8 text-xs font-semibold rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'nama') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                              placeholder=""
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={row.pangkat || ""}
                              onChange={(e) => updateBulkRow(row.id, "pangkat", e.target.value)}
                              readOnly={!isSuperAdmin}
                              className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'pangkat') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                              placeholder=""
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={row.golongan || ""}
                              onChange={(e) => updateBulkRow(row.id, "golongan", e.target.value)}
                              readOnly={!isSuperAdmin}
                              className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'golongan') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                              placeholder=""
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input
                              value={row.jabatan}
                              onChange={(e) => updateBulkRow(row.id, "jabatan", e.target.value)}
                              readOnly={!isSuperAdmin}
                              className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'jabatan') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                              placeholder=""
                            />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select
                              value={row.eselon || "NON_ESELON"}
                              onValueChange={(val) => updateBulkRow(row.id, "eselon", val === "NON_ESELON" ? "" : (val || ""))}
                              disabled={!isSuperAdmin}
                            >
                              <SelectTrigger className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'eselon') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}>
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
                          {isSuperAdmin && (
                            <TableCell className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeBulkRow(row.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    {bulkData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                          {searchQuery ? "Tidak ada pegawai yang cocok dengan pencarian." : "Tidak ada baris data. Klik \"Tambah Baris\" untuk mulai menginput."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Infinite Scroll Sentinel & Indicator for Mode Tabel */}
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
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal untuk Mode Kartu */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pegawai?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data pegawai akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile bottom action bar — tab-aware */}
      {isSuperAdmin && (
        <MobileActionBar>
          {activeTab === "kartu" ? (
            <Button className="w-full" onClick={() => setIsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Pegawai
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={addBulkRow}>
                <Plus className="w-4 h-4 mr-2" /> Tambah Baris
              </Button>
              <Button className="flex-1" onClick={saveBulk} disabled={bulkLoading || totalChanges === 0}>
                {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan
              </Button>
            </div>
          )}
        </MobileActionBar>
      )}
    </div>
  );
}
