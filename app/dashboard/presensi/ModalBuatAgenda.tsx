"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createAgendaAbsensi } from "@/app/actions/absensi";
import { calculatePresensiWindow, formatWita } from "@/lib/date-utils";
import {
  Loader2,
  CalendarPlus,
  Clock,
  MapPin,
  Camera,
  Users,
  Search,
  CheckCheck,
  UserCheck,
  RotateCcw,
  Sparkles,
  LogOut,
} from "lucide-react";

type PegawaiMaster = {
  id: string;
  nip: string | null;
  nama: string;
  jabatan: string;
  instansi: string;
  eselon: string | null;
  wajibAbsenOpd: boolean;
};

export default function ModalBuatAgenda({
  isOpen,
  onClose,
  totalPejabatTerdaftar = 0,
  allPegawai = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  totalPejabatTerdaftar?: number;
  allPegawai?: PegawaiMaster[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const todayStr = formatWita(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    namaKegiatan: "",
    tanggal: todayStr,
    hari: "Senin",
    jamMulai: "09:00",
    jamSelesai: "",
    waktu: "09:00 WITA",
    tempat: "",
    deskripsi: "",
    jamBuka: "08:00",
    jamTutup: "13:00",
    enableCheckOut: false,
    requireLocation: true,
    requirePhoto: true,
    allowNonPeserta: true,
  });

  // State Seleksi Pegawai
  const [selectedPesertaIds, setSelectedPesertaIds] = useState<string[]>([]);
  const [pegawaiSearch, setPegawaiSearch] = useState("");
  const [filterEselon, setFilterEselon] = useState<string>("ALL");
  const [displayLimit, setDisplayLimit] = useState(60);

  // Inisialisasi: Semua pegawai terbinding (wajibAbsenOpd === true) otomatis tercentang sebagai rekomendasi default
  useEffect(() => {
    if (isOpen) {
      const defaultRecommendedIds = allPegawai
        .filter((p) => p.wajibAbsenOpd)
        .map((p) => p.id);
      setSelectedPesertaIds(defaultRecommendedIds);
      setDisplayLimit(60);
      setPegawaiSearch("");
      setFilterEselon("ALL");
    }
  }, [isOpen, allPegawai]);

  useEffect(() => {
    setDisplayLimit(60);
  }, [pegawaiSearch, filterEselon]);

  // Filter pegawai untuk panel seleksi
  const filteredPegawai = useMemo(() => {
    const q = pegawaiSearch.toLowerCase().trim();
    return allPegawai.filter((p) => {
      const matchSearch =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q) ||
        p.instansi.toLowerCase().includes(q) ||
        (p.nip && p.nip.includes(q));

      if (!matchSearch) return false;

      const eselonLower = (p.eselon || "").toLowerCase();
      if (filterEselon === "I") return eselonLower.startsWith("i.") || eselonLower === "i";
      if (filterEselon === "II") return eselonLower.startsWith("ii.") || eselonLower === "ii";
      if (filterEselon === "III") return eselonLower.startsWith("iii.") || eselonLower === "iii";
      if (filterEselon === "IV") return eselonLower.startsWith("iv.") || eselonLower === "iv";
      if (filterEselon === "OTHER") {
        return !p.eselon || eselonLower === "non_eselon" || eselonLower === "lainnya";
      }
      return true;
    });
  }, [allPegawai, pegawaiSearch, filterEselon]);

  const visiblePegawai = useMemo(() => {
    return filteredPegawai.slice(0, displayLimit);
  }, [filteredPegawai, displayLimit]);

  const recommendedPegawaiCount = useMemo(() => {
    return allPegawai.filter((p) => p.wajibAbsenOpd).length;
  }, [allPegawai]);

  const handleScrollPegawai = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setDisplayLimit((prev) => Math.min(prev + 50, filteredPegawai.length));
    }
  };

  const togglePesertaSelect = (id: string) => {
    setSelectedPesertaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredPegawai.map((p) => p.id);
    const allFilteredSelected = filteredIds.every((id) => selectedPesertaIds.includes(id));
    if (allFilteredSelected) {
      setSelectedPesertaIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedPesertaIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectAllRecommended = () => {
    const recommendedIds = allPegawai.filter((p) => p.wajibAbsenOpd).map((p) => p.id);
    setSelectedPesertaIds((prev) => Array.from(new Set([...prev, ...recommendedIds])));
  };

  const handleClearAllSelected = () => {
    setSelectedPesertaIds([]);
  };

  const handleDateChange = (val: string) => {
    try {
      const d = new Date(val);
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const computedDay = days[d.getDay()] || "Senin";
      setForm((prev) => ({ ...prev, tanggal: val, hari: computedDay }));
    } catch {
      setForm((prev) => ({ ...prev, tanggal: val }));
    }
  };

  const handleJamMulaiChange = (newMulai: string) => {
    const windowTimes = calculatePresensiWindow(newMulai, form.jamSelesai);
    const formattedWaktu = `${newMulai}${form.jamSelesai ? ` - ${form.jamSelesai}` : ""} WITA`;
    setForm((prev) => ({
      ...prev,
      jamMulai: newMulai,
      waktu: formattedWaktu,
      jamBuka: windowTimes.jamBuka,
      jamTutup: prev.enableCheckOut ? (prev.jamSelesai ? prev.jamSelesai : "18:00") : windowTimes.jamTutup,
    }));
  };

  const handleJamSelesaiChange = (newSelesai: string) => {
    const windowTimes = calculatePresensiWindow(form.jamMulai, newSelesai);
    const formattedWaktu = `${form.jamMulai}${newSelesai ? ` - ${newSelesai}` : ""} WITA`;
    setForm((prev) => ({
      ...prev,
      jamSelesai: newSelesai,
      waktu: formattedWaktu,
      jamTutup: prev.enableCheckOut ? (newSelesai ? newSelesai : "18:00") : windowTimes.jamTutup,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaKegiatan.trim() || !form.tempat.trim() || !form.tanggal) {
      toast.error("Nama kegiatan, tanggal, dan tempat wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const created = await createAgendaAbsensi({
        namaKegiatan: form.namaKegiatan,
        tanggal: form.tanggal,
        hari: form.hari,
        waktu: form.waktu,
        tempat: form.tempat,
        deskripsi: form.deskripsi,
        jamBuka: form.jamBuka,
        jamTutup: form.jamTutup,
        enableCheckOut: form.enableCheckOut,
        requireLocation: form.requireLocation,
        requirePhoto: form.requirePhoto,
        allowNonPeserta: form.allowNonPeserta,
        pesertaIds: selectedPesertaIds,
      });

      toast.success(
        `Agenda berhasil dibuat dengan ${selectedPesertaIds.length} peserta terdaftar`
      );
      onClose();
      router.push(`/dashboard/presensi/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat agenda");
    } finally {
      setLoading(false);
    }
  };

  const allFilteredSelected =
    filteredPegawai.length > 0 &&
    filteredPegawai.every((p) => selectedPesertaIds.includes(p.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-full max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900">
            <CalendarPlus className="w-5 h-5 text-indigo-600" />
            Buat Agenda Absensi Baru (Self-Input & Manual)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Atur informasi agenda rapat/kegiatan serta tentukan daftar pegawai yang diundang mengisi absensi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 pt-3">
          {/* Main 2-Column Responsive Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-y-auto pr-1">
            
            {/* ── SISI KIRI (KOLOM 1): INFORMASI AGENDA & PENGATURAN (Col 6) ── */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Nama / Perihal Kegiatan <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Contoh: Rapat Koordinasi Evaluasi Kinerja Triwulan II"
                  value={form.namaKegiatan}
                  onChange={(e) => setForm({ ...form, namaKegiatan: e.target.value })}
                  className="mt-1 text-xs h-9 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Tanggal Pelaksanaan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={form.tanggal}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Hari</Label>
                  <Input
                    value={form.hari}
                    onChange={(e) => setForm({ ...form, hari: e.target.value })}
                    placeholder="Contoh: Senin"
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Tempat Pelaksanaan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="Contoh: Gedung ATJ / Ruang Rapat"
                    value={form.tempat}
                    onChange={(e) => setForm({ ...form, tempat: e.target.value })}
                    className="mt-1 text-xs h-9 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Waktu Acara (WITA)
                    </Label>
                    <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                      {form.waktu}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <Input
                        type="time"
                        required
                        value={form.jamMulai}
                        onChange={(e) => handleJamMulaiChange(e.target.value)}
                        className="text-xs bg-white h-9 font-medium"
                        title="Jam Mulai Acara"
                      />
                      <span className="text-[10px] text-slate-400">Mulai</span>
                    </div>
                    <div>
                      <Input
                        type="time"
                        value={form.jamSelesai}
                        onChange={(e) => handleJamSelesaiChange(e.target.value)}
                        className="text-xs bg-white h-9 font-medium"
                        title="Jam Selesai (Opsional)"
                      />
                      <span className="text-[10px] text-slate-400">Selesai (Opsional)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RENTANG WAKTU PENGISIAN ABSEN (TIME WINDOW) */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Rentang Waktu Presensi (WITA)</span>
                  </div>
                  <span className="text-[9.5px] text-indigo-700 font-semibold bg-white border border-indigo-200 px-1.5 py-0.2 rounded">
                    H-1 Jam s/d Selesai
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[10.5px] font-semibold text-slate-700">
                      Buka Presensi:
                    </Label>
                    <Input
                      type="time"
                      required
                      value={form.jamBuka}
                      onChange={(e) => setForm({ ...form, jamBuka: e.target.value })}
                      className="mt-0.5 text-xs bg-white h-8 font-semibold"
                    />
                  </div>

                  <div>
                    <Label className="text-[10.5px] font-semibold text-slate-700">
                      Tutup Presensi:
                    </Label>
                    <Input
                      type="time"
                      required
                      value={form.jamTutup}
                      onChange={(e) => setForm({ ...form, jamTutup: e.target.value })}
                      className="mt-0.5 text-xs bg-white h-8 font-semibold"
                    />
                  </div>
                </div>

                {/* TOGGLE PRESENSI PULANG */}
                <div className="pt-2 border-t border-indigo-100">
                  <label className="flex items-start justify-between cursor-pointer gap-2">
                    <div className="flex items-start gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 text-[11px] block">
                          Aktifkan Presensi Pulang (Check-out)
                        </span>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Peserta dapat mengirim foto kepulangan saat acara selesai.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.enableCheckOut}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setForm((prev) => {
                          let newJamTutup = prev.jamTutup;
                          if (isChecked && prev.jamTutup < "17:00") {
                            newJamTutup = prev.jamSelesai ? prev.jamSelesai : "18:00";
                          }
                          return {
                            ...prev,
                            enableCheckOut: isChecked,
                            jamTutup: newJamTutup,
                          };
                        });
                      }}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 mt-0.5"
                    />
                  </label>
                </div>
              </div>

              {/* OPSI VALIDASI GEOTAG, FOTO, & PESERTA LUAR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requirePhoto}
                    onChange={(e) => setForm({ ...form, requirePhoto: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                      <Camera className="w-3 h-3 text-indigo-600" />
                      Foto Selfie
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requireLocation}
                    onChange={(e) => setForm({ ...form, requireLocation: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-indigo-600" />
                      Kunci GPS
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowNonPeserta}
                    onChange={(e) => setForm({ ...form, allowNonPeserta: e.target.checked })}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                      <Users className="w-3 h-3 text-indigo-600" />
                      Peserta Luar
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Catatan / Deskripsi Agenda (Opsional)</Label>
                <Textarea
                  placeholder="Tambahkan catatan khusus untuk agenda ini jika diperlukan..."
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  rows={2}
                  className="mt-1 text-xs bg-white"
                />
              </div>
            </div>

            {/* ── SISI KANAN (KOLOM 2): SELEKTOR PEGAWAI (GAYA BULK INSERT) (Col 6) ── */}
            <div className="lg:col-span-6 flex flex-col min-h-[350px] border border-slate-200/80 rounded-xl bg-slate-50/40 overflow-hidden">
              
              {/* Header Box Seleksi */}
              <div className="p-3 bg-white border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Pegawai yang Diundang
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-indigo-600">
                      {selectedPesertaIds.length}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      / {allPegawai.length} Terpilih
                    </span>
                  </div>
                </div>

                {/* Pencarian dan Filter Eselon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Cari nama, jabatan, atau OPD..."
                      value={pegawaiSearch}
                      onChange={(e) => setPegawaiSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-white"
                    />
                  </div>

                  <div>
                    <Select
                      value={filterEselon}
                      onValueChange={(val) => setFilterEselon(val || "ALL")}
                    >
                      <SelectTrigger className="text-xs h-8 bg-white">
                        <SelectValue placeholder="Eselon" />
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

                {/* Tombol Opsi Cepat */}
                <div className="flex items-center justify-between pt-1 gap-1 flex-wrap text-[11px]">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-filtered"
                      checked={allFilteredSelected}
                      onCheckedChange={handleSelectAllFiltered}
                    />
                    <Label
                      htmlFor="select-filtered"
                      className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                    >
                      Pilih Semua Hasil Filter ({filteredPegawai.length})
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllRecommended}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
                      title="Centang semua pegawai rekomendasi wajib absen OPD"
                    >
                      <Sparkles className="w-3 h-3" />
                      Semua Rekomendasi ({recommendedPegawaiCount})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllSelected}
                      className="text-slate-400 hover:text-red-600 font-medium cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>
              </div>

              {/* List Pegawai Scrollable dengan Lazy Loading */}
              <div
                onScroll={handleScrollPegawai}
                className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto divide-y divide-slate-100 bg-white/70"
              >
                {filteredPegawai.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada data pegawai yang sesuai dengan filter pencarian
                  </div>
                ) : (
                  <>
                    {visiblePegawai.map((p) => {
                      const isSelected = selectedPesertaIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => togglePesertaSelect(p.id)}
                          className={`p-2.5 text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                            isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePesertaSelect(p.id)}
                            className="mt-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900 text-xs">
                                {p.nama}
                              </span>
                              {p.eselon && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 border-slate-300 text-slate-500 font-medium"
                                >
                                  Eselon {p.eselon}
                                </Badge>
                              )}
                              {p.wajibAbsenOpd && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 bg-emerald-50 border-emerald-200 text-emerald-700 font-medium"
                                >
                                  Rekomendasi
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] truncate mt-0.5">
                              {p.jabatan}
                            </p>
                            <p className="text-slate-400 text-[10px] truncate">
                              {p.instansi}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {/* Lazy load scroll indicator */}
                    {displayLimit < filteredPegawai.length && (
                      <div className="p-2 text-center text-[10.5px] text-slate-400 flex items-center justify-center gap-1.5 bg-slate-50/60">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        <span>Menampilkan {visiblePegawai.length} dari {filteredPegawai.length} pegawai (gulir untuk memuat)...</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Dialog Footer */}
          <div className="shrink-0 flex items-center justify-between pt-3 mt-3 border-t">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold py-1 px-2.5">
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                {selectedPesertaIds.length} Pegawai Siap Diundang
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-1" />}
                Buat Agenda & Buka Link
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
