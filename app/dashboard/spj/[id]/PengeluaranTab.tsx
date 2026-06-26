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

export default function PengeluaranTab({ spj }: { spj: any }) {
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

  const addRincian = () => {
    setRincian([...rincian, { id: `temp-${Date.now()}`, uraian: "", hargaSatuan: "0", qty: "1", satuan: "Kali", total: "0" }]);
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
  };

  const removeRincian = (idx: number) => {
    setRincian(rincian.filter((_, i) => i !== idx));
  };

  const totalPengeluaran = rincian.reduce((acc, curr) => acc + BigInt(curr.total || 0), BigInt(0));

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      await savePengeluaranUmumTransaction(spj.id, rincian);
      toast.success("Daftar pengeluaran berhasil disimpan.");
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
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Daftar Pengeluaran</p>
          <p className="text-xl font-bold text-slate-900">{formatRupiah(totalPengeluaran)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Pengeluaran
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
          {errorMsg}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rincian Biaya</CardTitle>
            <p className="text-sm text-slate-500 mt-1">Daftar item belanja untuk SPJ {spj.jenisSpj === "MAKAN_MINUM" ? "Makan Minum" : "Lainnya"}.</p>
          </div>
          <Button size="sm" onClick={addRincian} variant="secondary">
            <Plus className="w-4 h-4 mr-2" /> Tambah Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Uraian</TableHead>
                  <TableHead className="w-[200px]">Harga Satuan</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Satuan</TableHead>
                  <TableHead className="w-[200px]">Total</TableHead>
                  <TableHead className="w-[60px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rincian.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Belum ada rincian biaya.
                    </TableCell>
                  </TableRow>
                ) : (
                  rincian.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="p-2">
                        <Input value={item.uraian} onChange={(e) => updateRincian(idx, "uraian", e.target.value)} placeholder="Misal: Nasi Kotak..." />
                      </TableCell>
                      <TableCell className="p-2">
                        <CurrencyInput value={item.hargaSatuan} onChange={(v) => updateRincian(idx, "hargaSatuan", v)} />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input type="number" min="1" value={item.qty} onChange={(e) => updateRincian(idx, "qty", e.target.value)} />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input value={item.satuan} onChange={(e) => updateRincian(idx, "satuan", e.target.value)} placeholder="Kotak, Dus, dll" />
                      </TableCell>
                      <TableCell className="p-2">
                        <CurrencyInput value={item.total} onChange={(v) => updateRincian(idx, "total", v)} disabled className="bg-slate-50 text-slate-500 font-bold" />
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeRincian(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
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
