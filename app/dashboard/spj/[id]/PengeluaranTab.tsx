"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Trash2, Save, Loader2, FileText } from "lucide-react";
import { savePengeluaranUmumTransaction } from "@/app/actions/pengeluaran";
import { toast } from "sonner";

export default function PengeluaranTab({ spj, onDirtyChange }: { spj: any; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Inisialisasi dari spj.pengeluaranDetails (diambil dari server component di parent)
  const initialItems = spj.pengeluaranDetails ? spj.pengeluaranDetails.map((d: any) => ({
    id: d.id,
    uraian: d.uraian,
    hargaSatuan: d.hargaSatuan.toString(),
    qty: d.qty.toString(),
    satuan: d.satuan,
    total: d.total.toString(),
  })) : [];

  const [rincian, setRincian] = useState<any[]>(initialItems);

  const updateRincianList = (items: any[]) => {
    setRincian(items);
    onDirtyChange?.(true);
  };

  const addRincian = () => {
    updateRincianList([...rincian, { id: `temp-${Date.now()}`, uraian: "", hargaSatuan: "0", qty: "1", satuan: "Kali", total: "0" }]);
  };

  const updateRincian = (idx: number, field: string, val: string) => {
    const newR = [...rincian];
    newR[idx][field] = val;
    // Auto hitung total
    if (field === "hargaSatuan" || field === "qty") {
      const harga = BigInt(newR[idx].hargaSatuan || 0);
      const qty = BigInt(newR[idx].qty || 1);
      newR[idx].total = (harga * qty).toString();
    }
    setRincian(newR);
    onDirtyChange?.(true);
  };

  const removeRincian = (idx: number) => {
    updateRincianList(rincian.filter((_, i) => i !== idx));
  };

  const totalPengeluaran = rincian.reduce((acc, curr) => acc + BigInt(curr.total || 0), BigInt(0));

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await savePengeluaranUmumTransaction(spj.id, rincian);
      toast.success("Daftar pengeluaran berhasil disimpan.");
      onDirtyChange?.(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan pengeluaran.");
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white border border-slate-200/60 rounded-lg shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <div className="text-center md:text-left w-full md:w-auto">
          <p className="text-slate-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Daftar Pengeluaran</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button onClick={handleSave} disabled={loading} className="w-full md:w-auto">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
          {errorMsg}
        </div>
      )}

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
          <div>
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Rincian Biaya</CardTitle>
            <p className="text-[10px] sm:text-sm text-slate-500 mt-0.5 sm:mt-1">Daftar item belanja untuk SPJ {spj.jenisSpj === "MAKAN_MINUM" ? "Makan Minum" : "Lainnya"}.</p>
          </div>
          <Button size="sm" onClick={addRincian} variant="secondary" className="w-full sm:w-auto text-[10px] sm:text-xs h-8">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Tambah Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader className="bg-slate-50 border-b">
                <TableRow>
                  <TableHead className="min-w-[150px] sm:w-[300px] px-2 sm:px-4 py-2">Uraian</TableHead>
                  <TableHead className="min-w-[120px] sm:w-[200px] px-2 sm:px-4 py-2">Harga Satuan</TableHead>
                  <TableHead className="min-w-[60px] sm:w-[100px] px-2 sm:px-4 py-2 text-center">Qty</TableHead>
                  <TableHead className="min-w-[80px] sm:w-[120px] px-2 sm:px-4 py-2">Satuan</TableHead>
                  <TableHead className="min-w-[120px] sm:w-[200px] px-2 sm:px-4 py-2 text-right">Total</TableHead>
                  <TableHead className="min-w-[50px] sm:w-[60px] text-center px-2 py-2">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rincian.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 sm:h-32 text-center text-[10px] sm:text-sm text-slate-500">
                      <FileText className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-20" />
                      Belum ada rincian biaya.
                    </TableCell>
                  </TableRow>
                ) : (
                  rincian.map((item, idx) => (
                    <TableRow key={item.id} className="border-b last:border-0">
                      <TableCell className="p-1 sm:p-2">
                        <Input value={item.uraian} onChange={(e) => updateRincian(idx, "uraian", e.target.value)} placeholder="Misal: Nasi Kotak..." className="h-7 sm:h-9 text-[10px] sm:text-sm px-2" />
                      </TableCell>
                      <TableCell className="p-1 sm:p-2">
                        <CurrencyInput value={item.hargaSatuan} onChange={(v) => updateRincian(idx, "hargaSatuan", v)} className="h-7 sm:h-9 text-[10px] sm:text-sm px-2" />
                      </TableCell>
                      <TableCell className="p-1 sm:p-2">
                        <Input type="number" min="1" value={item.qty} onChange={(e) => updateRincian(idx, "qty", e.target.value)} className="h-7 sm:h-9 text-[10px] sm:text-sm px-1 text-center" />
                      </TableCell>
                      <TableCell className="p-1 sm:p-2">
                        <Input value={item.satuan} onChange={(e) => updateRincian(idx, "satuan", e.target.value)} placeholder="Kotak, dll" className="h-7 sm:h-9 text-[10px] sm:text-sm px-2" />
                      </TableCell>
                      <TableCell className="p-1 sm:p-2">
                        <CurrencyInput value={item.total} onChange={(v) => updateRincian(idx, "total", v)} disabled className="h-7 sm:h-9 text-[10px] sm:text-sm px-2 bg-slate-50 text-slate-500 font-bold text-right" />
                      </TableCell>
                      <TableCell className="p-1 sm:p-2 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeRincian(idx)} className="h-7 w-7 sm:h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
