"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkUpsertVendor } from "@/app/actions/vendor";
import { Loader2, Plus, Trash2, Save, AlertCircle, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileActionBar from "@/components/dashboard/MobileActionBar";

type Vendor = {
  id: string;
  namaVendor: string;
  namaPemilik: string | null;
  alamat: string | null;
  npwp: string | null;
  npwpd: string | null;
  rekeningBank: string | null;
};

export default function VendorList({
  initialData,
  isSuperAdmin = false,
}: {
  initialData: Vendor[];
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [bulkData, setBulkData] = useState<Vendor[]>(initialData.map((v) => ({ ...v })));
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // --- Computed Dirty States ---
  const isRowDirty = (row: Vendor) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find((v) => v.id === row.id);
    if (!original) return false;
    return (
      original.namaVendor !== row.namaVendor ||
      (original.namaPemilik || "") !== (row.namaPemilik || "") ||
      (original.alamat || "") !== (row.alamat || "") ||
      (original.npwp || "") !== (row.npwp || "") ||
      (original.npwpd || "") !== (row.npwpd || "") ||
      (original.rekeningBank || "") !== (row.rekeningBank || "")
    );
  };

  const isFieldDirty = (row: Vendor, field: keyof Vendor) => {
    if (row.id.startsWith("temp-")) return true;
    const original = initialData.find((v) => v.id === row.id);
    if (!original) return false;
    return (original[field] || "") !== (row[field] || "");
  };

  const newRowsCount = bulkData.filter((r) => r.id.startsWith("temp-")).length;
  const updatedRowsCount = bulkData.filter((r) => !r.id.startsWith("temp-") && isRowDirty(r)).length;
  const deletedCount = deleteIds.length;
  const totalChanges = newRowsCount + updatedRowsCount + deletedCount;

  // Filtered rows for display
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bulkData;
    return bulkData.filter(
      (v) =>
        v.namaVendor.toLowerCase().includes(q) ||
        (v.namaPemilik && v.namaPemilik.toLowerCase().includes(q)) ||
        (v.alamat && v.alamat.toLowerCase().includes(q)) ||
        (v.npwp && v.npwp.toLowerCase().includes(q)) ||
        (v.npwpd && v.npwpd.toLowerCase().includes(q)) ||
        (v.rekeningBank && v.rekeningBank.toLowerCase().includes(q))
    );
  }, [bulkData, searchQuery]);

  // ---------------- TABLE HANDLERS ----------------
  const addBulkRow = () => {
    setBulkData([
      {
        id: `temp-${Date.now()}`,
        namaVendor: "",
        namaPemilik: "",
        alamat: "",
        npwp: "",
        npwpd: "",
        rekeningBank: "",
      },
      ...bulkData,
    ]);
  };

  const updateBulkRow = (id: string, field: keyof Vendor, value: string) => {
    const newData = [...bulkData];
    const index = newData.findIndex((r) => r.id === id);
    if (index !== -1) {
      newData[index] = { ...newData[index], [field]: value };
      setBulkData(newData);
    }
  };

  const removeBulkRow = (id: string) => {
    const isNew = id.startsWith("temp-");
    if (!isNew && !isSuperAdmin) {
      toast.error("Hanya Super Admin yang berwenang menghapus vendor yang sudah tersimpan.");
      return;
    }
    if (!isNew) {
      setDeleteIds([...deleteIds, id]);
    }
    const newData = bulkData.filter((r) => r.id !== id);
    setBulkData(newData);
  };

  const saveBulk = async () => {
    setBulkLoading(true);
    try {
      await bulkUpsertVendor(bulkData, deleteIds);
      toast.success("Perubahan data vendor berhasil disimpan.");
      router.refresh();
      setDeleteIds([]);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data vendor.");
    }
    setBulkLoading(false);
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      {/* Header Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Cari nama vendor, pemilik, alamat, NPWP..."
            className="h-9 w-full text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="hidden lg:flex items-center gap-2">
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
      </div>

      {/* Tabel Utama Vendor */}
      <Card className="p-0 gap-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 pb-3 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" />
              Data Vendor ({filteredData.length})
            </CardTitle>
            {totalChanges > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 flex items-center text-[11px]">
                <AlertCircle className="w-3 h-3 mr-1" />
                {totalChanges} perubahan belum disimpan
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 text-xs">
                <TableRow>
                  <TableHead className="min-w-[200px]">Nama Vendor / RM / Katering</TableHead>
                  <TableHead className="min-w-[150px]">Nama Pemilik</TableHead>
                  <TableHead className="min-w-[250px]">Alamat</TableHead>
                  <TableHead className="min-w-[160px]">NPWP</TableHead>
                  <TableHead className="min-w-[140px]">NPWPD</TableHead>
                  <TableHead className="min-w-[170px]">No. Rekening Bank</TableHead>
                  <TableHead className="w-[50px] text-center"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => {
                  const rowIsNew = row.id.startsWith("temp-");
                  const canDelete = isSuperAdmin || rowIsNew;
                  return (
                    <TableRow
                      key={row.id}
                      className={rowIsNew ? "bg-emerald-50/40" : isRowDirty(row) ? "bg-amber-50/30" : ""}
                    >
                      <TableCell className="p-2">
                        <Input
                          value={row.namaVendor}
                          onChange={(e) => updateBulkRow(row.id, "namaVendor", e.target.value)}
                          className={`h-8 text-xs font-semibold rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "namaVendor") && !rowIsNew
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : ""
                          }`}
                          placeholder="Nama Vendor..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.namaPemilik || ""}
                          onChange={(e) => updateBulkRow(row.id, "namaPemilik", e.target.value)}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "namaPemilik") && !rowIsNew
                              ? "bg-amber-50 font-medium text-amber-900 border-amber-200"
                              : ""
                          }`}
                          placeholder="Pemilik..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.alamat || ""}
                          onChange={(e) => updateBulkRow(row.id, "alamat", e.target.value)}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "alamat") && !rowIsNew
                              ? "bg-amber-50 font-medium text-amber-900 border-amber-200"
                              : ""
                          }`}
                          placeholder="Alamat..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.npwp || ""}
                          onChange={(e) => updateBulkRow(row.id, "npwp", e.target.value)}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "npwp") && !rowIsNew
                              ? "bg-amber-50 font-medium text-amber-900 border-amber-200"
                              : ""
                          }`}
                          placeholder="00.000.000.0-000.000"
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.npwpd || ""}
                          onChange={(e) => updateBulkRow(row.id, "npwpd", e.target.value)}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "npwpd") && !rowIsNew
                              ? "bg-amber-50 font-medium text-amber-900 border-amber-200"
                              : ""
                          }`}
                          placeholder="NPWPD..."
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          value={row.rekeningBank || ""}
                          onChange={(e) => updateBulkRow(row.id, "rekeningBank", e.target.value)}
                          className={`h-8 text-xs rounded-sm border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-transparent ${
                            isFieldDirty(row, "rekeningBank") && !rowIsNew
                              ? "bg-amber-50 font-medium text-amber-900 border-amber-200"
                              : ""
                          }`}
                          placeholder="Bank & No. Rekening..."
                        />
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeBulkRow(row.id)}
                            title={rowIsNew ? "Batalkan baris baru" : "Hapus Vendor"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      {searchQuery
                        ? "Tidak ada data vendor yang cocok dengan kata kunci pencarian."
                        : "Belum ada data vendor. Klik \"Tambah Baris\" untuk mulai menginput data."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Bottom Action Bar */}
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
    </div>
  );
}
