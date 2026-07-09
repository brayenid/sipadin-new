 
"use client";

import { useState } from "react";
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
import { createPegawai, deletePegawai, bulkUpsertPegawai } from "@/app/actions/pegawai";
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
};

export default function PegawaiList({ initialData, isSuperAdmin = false }: { initialData: Pegawai[], isSuperAdmin?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "kartu";

  const [data, setData] = useState<Pegawai[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: 'nama' | 'golongan', direction: 'asc' | 'desc' }>({ key: 'golongan', direction: 'desc' });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Single Card Mode State
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Bulk Tabel Mode State
  const [bulkData, setBulkData] = useState<Pegawai[]>(initialData.map(p => ({ ...p })));
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // --- Computed Dirty States ---
  const isRowDirty = (row: Pegawai) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find(p => p.id === row.id);
    if (!original) return false;
    return (
      (original.nip || "") !== (row.nip || "") ||
      original.nama !== row.nama ||
      (original.pangkat || "") !== (row.pangkat || "") ||
      (original.golongan || "") !== (row.golongan || "") ||
      original.jabatan !== row.jabatan
    );
  };

  const isFieldDirty = (row: Pegawai, field: keyof Pegawai) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find(p => p.id === row.id);
    if (!original) return false;
    return (original[field] || "") !== (row[field] || "");
  };

  const newRowsCount = bulkData.filter(r => r.id.startsWith("temp-")).length;
  const updatedRowsCount = bulkData.filter(r => !r.id.startsWith("temp-") && isRowDirty(r)).length;
  const deletedCount = deleteIds.length;
  const totalChanges = newRowsCount + updatedRowsCount + deletedCount;

  // ---------------- SINGLE MODE HANDLERS ----------------
  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.replace(`?${params.toString()}`);
    setCurrentPage(1);
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
    
    try {
      await createPegawai({ nip, nama, pangkat, golongan, jabatan });
      setIsOpen(false);
      window.location.reload();
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
      window.location.reload();
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
      },
      ...bulkData
    ]);
    setCurrentPage(1);
  };

  const updateBulkRow = (index: number, field: keyof Pegawai, value: string) => {
    const newData = [...bulkData];
    newData[index] = { ...newData[index], [field]: value };
    setBulkData(newData);
  };

  const removeBulkRow = (index: number, id: string) => {
    if (!id.startsWith("temp-")) {
      setDeleteIds([...deleteIds, id]);
    }
    const newData = bulkData.filter((_, i) => i !== index);
    setBulkData(newData);
  };

  const saveBulk = async () => {
    setBulkLoading(true);
    try {
      await bulkUpsertPegawai(bulkData, deleteIds);
      // Data berhasil disave, reload untuk memperbarui data dari database dan menghapus highlight kotor.
      window.location.reload(); 
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data massal.");
    }
    setBulkLoading(false);
  };

  // ---------------- SEARCH & FILTER ----------------
  const filteredData = data.filter((p) => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.nip || "").includes(searchQuery) ||
    p.jabatan.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredBulkData = bulkData.filter((p) => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.nip || "").includes(searchQuery) ||
    p.jabatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ---------------- SORTING LOGIC ----------------
  const getGolonganWeight = (gol: string | null, jab: string) => {
    const j = jab.trim().toLowerCase();
    
    // Bupati / PPK selalu teratas
    if ((gol && gol.trim().toUpperCase() === "PPK") || j.includes("bupati")) {
      return 1000;
    }
    
    // Sekda di bawah Bupati
    if (j === "sekda" || j.includes("sekretaris daerah")) {
      return 900;
    }

    if (!gol) return 0;
    const g = gol.trim().toUpperCase();
    
    // Pemetaan standar golongan PNS
    const weights: Record<string, number> = {
      "I/A": 11, "I/B": 12, "I/C": 13, "I/D": 14,
      "II/A": 21, "II/B": 22, "II/C": 23, "II/D": 24,
      "III/A": 31, "III/B": 32, "III/C": 33, "III/D": 34,
      "IV/A": 41, "IV/B": 42, "IV/C": 43, "IV/D": 44, "IV/E": 45,
    };
    
    return weights[g] || 50; // Jika tidak diketahui, beri bobot tengah
  };

  const sortData = (dataArray: Pegawai[]) => {
    if (!sortConfig) return dataArray;
    return [...dataArray].sort((a, b) => {
      // Selalu taruh baris baru (temp-) di paling atas
      const aIsNew = a.id.startsWith("temp-");
      const bIsNew = b.id.startsWith("temp-");
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      if (sortConfig.key === 'nama') {
        const res = a.nama.localeCompare(b.nama);
        return sortConfig.direction === 'asc' ? res : -res;
      }
      if (sortConfig.key === 'golongan') {
        const weightA = getGolonganWeight(a.golongan, a.jabatan);
        const weightB = getGolonganWeight(b.golongan, b.jabatan);
        const res = weightA - weightB;
        
        // Jika bobot sama, fallback sort by nama
        if (res === 0) {
          return a.nama.localeCompare(b.nama);
        }
        return sortConfig.direction === 'asc' ? res : -res;
      }
      return 0;
    });
  };

  const sortedKartuData = sortData(filteredData);
  const sortedBulkData = sortData(filteredBulkData);

  const paginatedKartuData = sortedKartuData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedBulkData = sortedBulkData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalItems = activeTab === "kartu" ? filteredData.length : filteredBulkData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const renderPagination = () => {
    if (totalItems <= itemsPerPage) return null;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100 bg-white sm:rounded-b-xl mt-4 sm:border shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <p className="text-[10px] sm:text-sm text-slate-500 text-center sm:text-left w-full sm:w-auto">
            Menampilkan <span className="font-medium text-slate-900">{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-medium text-slate-900">{totalItems}</span>
          </p>
          <div className="hidden sm:flex items-center gap-2 border-l pl-3 border-slate-200">
            <span className="text-sm text-slate-500">Tampilkan</span>
            <Select value={itemsPerPage.toString()} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 w-16 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 mt-3 sm:mt-0 w-full sm:w-auto justify-center">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">«</Button>
          <span className="text-xs font-medium text-slate-600 sm:hidden">{currentPage} / {totalPages}</span>
          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(p)} className={`h-8 w-8 p-0 ${p !== currentPage ? 'text-slate-600 hover:text-slate-900' : ''}`}>{p}</Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">»</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Input 
            placeholder="Cari pegawai..." 
            className="h-9 w-full" 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        {isSuperAdmin && <PegawaiExcelActions data={data} />}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="kartu">Mode Kartu</TabsTrigger>
          <TabsTrigger value="tabel">Mode Tabel</TabsTrigger>
        </TabsList>

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
                    <div className="space-y-2">
                      <Label>Jabatan</Label>
                      <Input name="jabatan" required placeholder="Kepala Bidang E-Gov" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full mt-2">
                      {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {filteredData.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="pt-6 text-center text-slate-500 py-12 flex flex-col items-center">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p>{searchQuery ? "Tidak ada pegawai yang cocok dengan pencarian." : "Belum ada data Pegawai."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedKartuData.map((pegawai) => (
                <Card key={pegawai.id} className="relative overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <CardContent className="p-5 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{pegawai.nama}</h3>
                      <p className="text-xs text-slate-500 mt-1">{pegawai.nip || "Non-ASN / NIP tidak ada"}</p>
                      
                      <div className="mt-4 space-y-1">
                        <p className="text-sm text-slate-700"><span className="font-semibold">Jabatan:</span> {pegawai.jabatan}</p>
                        {(pegawai.pangkat || pegawai.golongan) && (
                          <p className="text-xs text-slate-500">
                            Pangkat/Gol: {pegawai.pangkat || "-"} ({pegawai.golongan || "-"})
                          </p>
                        )}
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
          {renderPagination()}
        </TabsContent>

        {/* ================= MODE TABEL (BULK) ================= */}
        <TabsContent value="tabel">
          <Card className="p-0 gap-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
            <CardHeader className="hidden sm:flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Data Pegawai</CardTitle>
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
                      Simpan Semua Perubahan
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="min-w-[170px]">NIP</TableHead>
                      <TableHead 
                        className="min-w-[250px] cursor-pointer hover:bg-slate-100/50 select-none group"
                        onClick={() => {
                          let direction: 'asc' | 'desc' = 'asc';
                          if (sortConfig?.key === 'nama' && sortConfig.direction === 'asc') direction = 'desc';
                          setSortConfig({ key: 'nama', direction });
                        }}
                      >
                        <div className="flex items-center">
                          Nama Lengkap
                          {sortConfig?.key === 'nama' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 w-4 h-4 text-primary" /> : <ChevronDown className="ml-2 w-4 h-4 text-primary" />
                          ) : (
                            <ArrowUpDown className="ml-2 w-4 h-4 text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[130px]">Pangkat</TableHead>
                      <TableHead 
                        className="min-w-[120px] cursor-pointer hover:bg-slate-100/50 select-none group"
                        onClick={() => {
                          let direction: 'asc' | 'desc' = 'asc';
                          if (sortConfig?.key === 'golongan' && sortConfig.direction === 'asc') direction = 'desc';
                          setSortConfig({ key: 'golongan', direction });
                        }}
                      >
                        <div className="flex items-center">
                          Golongan
                          {sortConfig?.key === 'golongan' ? (
                            sortConfig.direction === 'asc' ? <ChevronUp className="ml-2 w-4 h-4 text-primary" /> : <ChevronDown className="ml-2 w-4 h-4 text-primary" />
                          ) : (
                            <ArrowUpDown className="ml-2 w-4 h-4 text-slate-300 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[200px]">Jabatan</TableHead>
                      {isSuperAdmin && <TableHead className="min-w-[60px] text-center">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBulkData.map((row, pageIdx) => {
                      const idx = (currentPage - 1) * itemsPerPage + pageIdx;
                      const rowIsNew = row.id.startsWith("temp-");
                      return (
                      <TableRow key={row.id} className={rowIsNew ? "bg-green-50/50" : ""}>
                        <TableCell className="p-2">
                          <Input 
                            value={row.nip || ""} 
                            onChange={(e) => updateBulkRow(idx, "nip", e.target.value)} 
                            readOnly={!isSuperAdmin}
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'nip') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.nama} 
                            onChange={(e) => updateBulkRow(idx, "nama", e.target.value)} 
                            readOnly={!isSuperAdmin}
                            className={`h-8 text-xs font-medium rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'nama') && !rowIsNew ? 'bg-amber-50 text-amber-900 border-amber-200' : ''}`}
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.pangkat || ""} 
                            onChange={(e) => updateBulkRow(idx, "pangkat", e.target.value)} 
                            readOnly={!isSuperAdmin}
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'pangkat') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.golongan || ""} 
                            onChange={(e) => updateBulkRow(idx, "golongan", e.target.value)} 
                            readOnly={!isSuperAdmin}
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'golongan') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder=""
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.jabatan} 
                            onChange={(e) => updateBulkRow(idx, "jabatan", e.target.value)} 
                            readOnly={!isSuperAdmin}
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'jabatan') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder=""
                          />
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="p-2 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeBulkRow(idx, row.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )})}
                    {filteredBulkData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          {searchQuery ? "Tidak ada pegawai yang cocok dengan pencarian." : "Tidak ada baris data. Klik \"Tambah Baris\" untuk mulai menginput."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {renderPagination()}
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
