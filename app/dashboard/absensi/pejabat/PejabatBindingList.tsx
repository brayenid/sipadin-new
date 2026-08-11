"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { bulkUpdateBindingPejabat } from "@/app/actions/absensi";

type Pegawai = {
  id: string;
  nip: string | null;
  nama: string;
  jabatan: string;
  instansi: string;
  eselon: string | null;
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

  // Deteksi perubahan (apakah ada row yang dirubah dibanding data props asli)
  const getDirtyItems = () => {
    return internalList.filter((item) => {
      const original = allPegawai.find((p) => p.id === item.id);
      if (!original) return false;
      return (
        original.wajibAbsenOpd !== item.wajibAbsenOpd ||
        original.eselon !== item.eselon
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
  const filteredList = internalList.filter((p) => {
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.jabatan.toLowerCase().includes(search.toLowerCase()) ||
      p.instansi.toLowerCase().includes(search.toLowerCase());

    const matchEselon =
      filterEselon === "ALL" || p.eselon === filterEselon;

    const matchStatus =
      filterStatus === "ALL" ||
      (filterStatus === "BINDING" && p.wajibAbsenOpd) ||
      (filterStatus === "UNBOUND" && !p.wajibAbsenOpd);

    return matchSearch && matchEselon && matchStatus;
  });

  const totalBound = internalList.filter((p) => p.wajibAbsenOpd).length;
  const countEselon2 = internalList.filter((p) => p.wajibAbsenOpd && (p.eselon === "II.b" || p.eselon === "II.a")).length;
  const countEselon3 = internalList.filter((p) => p.wajibAbsenOpd && (p.eselon === "III.a" || p.eselon === "III.b")).length;

  return (
    <div className="space-y-6">
      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-indigo-100 bg-indigo-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
                Total Pegawai Wajib Absen
              </p>
              <p className="text-2xl font-black text-indigo-950 mt-0.5">{totalBound}</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">Otomatis masuk ke setiap daftar absen agenda baru</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Eselon II (Kepala OPD)
              </p>
              <p className="text-2xl font-black text-emerald-950 mt-0.5">{countEselon2}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Kadis / Kaban / Asisten / Staf Ahli</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Eselon III (Kabag / Camat)
              </p>
              <p className="text-2xl font-black text-amber-950 mt-0.5">{countEselon3}</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Kabag Setda & Camat Se-Kabupaten</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kontrol & Filter */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Daftar Pegawai Wajib Absen Default
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Centang pegawai untuk memasukkan mereka secara default ke setiap agenda baru yang dibuat. Jangan lupa simpan perubahan.
              </CardDescription>
            </div>

            <Button
              onClick={handleSaveBulk}
              disabled={saving || dirtyCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 font-semibold"
              size="sm"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1" />
              )}
              Simpan Perubahan ({dirtyCount})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari nama, jabatan, atau instansi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filter Group */}
            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-9 w-full sm:w-44 font-medium"
              >
                <option value="BINDING">Wajib Absen ({totalBound})</option>
                <option value="UNBOUND">Tidak Wajib Absen ({internalList.length - totalBound})</option>
                <option value="ALL">Semua ({internalList.length})</option>
              </select>

              <select
                value={filterEselon}
                onChange={(e) => setFilterEselon(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 h-9"
              >
                <option value="ALL">Semua Eselon</option>
                <option value="II.a">Eselon II.a</option>
                <option value="II.b">Eselon II.b</option>
                <option value="III.a">Eselon III.a</option>
                <option value="III.b">Eselon III.b</option>
                <option value="IV.a">Eselon IV.a</option>
                <option value="IV.b">Eselon IV.b</option>
              </select>
            </div>
          </div>

          {/* Tabel Pejabat */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="w-28 text-center text-xs">Wajib Absen?</TableHead>
                  <TableHead className="text-xs">Nama Pejabat</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs">Perangkat Daerah / OPD</TableHead>
                  <TableHead className="text-xs text-center w-36">Eselon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-xs">
                      Tidak ada data pejabat yang sesuai dengan filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredList.map((p, idx) => (
                    <TableRow
                      key={p.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        p.wajibAbsenOpd ? "bg-indigo-50/15" : ""
                      }`}
                    >
                      <TableCell className="text-center text-xs font-medium text-slate-500">
                        {idx + 1}
                      </TableCell>
                      
                      {/* Checkbox Binding */}
                      <TableCell className="text-center">
                        <Checkbox
                          checked={p.wajibAbsenOpd}
                          onCheckedChange={(checked) => handleCheckboxChange(p.id, !!checked)}
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
