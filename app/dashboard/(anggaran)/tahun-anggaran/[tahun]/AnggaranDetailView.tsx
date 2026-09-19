"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createKegiatan,
  createSubKegiatan,
  createKodeRekening,
  deleteKegiatan,
  deleteSubKegiatan,
  deleteKodeRekening,
  updateKegiatan,
  updateSubKegiatan,
  updateKodeRekening,
  adjustPaguRekening,
  getRiwayatPerubahanRekening,
} from "@/app/actions/anggaran";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Edit,
  X,
  ChevronLeft,
  FileDown,
  FileText,
  MoreVertical,
  History,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/utils";
import Link from "next/link";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import * as XLSX from "xlsx";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ReportPDF } from "@/components/ReportPDF";
import { useEffect } from "react";

// Tipe data berdasarkan Prisma include
type KodeRekening = {
  id: string;
  kodeRekening: string;
  judulRekening: string;
  saldoAwal: bigint;
  sisaSaldo: bigint;
  _count?: { riwayatPerubahan: number };
};
type SubKegiatan = { id: string; kodeSub: string; judulSub: string; rekening: KodeRekening[]; users?: any[] };
type Kegiatan = { id: string; kodeKegiatan: string; judulKegiatan: string; subKegiatan: SubKegiatan[] };
type TahunAnggaran = { id: string; tahun: string; kegiatan: Kegiatan[] };

type DeleteTarget = { type: "kegiatan" | "sub" | "rekening"; id: string } | null;

const deleteLabel: Record<"kegiatan" | "sub" | "rekening", string> = {
  kegiatan: "Kegiatan",
  sub: "Sub-Kegiatan",
  rekening: "Kode Rekening",
};

