"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  CheckCircle2,
  Save,
  Loader2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from "lucide-react";
import { bulkUpdateBindingPejabat } from "@/app/actions/absensi";

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

export default function PejabatBindingList({
  allPegawai,
}: {
  allPegawai: Pegawai[];
}) {
  const router = useRouter();
  
  // State data internal untuk menampung perubahan lokal (belum disimpan ke db)
  const [internalList, setInternalList] = useState<Pegawai[]>(
    allPegawai.map((p) => ({ ...p }))
  );
  
  const [search, setSearch] = useState("");
  const [filterEselon, setFilterEselon] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "BINDING" | "UNBOUND">("ALL");
  const [saving, setSaving] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Deteksi perubahan (apakah ada row yang dirubah dibanding data props asli)
  const getDirtyItems = () => {
    return internalList.filter((item) => {
      const original = allPegawai.find((p) => p.id === item.id);
      if (!original) return false;
      return (
        original.wajibAbsenOpd !== item.wajibAbsenOpd ||
        original.eselon !== item.eselon ||
        original.kategoriPegawai !== item.kategoriPegawai
      );
    });
  };

  const dirtyCount = getDirtyItems().length;

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setInternalList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              wajibAbsenOpd: checked,
            }
          : item
      )
    );
  };

  const handleEselonSelectChange = (id: string, val: string) => {
    setInternalList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              eselon: val === "NON_ESELON" ? null : val,
            }
          : item
      )
    );
  };

  const handleKategoriSelectChange = (id: string, val: string) => {
    setInternalList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              kategoriPegawai: val === "NONE" ? null : val,
            }
          : item
      )
    );
  };

  const handleSaveBulk = async () => {
    const dirtyItems = getDirtyItems();
    if (dirtyItems.length === 0) {
      toast.info("Tidak ada perubahan untuk disimpan");
      return;
    }

    setSaving(true);
    try {
      await bulkUpdateBindingPejabat(
        dirtyItems.map((item) => ({
          pegawaiId: item.id,
          wajibAbsenOpd: item.wajibAbsenOpd,
          eselon: item.eselon,
          kategoriPegawai: item.kategoriPegawai,
          urutanOpd: item.urutanOpd ?? 0,
        }))
      );

      toast.success(`Berhasil memperbarui binding untuk ${dirtyItems.length} pegawai`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan binding");
    } finally {
      setSaving(false);
    }
  };

  // Filter Data
  const filteredList = useMemo(() => {
    return internalList.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.jabatan.toLowerCase().includes(search.toLowerCase()) ||
        p.instansi.toLowerCase().includes(search.toLowerCase());

      const matchEselon = (() => {
        if (filterEselon === "ALL") return true; // Semua termasuk Non-Eselon
        if (filterEselon === "ESELON_ONLY") return Boolean(p.eselon && p.eselon !== "NON_ESELON" && p.eselon.trim() !== "");
        if (filterEselon === "NON_ESELON") return !p.eselon || p.eselon === "NON_ESELON" || p.eselon.trim() === "";
        return p.eselon === filterEselon;
      })();

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "BINDING" && p.wajibAbsenOpd) ||
        (filterStatus === "UNBOUND" && !p.wajibAbsenOpd);

      return matchSearch && matchEselon && matchStatus;
    });
  }, [internalList, search, filterEselon, filterStatus]);

  // Status Select All pada data hasil filter
  const allFilteredSelected = filteredList.length > 0 && filteredList.every((p) => p.wajibAbsenOpd);
  const someFilteredSelected = filteredList.some((p) => p.wajibAbsenOpd);
  const isIndeterminate = someFilteredSelected && !allFilteredSelected;

  // Handler Select All / Unselect All pada data hasil filter
  const handleSelectAllFiltered = (checked: boolean) => {
    const filteredIds = new Set(filteredList.map((p) => p.id));
    setInternalList((prev) =>
      prev.map((item) =>
        filteredIds.has(item.id)
          ? { ...item, wajibAbsenOpd: checked }
          : item
      )
    );
    toast.info(
      checked
        ? `Menandai ${filteredList.length} pegawai sebagai Wajib Absen Default.`
        : `Menghapus centang Wajib Absen untuk ${filteredList.length} pegawai.`
    );
  };

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage, itemsPerPage]);

  const totalBound = internalList.filter((p) => p.wajibAbsenOpd).length;
  const countEselon2 = internalList.filter((p) => p.wajibAbsenOpd && (p.eselon === "II.b" || p.eselon === "II.a")).length;
  const countEselon3 = internalList.filter((p) => p.wajibAbsenOpd && (p.eselon === "III.a" || p.eselon === "III.b")).length;
  const countNonEselon = internalList.filter((p) => p.wajibAbsenOpd && (!p.eselon || p.eselon === "NON_ESELON")).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                Total Wajib Absen
              </p>
              <p className="text-2xl font-black text-indigo-950 mt-0.5">{totalBound}</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">Otomatis masuk ke setiap agenda baru</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Eselon II (Kepala OPD)
              </p>
              <p className="text-2xl font-black text-emerald-950 mt-0.5">{countEselon2}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Kadis / Kaban / Asisten / Staf Ahli</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Eselon III (Kabag / Camat)
              </p>
              <p className="text-2xl font-black text-amber-950 mt-0.5">{countEselon3}</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Kabag Setda & Camat Se-Kabupaten</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
                Non-Eselon / Staf
              </p>
              <p className="text-2xl font-black text-sky-950 mt-0.5">{countNonEselon}</p>
              <p className="text-[11px] text-sky-600/80 mt-0.5">Staf Pelaksana / Fungsional</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kontrol & Filter */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Daftar Pegawai Wajib Absen Default
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Gunakan checkbox untuk memilih pegawai secara default. Anda bisa menggunakan tombol <strong>Select All</strong> atau filter untuk memilih massal.
              </CardDescription>
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <Button
                onClick={handleSaveBulk}
                disabled={saving || dirtyCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 font-semibold shadow-sm"
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Simpan Perubahan {dirtyCount > 0 ? `(${dirtyCount})` : ""}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 my-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari nama, jabatan, atau instansi..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 w-full md:w-auto">
              {/* Filter Status Binding */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-9 font-medium"
              >
                <option value="ALL">Semua Status Binding ({internalList.length})</option>
                <option value="BINDING">Wajib Absen Saja ({totalBound})</option>
                <option value="UNBOUND">Tidak Wajib Absen ({internalList.length - totalBound})</option>
              </select>

              {/* Filter Eselon & Non-Eselon */}
              <select
                value={filterEselon}
                onChange={(e) => {
                  setFilterEselon(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-9 font-medium"
              >
                <option value="ALL">Semua (Termasuk Non-Eselon)</option>
                <option value="ESELON_ONLY">Semua yang Ber-Eselon</option>
                <option value="NON_ESELON">Khusus Non-Eselon / Staf</option>
                <option value="II.a">Eselon II.a (Asisten / Kadis Utama)</option>
                <option value="II.b">Eselon II.b (Kepala OPD / Staf Ahli)</option>
                <option value="III.a">Eselon III.a (Kabag / Camat / Sekdis)</option>
                <option value="III.b">Eselon III.b (Kabid / Sekcam)</option>
                <option value="IV.a">Eselon IV.a (Kasubag / Kasi / Lurah)</option>
                <option value="IV.b">Eselon IV.b (Kasubag Kec / Kasi Kel)</option>
              </select>

              {/* Quick Batch Actions Buttons */}
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllFiltered(true)}
                  disabled={filteredList.length === 0 || allFilteredSelected}
                  className="h-9 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-indigo-50/40 font-medium"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Pilih Semua ({filteredList.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllFiltered(false)}
                  disabled={filteredList.length === 0 || !someFilteredSelected}
                  className="h-9 text-xs text-slate-600 hover:bg-slate-100 font-medium"
                >
                  <UserX className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Batal Semua
                </Button>
              </div>
            </div>
          </div>

          {/* Bar Info Filter & Selection */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600">
            <div>
              Menampilkan <strong>{filteredList.length.toLocaleString("id-ID")}</strong> pegawai{" "}
              {search && <span>dengan pencarian &quot;{search}&quot;</span>}
              {filterEselon !== "ALL" && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                  {filterEselon === "ESELON_ONLY"
                    ? "Ber-Eselon"
                    : filterEselon === "NON_ESELON"
                    ? "Non-Eselon"
                    : `Eselon ${filterEselon}`}
                </Badge>
              )}
              {filterStatus !== "ALL" && (
                <Badge variant="secondary" className="ml-1 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                  {filterStatus === "BINDING" ? "Wajib Absen" : "Tidak Wajib Absen"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Tampilkan:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs border border-slate-200 rounded px-2 py-0.5 bg-white font-medium text-slate-700 h-7"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Tabel Pegawai */}
          <div className="border border-slate-200/60 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="w-36 text-center text-xs">
                    <div
                      className="flex items-center justify-center gap-1.5 cursor-pointer select-none py-1 hover:text-indigo-600 transition-colors"
                      onClick={() => handleSelectAllFiltered(!allFilteredSelected)}
                      title={allFilteredSelected ? "Hapus centang semua hasil filter" : "Centang semua hasil filter"}
                    >
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={(checked) => handleSelectAllFiltered(Boolean(checked))}
                        aria-label="Pilih Semua"
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className="font-bold">Wajib Absen?</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-xs">Nama Pegawai</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs">Perangkat Daerah / OPD</TableHead>
                  <TableHead className="text-xs text-center w-36">Eselon</TableHead>
                  <TableHead className="text-xs text-center w-36">Kategori Grup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-xs">
                      Tidak ada data pegawai yang sesuai dengan filter
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((p, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <TableRow
                        key={p.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          p.wajibAbsenOpd ? "bg-indigo-50/15" : ""
                        }`}
                      >
                        <TableCell className="text-center text-xs font-medium text-slate-500">
                          {rowNumber}
                        </TableCell>
                        
                        {/* Checkbox Binding */}
                        <TableCell className="text-center">
                          <Checkbox
                            checked={p.wajibAbsenOpd}
                            onCheckedChange={(checked) => handleCheckboxChange(p.id, !!checked)}
                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                        </TableCell>

                        <TableCell className="text-xs font-semibold text-slate-900">
                          {p.nama}
                          {p.nip && <p className="text-[10px] text-slate-400 font-normal">NIP: {p.nip}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{p.jabatan}</TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">{p.instansi}</TableCell>
                        
                        {/* Selector Eselon */}
                        <TableCell className="text-center text-xs">
                          <select
                            value={p.eselon || "NON_ESELON"}
                            onChange={(e) => handleEselonSelectChange(p.id, e.target.value)}
                            className="h-8 w-28 text-xs font-semibold rounded-md border border-slate-300 bg-white px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="NON_ESELON">Non Eselon</option>
                            <option value="I.a">I.a</option>
                            <option value="I.b">I.b</option>
                            <option value="II.a">II.a</option>
                            <option value="II.b">II.b</option>
                            <option value="III.a">III.a</option>
                            <option value="III.b">III.b</option>
                            <option value="IV.a">IV.a</option>
                            <option value="IV.b">IV.b</option>
                          </select>
                        </TableCell>

                        {/* Selector Kategori Grup */}
                        <TableCell className="text-center text-xs">
                          <select
                            value={p.kategoriPegawai || "NONE"}
                            onChange={(e) => handleKategoriSelectChange(p.id, e.target.value)}
                            className="h-8 w-28 text-xs font-semibold rounded-md border border-slate-300 bg-white px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="NONE">- Standar -</option>
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">
                Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total {filteredList.length} data)
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 text-xs px-2.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Sebelumnya
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 text-xs p-0 ${
                          currentPage === pageNum ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold" : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 text-xs px-2.5"
                >
                  Selanjutnya <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
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
