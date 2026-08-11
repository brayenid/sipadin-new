"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save,
  Printer,
  UserPlus,
  ExternalLink,
  Trash2,
  Building2,
  Search,
  Loader2,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { updateKehadiranPesertaBatch, deletePesertaFromAgenda } from "@/app/actions/absensi";
import { StatusAgendaAbsensi, StatusKehadiran } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWita } from "@/lib/date-utils";
import CetakModal from "./CetakModal";
import ModalTambahPeserta from "./ModalTambahPeserta";

type Peserta = {
  id: string;
  pegawaiId: string | null;
  nama: string;
  nip: string | null;
  jabatan: string;
  instansi: string;
  eselon: string | null;
  urutan: number;
  status: StatusKehadiran;
  namaPerwakilan: string | null;
  jabatanPerwakilan: string | null;
  keterangan: string | null;
};

type Agenda = {
  id: string;
  namaKegiatan: string;
  hari: string | null;
  tanggal: Date;
  waktu: string | null;
  tempat: string;
  deskripsi: string | null;
  targetPeserta: string | null;
  status: StatusAgendaAbsensi;
  driveUrl: string | null;
  peserta: Peserta[];
};

export default function ChecklistForm({
  agenda,
  allPegawai,
}: {
  agenda: Agenda;
  allPegawai: {
    id: string;
    nip: string | null;
    nama: string;
    jabatan: string;
    instansi: string;
    eselon: string | null;
    wajibAbsenOpd: boolean;
  }[];
}) {
  const router = useRouter();
  const [pesertaList, setPesertaList] = useState<Peserta[]>(agenda.peserta);
  const [statusAgenda, setStatusAgenda] = useState<StatusAgendaAbsensi>(agenda.status);
  const [driveUrl, setDriveUrl] = useState<string>(agenda.driveUrl || "");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [saving, setSaving] = useState(false);
  const [isCetakOpen, setIsCetakOpen] = useState(false);
  const [isTambahOpen, setIsTambahOpen] = useState(false);

  // Ref untuk menandai render pertama
  const isFirstRender = React.useRef(true);

  // Sync state ketika agenda props berubah (setelah submit bulk insert)
  React.useEffect(() => {
    setPesertaList(agenda.peserta);
  }, [agenda.peserta]);

  // Ubah status kehadiran satuan
  const handleStatusChange = (id: string, newStatus: StatusKehadiran) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  // Ubah perwakilan & simpan
  const handlePerwakilanChange = (
    id: string,
    field: "namaPerwakilan" | "jabatanPerwakilan" | "keterangan",
    val: string
  ) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // Dipanggil saat input teks kehilangan fokus (onBlur)
  const handleInputBlur = () => {
    // trigger auto save jika dirty
    if (isDirty()) {
      handleSave(true);
    }
  };

  // Tandai semua hadir
  const handleMarkAllHadir = () => {
    setPesertaList((prev) =>
      prev.map((p) => ({ ...p, status: StatusKehadiran.HADIR }))
    );
    toast.success("Semua pejabat ditandai Hadir");
  };

  // Hapus peserta
  const handleDeletePeserta = async (pesertaId: string, nama: string) => {
    if (!confirm(`Hapus ${nama} dari daftar agenda ini?`)) return;
    try {
      await deletePesertaFromAgenda(agenda.id, pesertaId);
      setPesertaList((prev) => prev.filter((p) => p.id !== pesertaId));
      toast.success("Peserta berhasil dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus peserta");
    }
  };

  // Simpan data batch (Manual)
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateKehadiranPesertaBatch(
        agenda.id,
        pesertaList.map((p) => ({
          id: p.id,
          status: p.status,
          namaPerwakilan: p.namaPerwakilan,
          jabatanPerwakilan: p.jabatanPerwakilan,
          keterangan: p.keterangan,
        })),
        {
          driveUrl: driveUrl.trim() || undefined,
          status: statusAgenda,
        }
      );

      toast.success("Data absensi & tautan Google Drive berhasil disimpan");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data absensi");
    } finally {
      setSaving(false);
    }
  };

  // Perhitungan Realtime
  const totalPeserta = pesertaList.length;
  const countHadir = pesertaList.filter((p) => p.status === "HADIR").length;
  const countMewakili = pesertaList.filter((p) => p.status === "MEWAKILI").length;
  const countTidakHadir = pesertaList.filter((p) => p.status === "TIDAK_HADIR").length;
  const countIzin = pesertaList.filter((p) => p.status === "IZIN").length;

  const persentaseTotal =
    totalPeserta > 0
      ? Math.round(((countHadir + countMewakili) / totalPeserta) * 100)
      : 0;

  // Filter list
  const filteredPeserta = pesertaList.filter((p) => {
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.jabatan.toLowerCase().includes(search.toLowerCase()) ||
      p.instansi.toLowerCase().includes(search.toLowerCase()) ||
      (p.namaPerwakilan && p.namaPerwakilan.toLowerCase().includes(search.toLowerCase()));

    const matchStatus =
      filterStatus === "ALL" || p.status === filterStatus;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Form Input Sederhana Berurutan dan Tombol Aksi Horizontal di Bawah Form */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {/* Grid Input Data Agenda (Disabled) & Status Agenda */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tanggal Pelaksanaan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Tanggal Pelaksanaan
              </Label>
              <Input
                value={agenda.hari ? `${agenda.hari}, ${formatWita(agenda.tanggal, "dd MMMM yyyy")}` : formatWita(agenda.tanggal, "dd MMMM yyyy")}
                disabled
                className="bg-slate-50 text-xs font-semibold text-slate-600 h-9"
              />
            </div>

            {/* Waktu Pelaksanaan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Waktu Pelaksanaan
              </Label>
              <Input
                value={agenda.waktu || "-"}
                disabled
                className="bg-slate-50 text-xs font-semibold text-slate-600 h-9"
              />
            </div>

            {/* Tempat Pelaksanaan */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Tempat Pelaksanaan
              </Label>
              <Input
                value={agenda.tempat}
                disabled
                className="bg-slate-50 text-xs font-semibold text-slate-600 h-9"
              />
            </div>

            {/* Status Agenda */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Status Agenda
              </Label>
              <select
                value={statusAgenda}
                onChange={(e) => setStatusAgenda(e.target.value as StatusAgendaAbsensi)}
                className="w-full h-9 text-xs font-semibold bg-white border border-slate-300 rounded-md px-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="BERLANGSUNG">Berlangsung</option>
                <option value="SELESAI">Selesai</option>
                <option value="DIBATALKAN">Dibatalkan</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Pilih status <b>Selesai</b> setelah seluruh kehadiran pejabat selesai diverifikasi.
          </p>

          {/* Tautan Google Drive */}
          <div className="space-y-1.5 pb-4 border-b border-slate-100">
            <Label className="text-xs font-semibold text-slate-800">
              Tautan Google Drive
            </Label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="https://drive.google.com/drive/folders/..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className="text-xs bg-white h-9 border-slate-300"
              />
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs h-9 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Uji Tautan
                  </Button>
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Tempelkan link folder atau file Google Drive bukti scan absensi tanda tangan basah di lapangan.
            </p>
          </div>

          {/* Tombol Aksi Horizontal di Bawah Form */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCetakOpen(true)}
              className="text-xs border-slate-300 hover:bg-slate-50 font-semibold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Cetak Format
            </Button>



            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Simpan Perubahan
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* 3. Tabel Checklist Kehadiran */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Checklist Kehadiran Pejabat Perangkat Daerah
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Ceklis status kehadiran masing-masing pejabat. Jika status Mewakili, masukkan nama personil perwakilannya.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTambahOpen(true)}
              className="text-xs border-slate-300 hover:bg-slate-50 font-semibold self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Tambah Pejabat
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari nama, OPD, atau perwakilan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9 w-full sm:w-44"
            >
              <option value="ALL">Semua ({totalPeserta})</option>
              <option value="HADIR">Hadir ({countHadir})</option>
              <option value="MEWAKILI">Mewakili ({countMewakili})</option>
              <option value="TIDAK_HADIR">Tidak Hadir ({countTidakHadir})</option>
            </select>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="text-xs min-w-[200px]">Pejabat & OPD</TableHead>
                  <TableHead className="text-xs w-48 text-center">Status Kehadiran</TableHead>
                  <TableHead className="text-xs min-w-[240px]">Data Perwakilan (Jika Mewakili)</TableHead>
                  <TableHead className="text-xs min-w-[180px]">Catatan / Keterangan</TableHead>
                  <TableHead className="text-xs text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeserta.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 text-xs">
                      Tidak ada peserta yang cocok dengan pencarian
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPeserta.map((p, idx) => {
                    const isMewakili = p.status === "MEWAKILI";

                    return (
                      <TableRow
                        key={p.id}
                        className={`transition-colors ${
                          p.status === "HADIR"
                            ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                            : p.status === "MEWAKILI"
                            ? "bg-amber-50/20 hover:bg-amber-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <TableCell className="text-center text-xs font-medium text-slate-500">
                          {idx + 1}
                        </TableCell>

                        {/* Nama & Instansi */}
                        <TableCell className="text-xs">
                          <div className="font-bold text-slate-900">{p.nama}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{p.jabatan}</div>
                          <div className="text-indigo-700 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            {p.instansi}
                          </div>
                        </TableCell>

                        {/* Status Kehadiran (Selector HTML Biasa) */}
                        <TableCell className="text-center text-xs">
                          <select
                            value={p.status}
                            onChange={(e) => handleStatusChange(p.id, e.target.value as StatusKehadiran)}
                            className="h-8 w-full text-xs font-semibold rounded-md border border-slate-350 bg-white px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="TIDAK_HADIR">Tidak Hadir</option>
                            <option value="HADIR">Hadir</option>
                            <option value="MEWAKILI">Mewakili</option>
                            <option value="IZIN">Izin / Dinas Luar</option>
                          </select>
                        </TableCell>

                        {/* Form Perwakilan */}
                        <TableCell className="text-xs">
                          {isMewakili ? (
                            <div className="space-y-1.5 p-2 bg-amber-50/80 rounded-md border border-amber-200/80">
                              <Input
                                placeholder="Nama yang mewakili..."
                                value={p.namaPerwakilan || ""}
                                onChange={(e) => handlePerwakilanChange(p.id, "namaPerwakilan", e.target.value)}
                                className="text-xs h-7 bg-white"
                              />
                              <Input
                                placeholder="Jabatan perwakilan (mis: Sekretaris)..."
                                value={p.jabatanPerwakilan || ""}
                                onChange={(e) => handlePerwakilanChange(p.id, "jabatanPerwakilan", e.target.value)}
                                className="text-xs h-7 bg-white"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs italic">-</span>
                          )}
                        </TableCell>

                        {/* Catatan / Keterangan */}
                        <TableCell className="text-xs">
                          <Input
                            placeholder="Catatan..."
                            value={p.keterangan || ""}
                            onChange={(e) => handlePerwakilanChange(p.id, "keterangan", e.target.value)}
                            className="text-xs h-8"
                          />
                        </TableCell>

                        {/* Hapus */}
                        <TableCell className="text-right text-xs">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePeserta(p.id, p.nama)}
                            className="h-7 w-7 p-0 text-slate-300 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Info & Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-slate-500">
              Data dapat diubah dan disimpan berkali-kali. Pastikan klik Simpan untuk menyimpan status dan tautan drive.
            </span>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Simpan Perubahan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Cetak & Tambah */}
      <CetakModal
        isOpen={isCetakOpen}
        onClose={() => setIsCetakOpen(false)}
        agenda={agenda}
      />

      <ModalTambahPeserta
        isOpen={isTambahOpen}
        onClose={() => setIsTambahOpen(false)}
        agendaId={agenda.id}
        allPegawai={allPegawai}
        existingPegawaiIds={pesertaList.map((p) => p.pegawaiId).filter(Boolean) as string[]}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
