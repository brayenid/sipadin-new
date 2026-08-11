"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addPesertaBulkToAgenda } from "@/app/actions/absensi";
import { Loader2, UserPlus, Check, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type PegawaiMaster = {
  id: string;
  nip: string | null;
  nama: string;
  jabatan: string;
  instansi: string;
  eselon: string | null;
  wajibAbsenOpd: boolean;
};

export default function ModalTambahPeserta({
  isOpen,
  onClose,
  agendaId,
  allPegawai,
  existingPegawaiIds,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  agendaId: string;
  allPegawai: PegawaiMaster[];
  existingPegawaiIds: string[];
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterEselonGroup, setFilterEselonGroup] = useState<string>("ALL"); // ALL, I, II, III, IV, OTHER

  // Filter pegawai yang belum ditambahkan
  const availablePegawai = allPegawai.filter(
    (p) => !existingPegawaiIds.includes(p.id)
  );

  const filteredPegawai = availablePegawai.filter((p) => {
    // 1. Filter Search
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.jabatan.toLowerCase().includes(search.toLowerCase()) ||
      p.instansi.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    // 2. Filter Eselon Group (I, II, III, IV)
    const eselonLower = p.eselon ? p.eselon.toLowerCase() : "";
    if (filterEselonGroup === "I") {
      return eselonLower.startsWith("i.") || eselonLower === "i";
    }
    if (filterEselonGroup === "II") {
      return eselonLower.startsWith("ii.") || eselonLower === "ii";
    }
    if (filterEselonGroup === "III") {
      return eselonLower.startsWith("iii.") || eselonLower === "iii";
    }
    if (filterEselonGroup === "IV") {
      return eselonLower.startsWith("iv.") || eselonLower === "iv";
    }
    if (filterEselonGroup === "OTHER") {
      // Non-eselon atau yang tidak memiliki data eselon
      return !p.eselon || eselonLower === "non_eselon" || eselonLower === "lainnya";
    }

    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPegawai.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPegawai.map((p) => p.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu pegawai");
      return;
    }

    setLoading(true);
    try {
      await addPesertaBulkToAgenda(agendaId, selectedIds);
      toast.success(`${selectedIds.length} pegawai berhasil ditambahkan`);
      setSelectedIds([]);
      setSearch("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan peserta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            Tambah Pejabat (Bulk Insert)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Centang pegawai yang ingin ditambahkan secara massal ke dalam daftar kehadiran agenda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4 pt-4">
          {/* Pencarian dan Filter Eselon */}
          <div className="shrink-0 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Cari nama, jabatan, atau instansi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>

              <div>
                <Select
                  value={filterEselonGroup}
                  onValueChange={(val) => {
                    setFilterEselonGroup(val || "ALL");
                    setSelectedIds([]); // Reset seleksi saat ganti filter eselon
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Filter Eselon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Eselon</SelectItem>
                    <SelectItem value="I">Eselon I</SelectItem>
                    <SelectItem value="II">Eselon II</SelectItem>
                    <SelectItem value="III">Eselon III</SelectItem>
                    <SelectItem value="IV">Eselon IV</SelectItem>
                    <SelectItem value="OTHER">Lainnya / Staf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tombol Pilih Semua */}
            {filteredPegawai.length > 0 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      filteredPegawai.length > 0 &&
                      selectedIds.length === filteredPegawai.length
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Pilih Semua yang Tampil ({filteredPegawai.length})
                  </Label>
                </div>
                <span className="text-xs font-bold text-indigo-600">
                  {selectedIds.length} Terpilih
                </span>
              </div>
            )}
          </div>

          {/* List Pegawai */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50/30">
            {filteredPegawai.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {availablePegawai.length === 0
                  ? "Semua pegawai master sudah terdaftar di agenda ini"
                  : "Tidak ada pegawai yang sesuai dengan filter pencarian / eselon"}
              </div>
            ) : (
              filteredPegawai.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={`p-3 text-xs flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected ? "bg-indigo-50/50" : "hover:bg-slate-100/75"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(p.id)}
                      className="mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {p.nama}
                        </span>
                        {p.eselon && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-300 text-slate-500 font-medium">
                            Eselon {p.eselon}
                          </Badge>
                        )}
                        {p.wajibAbsenOpd && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 border-emerald-200 text-emerald-700">
                            Wajib Absen
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 truncate mt-0.5">{p.jabatan}</p>
                      <p className="text-slate-400 text-[10px] truncate">{p.instansi}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="shrink-0 flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={loading || selectedIds.length === 0}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-1" />
              )}
              Tambahkan ({selectedIds.length})
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
