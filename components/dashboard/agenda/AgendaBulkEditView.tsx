"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table2,
  Plus,
  Trash2,
  Search,
  Filter,
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  CalendarDays,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { KategoriAgenda, StatusAgenda } from "@prisma/client";
import { bulkSaveAgendas, type AgendaItemDTO } from "@/app/actions/agenda";

interface EditableRow {
  tempKey: string;
  id?: string; // id asli jika update, undefined jika baru
  judul: string;
  kategori: KategoriAgenda;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  waktuMulai: string; // HH:mm
  waktuSelesai: string; // HH:mm
  lokasi: string;
  deskripsi: string;
  pic: string;
  status: StatusAgenda;
  isNew?: boolean;
}

const KATEGORI_OPTIONS: { value: KategoriAgenda; label: string; color: string }[] = [
  { value: "RAPAT", label: "Rapat", color: "bg-blue-50 text-blue-700 border-blue-200" },
  {
    value: "PERJALANAN_DINAS",
    label: "Perjalanan Dinas",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    value: "SOSIALISASI",
    label: "Sosialisasi / Bimtek",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "MONITORING_EVALUASI",
    label: "Monev",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "ACARA_INTERNAL",
    label: "Acara Internal",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  { value: "PENGINGAT", label: "Pengingat", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "LAINNYA", label: "Lainnya", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

const STATUS_OPTIONS: { value: StatusAgenda; label: string; color: string }[] = [
  { value: "DIRENCANAKAN", label: "Direncanakan", color: "text-blue-700 bg-blue-50" },
  { value: "BERLANGSUNG", label: "Sedang Berlangsung", color: "text-amber-700 bg-amber-50" },
  { value: "SELESAI", label: "Selesai", color: "text-emerald-700 bg-emerald-50" },
  { value: "DIBATALKAN", label: "Dibatalkan", color: "text-slate-500 bg-slate-100" },
];

export interface AgendaBulkEditViewProps {
  initialAgendas: AgendaItemDTO[];
}

export function AgendaBulkEditView({ initialAgendas }: AgendaBulkEditViewProps) {
  // Hanya ambil agenda manual yang bukan read-only SPJ
  const initialEditableRows = useMemo(() => {
    return initialAgendas
      .filter((a) => !a.isReadOnly && a.sourceType !== "SPJ_PERJADIN")
      .map((a) => ({
        tempKey: a.id,
        id: a.id,
        judul: a.judul,
        kategori: a.kategori,
        tanggalMulai: a.tanggalMulai.split("T")[0],
        tanggalSelesai: a.tanggalSelesai ? a.tanggalSelesai.split("T")[0] : "",
        waktuMulai: a.waktuMulai || "",
        waktuSelesai: a.waktuSelesai || "",
        lokasi: a.lokasi || "",
        deskripsi: a.deskripsi || "",
        pic: a.pic || "",
        status: a.status,
      }));
  }, [initialAgendas]);

  const [rows, setRows] = useState<EditableRow[]>(initialEditableRows);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [search, setSearch] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [filterKategori, setFilterKategori] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // Hitung jumlah baris yang dimodifikasi
  const dirtyCount = useMemo(() => {
    let count = 0;
    const initialMap = new Map(initialEditableRows.map((r) => [r.id, r]));

    for (const r of rows) {
      if (r.isNew) {
        if (r.judul.trim() || r.tanggalMulai) count++;
      } else if (r.id) {
        const orig = initialMap.get(r.id);
        if (
          orig &&
          (orig.judul !== r.judul ||
            orig.kategori !== r.kategori ||
            orig.tanggalMulai !== r.tanggalMulai ||
            orig.tanggalSelesai !== r.tanggalSelesai ||
            orig.waktuMulai !== r.waktuMulai ||
            orig.waktuSelesai !== r.waktuSelesai ||
            orig.lokasi !== r.lokasi ||
            orig.deskripsi !== r.deskripsi ||
            orig.pic !== r.pic ||
            orig.status !== r.status)
        ) {
          count++;
        }
      }
    }

    count += deletedIds.length;
    return count;
  }, [rows, deletedIds, initialEditableRows]);

  // Tambah baris baru di posisi paling atas tabel
  const handleAddRow = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const newRow: EditableRow = {
      tempKey: `new-${Date.now()}-${Math.random()}`,
      judul: "",
      kategori: "RAPAT",
      tanggalMulai: filterMonth ? `${filterMonth}-01` : todayStr,
      tanggalSelesai: filterMonth ? `${filterMonth}-01` : todayStr,
      waktuMulai: "09:00",
      waktuSelesai: "12:00",
      lokasi: "",
      deskripsi: "",
      pic: "",
      status: "DIRENCANAKAN",
      isNew: true,
    };
    setRows((prev) => [newRow, ...prev]);
  };

  // Edit sel langsung
  const handleCellChange = <K extends keyof EditableRow>(
    tempKey: string,
    field: K,
    value: EditableRow[K]
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.tempKey !== tempKey) return r;
        const updated = { ...r, [field]: value };
        // Validasi otomatis tanggal selesai tidak boleh lebih awal dari tanggal mulai
        if (field === "tanggalMulai" && updated.tanggalSelesai && updated.tanggalSelesai < (value as string)) {
          updated.tanggalSelesai = value as string;
        }
        return updated;
      })
    );
  };

  // Tandai hapus baris
  const handleToggleDelete = (row: EditableRow) => {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r.tempKey !== row.tempKey));
      return;
    }

    if (!row.id) return;
    if (deletedIds.includes(row.id)) {
      setDeletedIds((prev) => prev.filter((id) => id !== row.id));
    } else {
      setDeletedIds((prev) => [...prev, row.id!]);
    }
  };

  // Reset perubahan ke state awal
  const handleReset = () => {
    if (dirtyCount > 0 && !confirm("Batalkan semua perubahan dan kembalikan ke data awal?")) {
      return;
    }
    setRows(initialEditableRows);
    setDeletedIds([]);
  };

  // Filter baris untuk ditampilkan di tabel
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Filter Pencarian
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchJudul = r.judul.toLowerCase().includes(q);
        const matchPic = r.pic.toLowerCase().includes(q);
        const matchLokasi = r.lokasi.toLowerCase().includes(q);
        if (!matchJudul && !matchPic && !matchLokasi) return false;
      }

      // Filter Kategori
      if (filterKategori !== "ALL" && r.kategori !== filterKategori) {
        return false;
      }

      // Filter Bulan Mulai
      if (filterMonth) {
        if (!r.tanggalMulai.startsWith(filterMonth)) {
          return false;
        }
      }

      return true;
    });
  }, [rows, search, filterKategori, filterMonth]);

  // Simpan perubahan ke database
  const handleSaveAll = () => {
    // Validasi baris: judul dan tanggalMulai wajib diisi
    for (const r of rows) {
      if (deletedIds.includes(r.id || "")) continue;
      if (r.isNew && !r.judul.trim()) {
        continue; // Lewati baris baru yang masih kosong
      }
      if (!r.judul.trim()) {
        toast.error("Nama/Judul kegiatan tidak boleh kosong.");
        return;
      }
      if (!r.tanggalMulai) {
        toast.error(`Tanggal mulai untuk "${r.judul}" tidak boleh kosong.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const creates = rows
          .filter((r) => r.isNew && r.judul.trim())
          .map((r) => ({
            judul: r.judul.trim(),
            kategori: r.kategori,
            tanggalMulai: r.tanggalMulai,
            tanggalSelesai: r.tanggalSelesai || null,
            waktuMulai: r.waktuMulai || null,
            waktuSelesai: r.waktuSelesai || null,
            lokasi: r.lokasi || null,
            deskripsi: r.deskripsi || null,
            pic: r.pic || null,
            status: r.status,
          }));

        const initialMap = new Map(initialEditableRows.map((r) => [r.id, r]));
        const updates = rows
          .filter((r) => !r.isNew && r.id && !deletedIds.includes(r.id))
          .filter((r) => {
            if (!r.id) return false;
            const orig = initialMap.get(r.id);
            if (!orig) return false;
            return (
              orig.judul !== r.judul ||
              orig.kategori !== r.kategori ||
              orig.tanggalMulai !== r.tanggalMulai ||
              orig.tanggalSelesai !== r.tanggalSelesai ||
              orig.waktuMulai !== r.waktuMulai ||
              orig.waktuSelesai !== r.waktuSelesai ||
              orig.lokasi !== r.lokasi ||
              orig.deskripsi !== r.deskripsi ||
              orig.pic !== r.pic ||
              orig.status !== r.status
            );
          })
          .map((r) => ({
            id: r.id!,
            judul: r.judul.trim(),
            kategori: r.kategori,
            tanggalMulai: r.tanggalMulai,
            tanggalSelesai: r.tanggalSelesai || null,
            waktuMulai: r.waktuMulai || null,
            waktuSelesai: r.waktuSelesai || null,
            lokasi: r.lokasi || null,
            deskripsi: r.deskripsi || null,
            pic: r.pic || null,
            status: r.status,
          }));

        const res = await bulkSaveAgendas({
          creates,
          updates,
          deletes: deletedIds,
        });

        if (res.success) {
          toast.success(res.message || "Perubahan agenda berhasil disimpan!");
          // Sinkronisasi data lokal
          setDeletedIds([]);
          const freshAgendas = (res.allAgendas || []) as AgendaItemDTO[];
          const refreshed = freshAgendas
            .filter((a) => !a.isReadOnly && a.sourceType !== "SPJ_PERJADIN")
            .map((a) => ({
              tempKey: a.id,
              id: a.id,
              judul: a.judul,
              kategori: a.kategori,
              tanggalMulai: a.tanggalMulai.split("T")[0],
              tanggalSelesai: a.tanggalSelesai ? a.tanggalSelesai.split("T")[0] : "",
              waktuMulai: a.waktuMulai || "",
              waktuSelesai: a.waktuSelesai || "",
              lokasi: a.lokasi || "",
              deskripsi: a.deskripsi || "",
              pic: a.pic || "",
              status: a.status,
            }));
          setRows(refreshed);
        } else {
          toast.error(res.message || "Gagal menyimpan perubahan.");
        }
      } catch (err: any) {
        toast.error(err.message || "Terjadi kesalahan sistem saat menyimpan.");
      }
    });
  };

  const initialMap = useMemo(
    () => new Map(initialEditableRows.map((r) => [r.id, r])),
    [initialEditableRows]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/agenda"
              className="inline-flex items-center justify-center rounded-lg h-8.5 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Kembali ke Kalender</span>
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Edit Cepat
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                  {filteredRows.length} Baris
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Kelola jadwal, ubah tanggal, jam, atau tambah kegiatan sekaligus layaknya sel Excel. Data SPJ diproteksi (read-only).
              </p>
            </div>
          </div>

          {/* Action Right: Reset & Simpan */}
          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isPending}
                className="h-8.5 text-xs font-medium gap-1 text-slate-600 hover:text-slate-900 bg-white border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({dirtyCount})</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleSaveAll}
              disabled={isPending || dirtyCount === 0}
              className="h-8.5 px-3.5 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Semua ({dirtyCount})</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 mt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari judul, lokasi, PIC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50/70 focus:bg-white border-slate-200"
              />
            </div>

            {/* Filter Bulan */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 h-8">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-none text-slate-700 font-medium cursor-pointer"
                title="Saring berdasarkan bulan mulai"
              />
              {filterMonth && (
                <button
                  type="button"
                  onClick={() => setFilterMonth("")}
                  className="text-[10px] text-slate-400 hover:text-slate-700 font-bold ml-1"
                  title="Lihat semua bulan"
                >
                  Semua
                </button>
              )}
            </div>

            {/* Filter Kategori */}
            <Select value={filterKategori} onValueChange={(val) => setFilterKategori(val || "ALL")}>
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-700 w-[145px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Kategori
                </SelectItem>
                {KATEGORI_OPTIONS.map((k) => (
                  <SelectItem key={k.value} value={k.value} className="text-xs">
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Tambah Baris */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddRow}
              className="h-8 text-xs font-semibold gap-1.5 bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Baru</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div className="flex-1 overflow-auto bg-white border-t border-slate-200">
        <Table className="w-full text-xs border-collapse">
          <TableHeader className="bg-slate-100/90 sticky top-0 z-20 shadow-xs backdrop-blur-sm">
            <TableRow className="border-b border-slate-300 hover:bg-slate-100/90 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
              <TableHead className="w-10 text-center py-2 border-r border-slate-200/80">#</TableHead>
              <TableHead className="min-w-[240px] py-2 border-r border-slate-200/80">
                Nama / Judul Kegiatan *
              </TableHead>
              <TableHead className="w-[145px] py-2 border-r border-slate-200/80">Kategori</TableHead>
              <TableHead className="w-[125px] py-2 border-r border-slate-200/80">Tgl Mulai *</TableHead>
              <TableHead className="w-[125px] py-2 border-r border-slate-200/80">Tgl Selesai</TableHead>
              <TableHead className="w-[85px] py-2 border-r border-slate-200/80">Mulai</TableHead>
              <TableHead className="w-[85px] py-2 border-r border-slate-200/80">Selesai</TableHead>
              <TableHead className="min-w-[140px] py-2 border-r border-slate-200/80">Lokasi</TableHead>
              <TableHead className="min-w-[130px] py-2 border-r border-slate-200/80">PIC</TableHead>
              <TableHead className="w-[135px] py-2 border-r border-slate-200/80">Status</TableHead>
              <TableHead className="w-12 text-center py-2">Hapus</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-64 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CalendarDays className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-medium text-slate-500">
                      Tidak ada kegiatan yang sesuai dengan filter.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRow}
                      className="text-xs gap-1 mt-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Kegiatan Baru Sekarang</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row, idx) => {
                const isMarkedDelete = deletedIds.includes(row.id || "");
                const orig = row.id ? initialMap.get(row.id) : undefined;
                const isRowModified =
                  !row.isNew &&
                  orig &&
                  (orig.judul !== row.judul ||
                    orig.kategori !== row.kategori ||
                    orig.tanggalMulai !== row.tanggalMulai ||
                    orig.tanggalSelesai !== row.tanggalSelesai ||
                    orig.waktuMulai !== row.waktuMulai ||
                    orig.waktuSelesai !== row.waktuSelesai ||
                    orig.lokasi !== row.lokasi ||
                    orig.deskripsi !== row.deskripsi ||
                    orig.pic !== row.pic ||
                    orig.status !== row.status);

                return (
                  <TableRow
                    key={row.tempKey}
                    className={`transition-colors border-b border-slate-200/80 hover:bg-blue-50/20 group/row ${
                      isMarkedDelete
                        ? "bg-rose-50/70 opacity-60 line-through text-rose-800"
                        : row.isNew
                        ? "bg-emerald-50/30"
                        : isRowModified
                        ? "bg-amber-50/40"
                        : ""
                    }`}
                  >
                    {/* Index Col */}
                    <TableCell className="p-0 text-center font-mono text-[10px] text-slate-400 border-r border-slate-200/80 select-none bg-slate-50/50">
                      <div className="py-2 flex items-center justify-center gap-0.5">
                        {row.isNew && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        {isRowModified && !row.isNew && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                        <span>{idx + 1}</span>
                      </div>
                    </TableCell>

                    {/* Judul Kegiatan (Cell Input) */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="text"
                        value={row.judul}
                        disabled={isMarkedDelete}
                        onChange={(e) => handleCellChange(row.tempKey, "judul", e.target.value)}
                        placeholder="Ketik nama kegiatan..."
                        className="w-full h-8 px-2 text-xs text-slate-800 font-medium bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white placeholder:text-slate-300"
                      />
                    </TableCell>

                    {/* Kategori (Cell Select) */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <select
                        value={row.kategori}
                        disabled={isMarkedDelete}
                        onChange={(e) =>
                          handleCellChange(
                            row.tempKey,
                            "kategori",
                            e.target.value as KategoriAgenda
                          )
                        }
                        className="w-full h-8 px-1.5 text-[11px] font-medium text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white cursor-pointer"
                      >
                        {KATEGORI_OPTIONS.map((k) => (
                          <option key={k.value} value={k.value}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>

                    {/* Tanggal Mulai (Cell Date) */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="date"
                        value={row.tanggalMulai}
                        disabled={isMarkedDelete}
                        onChange={(e) =>
                          handleCellChange(row.tempKey, "tanggalMulai", e.target.value)
                        }
                        className="w-full h-8 px-1.5 text-[11px] font-mono text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white cursor-pointer"
                      />
                    </TableCell>

                    {/* Tanggal Selesai (Cell Date) */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="date"
                        value={row.tanggalSelesai}
                        disabled={isMarkedDelete}
                        onChange={(e) =>
                          handleCellChange(row.tempKey, "tanggalSelesai", e.target.value)
                        }
                        className="w-full h-8 px-1.5 text-[11px] font-mono text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white cursor-pointer"
                      />
                    </TableCell>

                    {/* Jam Mulai (Cell Time) */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="time"
                        value={row.waktuMulai}
                        disabled={isMarkedDelete}
                        onChange={(e) =>
                          handleCellChange(row.tempKey, "waktuMulai", e.target.value)
                        }
                        className="w-full h-8 px-1 text-[11px] font-mono text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white text-center cursor-pointer"
                      />
                    </TableCell>

                    {/* Jam Selesai (Cell Time) */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="time"
                        value={row.waktuSelesai}
                        disabled={isMarkedDelete}
                        onChange={(e) =>
                          handleCellChange(row.tempKey, "waktuSelesai", e.target.value)
                        }
                        className="w-full h-8 px-1 text-[11px] font-mono text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white text-center cursor-pointer"
                      />
                    </TableCell>

                    {/* Lokasi */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="text"
                        value={row.lokasi}
                        disabled={isMarkedDelete}
                        onChange={(e) => handleCellChange(row.tempKey, "lokasi", e.target.value)}
                        placeholder="Ruang/Tempat"
                        className="w-full h-8 px-1.5 text-xs text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white placeholder:text-slate-300"
                      />
                    </TableCell>

                    {/* PIC */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <input
                        type="text"
                        value={row.pic}
                        disabled={isMarkedDelete}
                        onChange={(e) => handleCellChange(row.tempKey, "pic", e.target.value)}
                        placeholder="Nama PIC"
                        className="w-full h-8 px-1.5 text-xs text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white placeholder:text-slate-300"
                      />
                    </TableCell>

                    {/* Status */}
                    <TableCell className="p-0 border-r border-slate-200/80">
                      <select
                        value={row.status}
                        disabled={isMarkedDelete}
                        onChange={(e) =>
                          handleCellChange(
                            row.tempKey,
                            "status",
                            e.target.value as StatusAgenda
                          )
                        }
                        className="w-full h-8 px-1 text-[11px] font-medium text-slate-700 bg-transparent border-0 focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-white cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>

                    {/* Aksi Hapus */}
                    <TableCell className="p-0 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleDelete(row)}
                        title={
                          isMarkedDelete
                            ? "Batalkan penghapusan baris ini"
                            : "Tandai untuk dihapus"
                        }
                        className={`w-7 h-7 mx-auto rounded flex items-center justify-center transition-colors ${
                          isMarkedDelete
                            ? "text-blue-600 hover:bg-blue-100"
                            : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        }`}
                      >
                        {isMarkedDelete ? (
                          <RotateCcw className="w-3.5 h-3.5" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Status Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Baris Baru Ditambahkan</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Baris Telah Diubah</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Tandai Hapus</span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
            <span>Data SPJ Perjalanan Dinas otomatis terkunci di halaman ini.</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {dirtyCount > 0 ? (
            <span className="text-amber-700 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{dirtyCount} perubahan belum disimpan</span>
            </span>
          ) : (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Semua data tersinkron</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
