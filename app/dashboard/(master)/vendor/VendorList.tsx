"use client";

import { useState } from "react";
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
import { createVendor, deleteVendor, bulkUpsertVendor } from "@/app/actions/vendor";
import { Loader2, Plus, Store, Trash2, Save, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Vendor = {
  id: string;
  namaVendor: string;
  namaPemilik: string | null;
  alamat: string | null;
  npwp: string | null;
  rekeningBank: string | null;
};

export default function VendorList({ initialData }: { initialData: Vendor[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "kartu";

  const [data, setData] = useState<Vendor[]>(initialData);
  const [loading, setLoading] = useState(false);
  
  // Single Card Mode State
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Bulk Tabel Mode State
  const [bulkData, setBulkData] = useState<Vendor[]>(initialData.map(v => ({ ...v })));
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // --- Computed Dirty States ---
  const isRowDirty = (row: Vendor) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find(v => v.id === row.id);
    if (!original) return false;
    return (
      original.namaVendor !== row.namaVendor ||
      (original.namaPemilik || "") !== (row.namaPemilik || "") ||
      (original.alamat || "") !== (row.alamat || "") ||
      (original.npwp || "") !== (row.npwp || "") ||
      (original.rekeningBank || "") !== (row.rekeningBank || "")
    );
  };

  const isFieldDirty = (row: Vendor, field: keyof Vendor) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find(v => v.id === row.id);
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
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      namaVendor: formData.get("namaVendor") as string,
      namaPemilik: formData.get("namaPemilik") as string,
      alamat: formData.get("alamat") as string,
      npwp: formData.get("npwp") as string,
      rekeningBank: formData.get("rekeningBank") as string,
    };
    
    try {
      await createVendor(payload);
      setIsOpen(false);
      window.location.reload();
    } catch (err) {
      alert("Gagal menambahkan Vendor");
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteVendor(deleteId);
      window.location.reload();
    } catch (err) {
      alert("Gagal menghapus data.");
    }
    setLoading(false);
    setDeleteId(null);
  };

  // ---------------- BULK MODE HANDLERS ----------------
  const addBulkRow = () => {
    setBulkData([
      ...bulkData, 
      {
        id: `temp-${Date.now()}`,
        namaVendor: "",
        namaPemilik: "",
        alamat: "",
        npwp: "",
        rekeningBank: "",
      }
    ]);
  };

  const updateBulkRow = (index: number, field: keyof Vendor, value: string) => {
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
      await bulkUpsertVendor(bulkData, deleteIds);
      window.location.reload();
    } catch (err) {
      alert("Gagal menyimpan data massal.");
    }
    setBulkLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Input placeholder="Cari vendor..." className="h-9" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="kartu">Mode Kartu</TabsTrigger>
          <TabsTrigger value="tabel">Mode Tabel (Excel)</TabsTrigger>
        </TabsList>

        {/* ================= MODE KARTU ================= */}
        <TabsContent value="kartu" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Vendor</Button>} />
              <DialogContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>Tambah Vendor Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Nama Vendor / RM / Katering</Label>
                    <Input name="namaVendor" required placeholder="Contoh: RM Padang Sederhana" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nama Pemilik (Opsional)</Label>
                    <Input name="namaPemilik" placeholder="Bpk. Budi" />
                  </div>
                  <div className="space-y-2">
                    <Label>Alamat (Opsional)</Label>
                    <Input name="alamat" placeholder="Jl. Melati No 12" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>NPWP (Opsional)</Label>
                      <Input name="npwp" placeholder="00.000.000.0-000.000" />
                    </div>
                    <div className="space-y-2">
                      <Label>No. Rekening (Opsional)</Label>
                      <Input name="rekeningBank" placeholder="BPD Kaltimtara - 012345678" />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full mt-2">
                    {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {data.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="pt-6 text-center text-slate-500 py-12 flex flex-col items-center">
                <Store className="w-12 h-12 text-slate-300 mb-3" />
                <p>Belum ada data Vendor.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.map((vendor) => (
                <Card key={vendor.id} className="border-slate-200 shadow-sm relative overflow-hidden">
                  <CardContent className="p-5 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900">{vendor.namaVendor}</h3>
                      <p className="text-xs text-slate-500 mt-1">{vendor.namaPemilik || "Pemilik tidak dicatat"}</p>
                      
                      <div className="mt-4 space-y-1 text-sm text-slate-700">
                        {vendor.alamat && <p><span className="font-semibold text-slate-500">Alamat:</span> {vendor.alamat}</p>}
                        {vendor.npwp && <p><span className="font-semibold text-slate-500">NPWP:</span> {vendor.npwp}</p>}
                        {vendor.rekeningBank && <p><span className="font-semibold text-slate-500">Rek:</span> {vendor.rekeningBank}</p>}
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 absolute top-3 right-3" 
                      onClick={() => setDeleteId(vendor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ================= MODE TABEL (BULK) ================= */}
        <TabsContent value="tabel">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <CardTitle className="text-base">Data Vendor (Input Tabular)</CardTitle>
                {totalChanges > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {totalChanges} perubahan belum disimpan
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={addBulkRow} size="sm" variant="outline" className="bg-slate-50">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Baris
                </Button>
                <Button onClick={saveBulk} size="sm" disabled={bulkLoading || totalChanges === 0}>
                  {bulkLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Semua Perubahan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[200px]">Nama Vendor</TableHead>
                      <TableHead className="w-[150px]">Nama Pemilik</TableHead>
                      <TableHead className="w-[200px]">Alamat</TableHead>
                      <TableHead className="w-[150px]">NPWP</TableHead>
                      <TableHead className="w-[150px]">No. Rekening</TableHead>
                      <TableHead className="w-[60px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkData.map((row, idx) => {
                      const rowIsNew = row.id.startsWith("temp-");
                      return (
                      <TableRow key={row.id} className={rowIsNew ? "bg-green-50/50" : ""}>
                        <TableCell className="p-2">
                          <Input 
                            value={row.namaVendor} 
                            onChange={(e) => updateBulkRow(idx, "namaVendor", e.target.value)} 
                            className={`h-8 text-xs font-medium rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'namaVendor') && !rowIsNew ? 'bg-amber-50 text-amber-900 border-amber-200' : ''}`}
                            placeholder="Nama Vendor"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.namaPemilik || ""} 
                            onChange={(e) => updateBulkRow(idx, "namaPemilik", e.target.value)} 
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'namaPemilik') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder="Pemilik"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.alamat || ""} 
                            onChange={(e) => updateBulkRow(idx, "alamat", e.target.value)} 
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'alamat') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder="Alamat"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.npwp || ""} 
                            onChange={(e) => updateBulkRow(idx, "npwp", e.target.value)} 
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'npwp') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder="00.000..."
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={row.rekeningBank || ""} 
                            onChange={(e) => updateBulkRow(idx, "rekeningBank", e.target.value)} 
                            className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary/20 bg-transparent ${isFieldDirty(row, 'rekeningBank') && !rowIsNew ? 'bg-amber-50 font-medium text-amber-900 border-amber-200' : ''}`}
                            placeholder="No. Rekening"
                          />
                        </TableCell>
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
                      </TableRow>
                    )})}
                    {bulkData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          Tidak ada baris data. Klik "Tambah Baris" untuk mulai menginput.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal untuk Mode Kartu */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data vendor akan dihapus secara permanen.
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
    </div>
  );
}