export default function AnggaranDetailView({ tahunData, session, allTimKerja = [] }: { tahunData: TahunAnggaran, session?: any, allTimKerja?: any[] }) {
  const [data] = useState<TahunAnggaran>(tahunData);
  const [loading, setLoading] = useState(false);
  
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const userTeamId = session?.user?.teamId;

  // Function to check if user has access to edit/add on a subKegiatan
  const hasSubAccess = (sub: SubKegiatan) => {
    if (isSuperAdmin) return true;
    if (!sub.users || !session?.user?.id) return false;
    return sub.users.some((u: any) => u.id === session.user.id);
  };

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const exportToExcel = () => {
    const excelData: any[] = [];
    
    data.kegiatan.forEach(keg => {
      let kegPagu = BigInt(0);
      let kegSisa = BigInt(0);
      keg.subKegiatan.forEach(sub => {
        sub.rekening.forEach(rek => {
          kegPagu += BigInt(rek.saldoAwal);
          kegSisa += BigInt(rek.sisaSaldo);
        });
      });
      excelData.push({
        'Kode': keg.kodeKegiatan,
        'Tingkat': 'Kegiatan',
        'Uraian': keg.judulKegiatan,
        'Pagu (Rp)': Number(kegPagu),
        'Terpakai (Rp)': Number(kegPagu - kegSisa),
        'Sisa (Rp)': Number(kegSisa),
      });

      keg.subKegiatan.forEach(sub => {
        let subPagu = BigInt(0);
        let subSisa = BigInt(0);
        sub.rekening.forEach(rek => {
          subPagu += BigInt(rek.saldoAwal);
          subSisa += BigInt(rek.sisaSaldo);
        });
        excelData.push({
          'Kode': sub.kodeSub,
          'Tingkat': 'Sub-Kegiatan',
          'Uraian': sub.judulSub,
          'Pagu (Rp)': Number(subPagu),
          'Terpakai (Rp)': Number(subPagu - subSisa),
          'Sisa (Rp)': Number(subSisa),
        });

        sub.rekening.forEach(rek => {
          const pagu = BigInt(rek.saldoAwal);
          const sisa = BigInt(rek.sisaSaldo);
          excelData.push({
            'Kode': rek.kodeRekening,
            'Tingkat': 'Rekening',
            'Uraian': rek.judulRekening,
            'Pagu (Rp)': Number(pagu),
            'Terpakai (Rp)': Number(pagu - sisa),
            'Sisa (Rp)': Number(sisa),
          });
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 35 }, // Kode
      { wch: 15 }, // Tingkat
      { wch: 60 }, // Uraian
      { wch: 20 }, // Pagu
      { wch: 20 }, // Terpakai
      { wch: 20 }, // Sisa
    ];

    // Format currency columns
    for (const key in worksheet) {
      if (!key.startsWith('!')) {
        const cell = worksheet[key];
        // Apply number format with thousands separator to columns D, E, F (skip row 1)
        if ((key.startsWith('D') || key.startsWith('E') || key.startsWith('F')) && !key.endsWith('1')) {
          if (cell.t === 'n') {
            cell.z = '#,##0';
          }
        }
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian Anggaran");
    XLSX.writeFile(workbook, `Laporan_Anggaran_${data.tahun}.xlsx`);
  };
  const [isSaving, setIsSaving] = useState(false);

  // Modals for Create
  const [isKegiatanOpen, setIsKegiatanOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [isRekeningOpen, setIsRekeningOpen] = useState(false);

  // Modals for Penyesuaian Anggaran & Riwayat
  const [adjustTargetRek, setAdjustTargetRek] = useState<KodeRekening | null>(null);
  const [adjustMode, setAdjustMode] = useState<"TAMBAH" | "KURANG" | "SET">("TAMBAH");
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustKeterangan, setAdjustKeterangan] = useState<string>("");
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  const [historyTargetRek, setHistoryTargetRek] = useState<KodeRekening | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const [activeKegiatanId, setActiveKegiatanId] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [selectedUsersForSub, setSelectedUsersForSub] = useState<string[]>([]);

  const openAdjustDialog = (rek: KodeRekening) => {
    setAdjustTargetRek(rek);
    setAdjustMode("TAMBAH");
    setAdjustAmount("");
    setAdjustKeterangan("");
  };

  const openHistoryDialog = async (rek: KodeRekening) => {
    setHistoryTargetRek(rek);
    setHistoryLoading(true);
    try {
      const logs = await getRiwayatPerubahanRekening(rek.id);
      setHistoryList(logs);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat riwayat perubahan");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetRek) return;

    const rawInput = parseCurrency(adjustAmount);
    const amountVal = BigInt(rawInput || 0);

    if (amountVal <= BigInt(0) && adjustMode !== "SET") {
      toast.error("Nominal penyesuaian harus lebih besar dari 0");
      return;
    }

    if (!adjustKeterangan.trim()) {
      toast.error("Harap isi keterangan/alasan perubahan anggaran");
      return;
    }

    let newPagu = adjustTargetRek.saldoAwal;
    if (adjustMode === "TAMBAH") {
      newPagu = adjustTargetRek.saldoAwal + amountVal;
    } else if (adjustMode === "KURANG") {
      newPagu = adjustTargetRek.saldoAwal - amountVal;
    } else {
      newPagu = amountVal;
    }

    if (newPagu < BigInt(0)) {
      toast.error("Nominal pagu anggaran baru tidak boleh negatif");
      return;
    }

    const selisih = newPagu - adjustTargetRek.saldoAwal;
    if (selisih === BigInt(0)) {
      toast.error("Pagu baru sama persis dengan pagu saat ini");
      return;
    }

    if (adjustTargetRek.sisaSaldo + selisih < BigInt(0)) {
      toast.error("Pengurangan pagu melebihi sisa saldo anggaran yang belum terpakai!");
      return;
    }

    setIsAdjusting(true);
    try {
      await adjustPaguRekening(adjustTargetRek.id, newPagu, adjustKeterangan);
      toast.success("Perubahan pagu anggaran berhasil dicatat!");
      setAdjustTargetRek(null);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyesuaikan anggaran");
    } finally {
      setIsAdjusting(false);
    }
  };

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = (type: "kegiatan" | "sub" | "rekening", id: string) => {
    setDeleteTarget({ type, id });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      if (deleteTarget.type === "kegiatan") await deleteKegiatan(deleteTarget.id);
      if (deleteTarget.type === "sub") await deleteSubKegiatan(deleteTarget.id);
      if (deleteTarget.type === "rekening") await deleteKodeRekening(deleteTarget.id);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data.");
    }
    setLoading(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleCreateKegiatan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createKegiatan(data.id, formData.get("kode") as string, formData.get("judul") as string);
      setIsKegiatanOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat Kegiatan");
    }
    setLoading(false);
  };

  const handleCreateSubKegiatan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeKegiatanId) return;
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const kodeSub = formData.get("kode") as string;
      const judulSub = formData.get("judul") as string;
      
      await createSubKegiatan(activeKegiatanId, kodeSub, judulSub, selectedUsersForSub);
      setIsSubOpen(false);
      setSelectedUsersForSub([]);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat Sub-Kegiatan");
    }
    setLoading(false);
  };

  const handleCreateKodeRekening = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSubId) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const saldoAwal = BigInt(parseCurrency(formData.get("saldoAwal") as string));
    try {
      await createKodeRekening(activeSubId, formData.get("kode") as string, formData.get("judul") as string, saldoAwal);
      setIsRekeningOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat Kode Rekening");
    }
    setLoading(false);
  };

  const handleEditChange = (type: "kegiatan" | "sub" | "rekening", id: string, field: string, value: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      [`${type}_${id}_${field}`]: value,
    }));
  };

  const isChanged = (type: "kegiatan" | "sub" | "rekening", id: string, field: string, originalValue: any) => {
    const currentValue = editForm[`${type}_${id}_${field}`];
    if (currentValue === undefined) return false;
    if (Array.isArray(originalValue)) {
      if (!Array.isArray(currentValue)) return false;
      return JSON.stringify([...originalValue].sort()) !== JSON.stringify([...currentValue].sort());
    }
    return currentValue !== originalValue;
  };

  const toggleEditMode = () => {
    if (!isEditMode) {
      const initialForm: any = {};
      data.kegiatan.forEach((k) => {
        initialForm[`kegiatan_${k.id}_kode`] = k.kodeKegiatan;
        initialForm[`kegiatan_${k.id}_judul`] = k.judulKegiatan;
        k.subKegiatan.forEach((s) => {
          initialForm[`sub_${s.id}_kode`] = s.kodeSub;
          initialForm[`sub_${s.id}_judul`] = s.judulSub;
          initialForm[`sub_${s.id}_users`] = s.users?.map((u: any) => u.id) || [];
          s.rekening.forEach((r) => {
            initialForm[`rekening_${r.id}_kode`] = r.kodeRekening;
            initialForm[`rekening_${r.id}_judul`] = r.judulRekening;
            initialForm[`rekening_${r.id}_saldo`] = new Intl.NumberFormat("id-ID").format(Number(r.saldoAwal));
          });
        });
      });
      setEditForm(initialForm);
    }
    setIsEditMode(!isEditMode);
  };

  const saveBulkEdit = async () => {
    setIsSaving(true);
    try {
      const promises: Promise<any>[] = [];
      data.kegiatan.forEach((k) => {
        const newKode = editForm[`kegiatan_${k.id}_kode`];
        const newJudul = editForm[`kegiatan_${k.id}_judul`];
        if (newKode !== k.kodeKegiatan || newJudul !== k.judulKegiatan) {
          promises.push(updateKegiatan(k.id, newKode, newJudul));
        }
        k.subKegiatan.forEach((s) => {
          if (!hasSubAccess(s)) return;
          const newSKode = editForm[`sub_${s.id}_kode`];
          const newSJudul = editForm[`sub_${s.id}_judul`];
          const newSUsers = editForm[`sub_${s.id}_users`];
          const oldUsersString = JSON.stringify([...(s.users?.map((u: any) => u.id) || [])].sort());
          const newUsersString = newSUsers ? JSON.stringify([...newSUsers].sort()) : oldUsersString;

          if (newSKode !== s.kodeSub || newSJudul !== s.judulSub || oldUsersString !== newUsersString) {
            promises.push(updateSubKegiatan(s.id, newSKode, newSJudul, newSUsers));
          }
          s.rekening.forEach((r) => {
            const newRKode = editForm[`rekening_${r.id}_kode`];
            const newRJudul = editForm[`rekening_${r.id}_judul`];
            const newRSaldo = BigInt(parseCurrency(editForm[`rekening_${r.id}_saldo`]));
            if (newRKode !== r.kodeRekening || newRJudul !== r.judulRekening || newRSaldo !== r.saldoAwal) {
              promises.push(updateKodeRekening(r.id, newRKode, newRJudul, newRSaldo));
            }
          });
        });
      });
      await Promise.all(promises);
      setIsEditMode(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan perubahan massal.");
    }
    setIsSaving(false);
  };

  return (
    <>
      {/* ── Dialogs ─────────────────────────────────────────── */}

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <p className="text-sm mt-2">
            Yakin ingin menghapus{" "}
            <span className="font-semibold text-slate-900">
              {deleteTarget ? deleteLabel[deleteTarget.type] : "item"}
            </span>{" "}
            ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
              disabled={loading}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Kegiatan */}
      <Dialog open={isKegiatanOpen} onOpenChange={setIsKegiatanOpen}>
        <DialogContent>
          <form onSubmit={handleCreateKegiatan} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Kegiatan Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Kode Kegiatan</Label>
              <Input name="kode" required placeholder="Misal: 4.01.4..." />
            </div>
            <div className="space-y-2">
              <Label>Judul Kegiatan</Label>
              <Input name="judul" required placeholder="Koordinasi dan Konsultasi..." />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Sub-Kegiatan */}
      <Dialog open={isSubOpen} onOpenChange={setIsSubOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubKegiatan} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Sub-Kegiatan</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Kode Sub-Kegiatan</Label>
              <Input name="kode" required placeholder="Misal: 4.01.4...001" />
            </div>
            <div className="space-y-2">
              <Label>Judul Sub-Kegiatan</Label>
              <Input name="judul" required placeholder="Perjalanan Dinas..." />
            </div>
            
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Pilih Tim yang Berhak Akses</Label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                  {allTimKerja?.map(t => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        value={t.id}
                        checked={selectedUsersForSub.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsersForSub([...selectedUsersForSub, t.id]);
                          else setSelectedUsersForSub(selectedUsersForSub.filter(id => id !== t.id));
                        }}
                      />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Kode Rekening */}
      <Dialog open={isRekeningOpen} onOpenChange={setIsRekeningOpen}>
        <DialogContent>
          <form onSubmit={handleCreateKodeRekening} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Kode Rekening</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Kode Rekening</Label>
              <Input name="kode" required placeholder="Misal: 5.1.02..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="judul-sub">Judul Sub-Kegiatan</Label>
              <Input id="judul-sub" name="judul" required placeholder="Contoh: Penyediaan Jasa Surat Menyurat" />
            </div>
            <div className="space-y-2">
              <Label>Saldo Awal (Pagu Anggaran)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">Rp</span>
                <Input
                  name="saldoAwal"
                  required
                  className="pl-9 font-mono"
                  placeholder="50.000.000"
                  onChange={(e) => {
                    const val = parseCurrency(e.target.value);
                    e.target.value = formatCurrency(Number(val)).replace("Rp", "").trim();
                  }}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Penyesuaian Anggaran (Tambah / Kurang / Set Pagu Baru) */}
      <Dialog open={!!adjustTargetRek} onOpenChange={(open) => !open && setAdjustTargetRek(null)}>
        <DialogContent className="sm:max-w-md">
          {adjustTargetRek && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  Penyesuaian Anggaran
                </DialogTitle>
              </DialogHeader>

              {/* Info Rekening */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
                <div className="font-mono text-slate-500 font-semibold">{adjustTargetRek.kodeRekening}</div>
                <div className="font-medium text-slate-800">{adjustTargetRek.judulRekening}</div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 mt-1.5 text-slate-600">
                  <span>Pagu Saat Ini: <strong className="text-slate-900">Rp {Number(adjustTargetRek.saldoAwal).toLocaleString("id-ID")}</strong></span>
                  <span>Sisa Saldo: <strong className="text-indigo-700">Rp {Number(adjustTargetRek.sisaSaldo).toLocaleString("id-ID")}</strong></span>
                </div>
              </div>

              {/* Mode Penyesuaian */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Jenis Perubahan</Label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    className={`h-8 text-xs font-semibold rounded-md transition-all ${
                      adjustMode === "TAMBAH"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setAdjustMode("TAMBAH")}
                  >
                    Tambah (+)
                  </button>
                  <button
                    type="button"
                    className={`h-8 text-xs font-semibold rounded-md transition-all ${
                      adjustMode === "KURANG"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setAdjustMode("KURANG")}
                  >
                    Kurang (-)
                  </button>
                  <button
                    type="button"
                    className={`h-8 text-xs font-semibold rounded-md transition-all ${
                      adjustMode === "SET"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setAdjustMode("SET")}
                  >
                    Pagu Baru
                  </button>
                </div>
              </div>

              {/* Input Nominal */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  {adjustMode === "TAMBAH" && "Nominal Tambahan (Rp)"}
                  {adjustMode === "KURANG" && "Nominal Pengurangan (Rp)"}
                  {adjustMode === "SET" && "Nominal Pagu Baru (Rp)"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 text-sm">Rp</span>
                  <Input
                    required
                    value={adjustAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setAdjustAmount(raw ? new Intl.NumberFormat("id-ID").format(parseInt(raw, 10)) : "");
                    }}
                    placeholder={adjustMode === "SET" ? Number(adjustTargetRek.saldoAwal).toLocaleString("id-ID") : "10.000.000"}
                    className="pl-9 font-mono font-semibold text-sm"
                  />
                </div>
              </div>

              {/* Preview Kalkulasi */}
              {adjustAmount && (
                (() => {
                  const val = BigInt(parseCurrency(adjustAmount) || 0);
                  let calculatedPagu = adjustTargetRek.saldoAwal;
                  if (adjustMode === "TAMBAH") calculatedPagu += val;
                  else if (adjustMode === "KURANG") calculatedPagu -= val;
                  else calculatedPagu = val;

                  const selisih = calculatedPagu - adjustTargetRek.saldoAwal;
                  const calculatedSisa = adjustTargetRek.sisaSaldo + selisih;
                  const isSisaMinus = calculatedSisa < BigInt(0);

                  return (
                    <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${isSisaMinus ? "bg-red-50 border-red-200 text-red-800" : "bg-indigo-50/70 border-indigo-100 text-indigo-900"}`}>
                      <div className="flex justify-between">
                        <span>Pagu Baru Menjadi:</span>
                        <strong>Rp {Number(calculatedPagu).toLocaleString("id-ID")}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Estimasi Sisa Saldo:</span>
                        <strong className={isSisaMinus ? "text-red-600 font-bold" : "text-indigo-700"}>
                          Rp {Number(calculatedSisa).toLocaleString("id-ID")}
                        </strong>
                      </div>
                      {isSisaMinus && (
                        <p className="text-[11px] text-red-600 font-medium pt-1">
                          ⚠️ Peringatan: Sisa saldo menjadi minus karena anggaran sudah terpakai oleh SPJ.
                        </p>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Keterangan / Alasan Perubahan */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Alasan / Keterangan Perubahan <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  value={adjustKeterangan}
                  onChange={(e) => setAdjustKeterangan(e.target.value)}
                  placeholder="Contoh: APBD-P TA 2026 / Pergeseran Kas Triwulan III..."
                  className="text-xs sm:text-sm"
                />
                <p className="text-[10px] text-slate-400">
                  Keterangan ini akan disimpan ke riwayat jejak rekam anggaran.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdjustTargetRek(null)} disabled={isAdjusting}>
                  Batal
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isAdjusting || !adjustAmount}>
                  {isAdjusting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Riwayat Perubahan Anggaran Dialog */}
      <Dialog open={!!historyTargetRek} onOpenChange={(open) => !open && setHistoryTargetRek(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="w-5 h-5 text-indigo-600" />
              Riwayat Perubahan Anggaran
            </DialogTitle>
          </DialogHeader>

          {historyTargetRek && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div className="font-mono text-slate-500 font-semibold">{historyTargetRek.kodeRekening}</div>
              <div className="font-medium text-slate-800">{historyTargetRek.judulRekening}</div>
              <div className="flex gap-4 pt-1 text-slate-600">
                <span>Pagu Saat Ini: <strong className="text-slate-900">Rp {Number(historyTargetRek.saldoAwal).toLocaleString("id-ID")}</strong></span>
                <span>Sisa Saldo: <strong className="text-indigo-700">Rp {Number(historyTargetRek.sisaSaldo).toLocaleString("id-ID")}</strong></span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-600" />
                <p className="text-xs">Memuat riwayat perubahan...</p>
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Belum ada catatan perubahan anggaran.</p>
                <p className="text-xs text-slate-400 mt-1">Setiap penyesuaian pagu akan otomatis tercatat di sini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((log) => {
                  const selisihBig = BigInt(log.selisih || "0");
                  const isPositif = selisihBig > BigInt(0);
                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-slate-800">
                            {new Date(log.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-slate-400 text-[11px] ml-2">oleh {log.createdByNama || "Pengguna"}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isPositif
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isPositif ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isPositif ? "+" : ""}
                          Rp {Number(log.selisih).toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600 text-[11px] bg-slate-50 p-2 rounded">
                        <span>Pagu Semula: <strong>Rp {Number(log.saldoSebelum).toLocaleString("id-ID")}</strong></span>
                        <span>→</span>
                        <span>Pagu Menjadi: <strong className="text-slate-900">Rp {Number(log.saldoSesudah).toLocaleString("id-ID")}</strong></span>
                      </div>

                      {log.keterangan && (
                        <p className="text-slate-700 font-medium text-[11px] bg-indigo-50/50 border border-indigo-100/60 p-2 rounded">
                          <span className="text-slate-400 font-normal">Keterangan: </span>
                          {log.keterangan}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="space-y-6 pb-16 lg:pb-0">

        {/* Header — mirip AnggaranList */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
              <Link
                href="/dashboard/tahun-anggaran"
                className="hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Tahun Anggaran
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-900">{data.tahun}</span>
            </div>
            <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Rincian Anggaran Tahun {data.tahun}</h1>
            <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">Kelola Kegiatan, Sub-Kegiatan, dan Kode Rekening.</p>
          </div>

          {/* Desktop action buttons */}
          <div className="hidden lg:flex gap-2">
            {!isEditMode && (
              <>
                <Button variant="outline" onClick={exportToExcel} className="bg-white">
                  <FileDown className="w-4 h-4 mr-2" /> Excel
                </Button>
                {mounted && (
                  <PDFDownloadLink
                    document={<ReportPDF data={data} />}
                    fileName={`Laporan_Anggaran_${data.tahun}.pdf`}
                    className={buttonVariants({ variant: "outline", className: "bg-white !border !border-slate-200" })}
                  >
                    {({ loading }) => (
                      <>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                        PDF
                      </>
                    )}
                  </PDFDownloadLink>
                )}
              </>
            )}
            {isEditMode && (
              <Button variant="ghost" onClick={toggleEditMode} disabled={isSaving}>
                Batal
              </Button>
            )}
            {isEditMode ? (
              <Button onClick={saveBulkEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan Perubahan
              </Button>
            ) : (
              <Button variant="outline" onClick={toggleEditMode} className="bg-white hover:bg-slate-50">
                <Edit className="w-4 h-4 mr-2" /> Edit Mode
              </Button>
            )}
            {isSuperAdmin && !isEditMode && (
              <Button onClick={() => setIsKegiatanOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Kegiatan Baru
              </Button>
            )}
          </div>
        </div>

        {/* Rincian List */}
        <Card className="shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] border-slate-200/60 overflow-hidden">
          {data.kegiatan.length === 0 ? (
            <div className="pt-6 text-center text-slate-500 py-12">
              Belum ada Kegiatan di tahun ini.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {data.kegiatan.map((keg) => (
                <div key={keg.id} className="flex flex-col">
                  {/* Kegiatan header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white gap-4">
                    <div className="flex-1">
                      {isEditMode ? (
                        <div className="flex gap-2 w-full">
                          <Input
                            placeholder="Kode Kegiatan (contoh: 4.01.4.01.0)"
                            value={editForm[`kegiatan_${keg.id}_kode`] || ""}
                            onChange={(e) => handleEditChange("kegiatan", keg.id, "kode", e.target.value)}
                            className={`w-1/3 bg-white ${isChanged("kegiatan", keg.id, "kode", keg.kodeKegiatan) ? "bg-amber-50 border-amber-400" : ""}`}
                          />
                          <Input
                            placeholder="Judul Kegiatan"
                            value={editForm[`kegiatan_${keg.id}_judul`] || ""}
                            onChange={(e) => handleEditChange("kegiatan", keg.id, "judul", e.target.value)}
                            className={`flex-1 bg-white ${isChanged("kegiatan", keg.id, "judul", keg.judulKegiatan) ? "bg-amber-50 border-amber-400" : ""}`}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-[10px] sm:text-xs text-slate-500 font-mono mb-0.5 sm:mb-1">{keg.kodeKegiatan}</div>
                          <div className="text-sm sm:text-base font-medium text-slate-900">{keg.judulKegiatan}</div>
                        </>
                      )}
                    </div>
                    
                    {!isEditMode && (
                      <div className="flex flex-col items-start sm:items-end mt-2 sm:mt-0 mr-0 sm:mr-4">
                        {(() => {
                          let kegPagu = BigInt(0);
                          let kegSisa = BigInt(0);
                          keg.subKegiatan.forEach((s: any) => {
                            s.rekening.forEach((r: any) => {
                              kegPagu += r.saldoAwal;
                              kegSisa += r.sisaSaldo;
                            });
                          });
                          return (
                            <>
                              <div className="text-[10px] sm:text-sm text-slate-500">Pagu: Rp {Number(kegPagu).toLocaleString("id-ID")}</div>
                              <div className="text-xs sm:text-sm font-bold text-slate-800">Sisa: Rp {Number(kegSisa).toLocaleString("id-ID")}</div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {!isEditMode && isSuperAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveKegiatanId(keg.id);
                            setIsSubOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Sub-Kegiatan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete("kegiatan", keg.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    {keg.subKegiatan.length === 0 ? (
                      <div className="px-5 pb-5 pt-0 text-sm text-slate-400">Belum ada Sub-Kegiatan.</div>
                    ) : (
                      keg.subKegiatan.map((sub) => (
                        <div key={sub.id} className="flex flex-col border-t border-slate-100">
                          {/* Sub-Kegiatan row */}
                          <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between bg-white gap-3 sm:gap-4 ml-2 sm:ml-8 border-l-2 border-slate-200 pl-3 sm:pl-4`}>
                            <div className="flex-1">
                              {isEditMode && hasSubAccess(sub) ? (
                                <div className="flex flex-col gap-2 w-full">
                                  <div className="flex gap-2 w-full">
                                    <Input
                                      placeholder="Kode Sub-Kegiatan (contoh: 4.01.4.01.0.00.0.000.001.001)"
                                      value={editForm[`sub_${sub.id}_kode`] || ""}
                                      onChange={(e) => handleEditChange("sub", sub.id, "kode", e.target.value)}
                                      className={`w-1/3 ${isChanged("sub", sub.id, "kode", sub.kodeSub) ? "bg-amber-50 border-amber-400" : ""}`}
                                    />
                                    <Input
                                      placeholder="Judul Sub-Kegiatan"
                                      value={editForm[`sub_${sub.id}_judul`] || ""}
                                      onChange={(e) => handleEditChange("sub", sub.id, "judul", e.target.value)}
                                      className={`flex-1 ${isChanged("sub", sub.id, "judul", sub.judulSub) ? "bg-amber-50 border-amber-400" : ""}`}
                                    />
                                  </div>
                                  {isSuperAdmin && (
                                    <div className={`flex flex-wrap gap-3 p-2 border rounded-md ${isChanged("sub", sub.id, "users", sub.users?.map((u: any) => u.id) || []) ? "bg-amber-50 border-amber-400" : "bg-slate-50/50"}`}>
                                      <div className="w-full text-xs font-semibold text-slate-500">Edit Akses Tim Kerja:</div>
                                      {allTimKerja?.map(t => {
                                        const currentUsers = editForm[`sub_${sub.id}_users`] || [];
                                        return (
                                          <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-xs">
                                            <input 
                                              type="checkbox" 
                                              checked={currentUsers.includes(t.id)}
                                              onChange={(e) => {
                                                const newUsers = e.target.checked 
                                                  ? [...currentUsers, t.id]
                                                  : currentUsers.filter((id: string) => id !== t.id);
                                                handleEditChange("sub", sub.id, "users", newUsers);
                                              }}
                                            />
                                            <span>{t.name}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="text-[10px] sm:text-xs text-slate-500 font-mono mb-0.5 sm:mb-1">{sub.kodeSub}</div>
                                  <div className="font-medium text-slate-800 text-xs sm:text-sm">{sub.judulSub}</div>
                                </>
                              )}
                            </div>
                            
                            {!isEditMode && (
                              <div className="flex flex-col items-start sm:items-end mt-2 sm:mt-0 mr-0 sm:mr-4">
                                {(() => {
                                  let subPagu = BigInt(0);
                                  let subSisa = BigInt(0);
                                  sub.rekening.forEach((r: any) => {
                                    subPagu += r.saldoAwal;
                                    subSisa += r.sisaSaldo;
                                  });
                                  return (
                                    <>
                                      <div className="text-[10px] sm:text-sm text-slate-500">Pagu: Rp {Number(subPagu).toLocaleString("id-ID")}</div>
                                      <div className="text-xs sm:text-sm font-bold text-slate-700">Sisa: Rp {Number(subSisa).toLocaleString("id-ID")}</div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {!isEditMode && hasSubAccess(sub) && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setActiveSubId(sub.id);
                                    setIsRekeningOpen(true);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Rekening
                                </Button>
                                {isSuperAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete("sub", sub.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Rekening rows */}
                          <div className={`px-3 sm:px-5 pb-3 sm:pb-5 space-y-2 sm:space-y-3 ml-2 sm:ml-8 pl-3 sm:pl-4`}>
                            {sub.rekening.length === 0 ? (
                              <div className="p-3 bg-slate-50/50 rounded-md text-xs sm:text-sm text-slate-400 text-center border border-dashed border-slate-200">
                                Belum ada Kode Rekening yang dianggarkan.
                              </div>
                            ) : (
                              sub.rekening.map((rek) => (
                                <div
                                  key={rek.id}
                                  className="flex flex-col lg:flex-row lg:items-center justify-between p-3 sm:p-4 rounded-lg border border-slate-100 bg-white gap-3 sm:gap-4"
                                >
                                  <div className="flex-1 min-w-0 sm:min-w-[200px]">
                                    {isEditMode && hasSubAccess(sub) ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Kode Rekening"
                                            value={editForm[`rekening_${rek.id}_kode`] || ""}
                                            onChange={(e) =>
                                              handleEditChange("rekening", rek.id, "kode", e.target.value)
                                            }
                                            className={`w-1/3 h-8 text-xs focus:border-solid border-slate-300 ${isChanged("rekening", rek.id, "kode", rek.kodeRekening) ? "bg-amber-50 border-amber-400 border-solid" : "border-dashed"}`}
                                          />
                                          <Input
                                            placeholder="Judul Rekening"
                                            value={editForm[`rekening_${rek.id}_judul`] || ""}
                                            onChange={(e) =>
                                              handleEditChange("rekening", rek.id, "judul", e.target.value)
                                            }
                                            className={`flex-1 h-8 text-xs focus:border-solid border-slate-300 ${isChanged("rekening", rek.id, "judul", rek.judulRekening) ? "bg-amber-50 border-amber-400 border-solid" : "border-dashed"}`}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-0.5 sm:gap-1">
                                        <span className="text-[10px] sm:text-xs font-mono text-slate-500">{rek.kodeRekening}</span>
                                        <span className="text-xs sm:text-sm font-medium text-slate-700">{rek.judulRekening}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-left sm:text-right mt-1 sm:mt-0">
                                    {isEditMode && hasSubAccess(sub) ? (
                                      <div className="relative w-full sm:w-32">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                          Rp
                                        </span>
                                        <Input
                                          value={editForm[`rekening_${rek.id}_saldo`] || ""}
                                          onChange={(e) => {
                                            const rawValue = e.target.value.replace(/[^0-9]/g, "");
                                            const formattedValue = rawValue ? new Intl.NumberFormat("id-ID").format(parseInt(rawValue, 10)) : "";
                                            handleEditChange("rekening", rek.id, "saldo", formattedValue);
                                          }}
                                          className={`pl-8 text-xs text-right ${isChanged("rekening", rek.id, "saldo", new Intl.NumberFormat("id-ID").format(Number(rek.saldoAwal))) ? "bg-amber-50 border-amber-400" : ""}`}
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-start sm:items-end gap-0.5">
                                        <div className="text-[10px] sm:text-sm text-slate-500">
                                          Pagu: Rp {Number(rek.saldoAwal).toLocaleString("id-ID")}
                                        </div>
                                        <div className="text-xs sm:text-sm font-bold text-slate-900">
                                          Sisa: Rp {Number(rek.sisaSaldo).toLocaleString("id-ID")}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {!isEditMode && (
                                    <div className="flex items-center gap-1 shrink-0 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50 relative"
                                        title="Riwayat Perubahan Anggaran"
                                        onClick={() => openHistoryDialog(rek)}
                                      >
                                        <History className="w-3.5 h-3.5" />
                                        {(rek._count?.riwayatPerubahan ?? 0) > 0 && (
                                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                                            {rek._count?.riwayatPerubahan}
                                          </span>
                                        )}
                                      </Button>

                                      {hasSubAccess(sub) && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                                            title="Sesuaikan Anggaran (Tambah/Kurang)"
                                            onClick={() => openAdjustDialog(rek)}
                                          >
                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                            title="Hapus Rekening"
                                            onClick={() => handleDelete("rekening", rek.id)}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Mobile Actions */}
        {/* Mobile Actions (3-button standard) */}
        {isEditMode ? (
          <MobileBottomNav
            primaryAction={
              <Button
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
                onClick={saveBulkEdit}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Simpan Perubahan
              </Button>
            }
            secondaryDrawer={{
              title: "Batal Pengeditan",
              description: "Kembalikan perubahan formulir anggaran",
              children: (close) => (
                <Button
                  variant="outline"
                  className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => {
                    close();
                    toggleEditMode();
                  }}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-1.5" /> Batalkan Mode Edit
                </Button>
              ),
            }}
          />
        ) : (
          <MobileBottomNav
            primaryAction={
              isSuperAdmin ? (
                <Button
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
                  onClick={() => setIsKegiatanOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Kegiatan Baru
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-10 bg-white font-semibold text-xs border-slate-200"
                  onClick={toggleEditMode}
                >
                  <Edit className="w-4 h-4 mr-1.5 text-slate-600" />
                  Mode Edit Massal
                </Button>
              )
            }
            secondaryDrawer={{
              title: "Opsi & Ekspor Anggaran",
              description: "Pengaturan pengeditan massal dan ekspor berkas",
              children: (close) => (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      toggleEditMode();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Edit className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                          Bulk Edit Anggaran
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Ubah kode, judul, dan pagu langsung di tabel
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      close();
                      exportToExcel();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileDown className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                          Ekspor ke Excel
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Unduh rincian anggaran ke dalam file .xlsx
                        </p>
                      </div>
                    </div>
                  </button>

                  {mounted && (
                    <div className="p-1">
                      <PDFDownloadLink
                        document={<ReportPDF data={data} />}
                        fileName={`Laporan_Anggaran_${data.tahun}.pdf`}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group text-left"
                        onClick={close}
                      >
                        {({ loading }) => (
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 group-hover:text-rose-600">
                                Ekspor ke PDF
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {loading ? "Menyiapkan PDF..." : "Unduh lembar laporan cetak format PDF"}
                              </p>
                            </div>
                          </div>
                        )}
                      </PDFDownloadLink>
                    </div>
                  )}
                </div>
              ),
            }}
          />
        )}
      </div>
    </>
  );
}
