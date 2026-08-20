"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createAgendaAbsensi } from "@/app/actions/absensi";
import { calculatePresensiWindow, formatWita } from "@/lib/date-utils";
import {
  CalendarPlus,
  Clock,
  MapPin,
  Camera,
  Users,
  Search,
  Check,
  CheckCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Calendar,
  ShieldCheck,
  LogOut,
  Building2,
  CheckCircle2,
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

export default function AbsensiWizard({
  allPegawai = [],
}: {
  allPegawai: PegawaiMaster[];
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEselon, setFilterEselon] = useState<string>("ALL");
  const [displayLimit, setDisplayLimit] = useState(60);

  // Inisialisasi: Pegawai wajibAbsenOpd otomatis tercentang sebagai rekomendasi default
  useEffect(() => {
    const recommendedIds = allPegawai.filter((p) => p.wajibAbsenOpd).map((p) => p.id);
    setSelectedPesertaIds(recommendedIds);
  }, [allPegawai]);

  useEffect(() => {
    setDisplayLimit(60);
  }, [searchQuery, filterEselon]);

  // Filter pegawai
  const filteredPegawai = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
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
  }, [allPegawai, searchQuery, filterEselon]);

  const visiblePegawai = useMemo(() => {
    return filteredPegawai.slice(0, displayLimit);
  }, [filteredPegawai, displayLimit]);

  const recommendedCount = useMemo(() => {
    return allPegawai.filter((p) => p.wajibAbsenOpd).length;
  }, [allPegawai]);

  const handleScrollPegawai = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      setDisplayLimit((prev) => Math.min(prev + 50, filteredPegawai.length));
    }
  };

  const toggleSelectPegawai = (id: string) => {
    setSelectedPesertaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredPegawai.map((p) => p.id);
    const allSelected = filteredIds.every((id) => selectedPesertaIds.includes(id));
    if (allSelected) {
      setSelectedPesertaIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedPesertaIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectAllRecommended = () => {
    const recommendedIds = allPegawai.filter((p) => p.wajibAbsenOpd).map((p) => p.id);
    setSelectedPesertaIds((prev) => Array.from(new Set([...prev, ...recommendedIds])));
  };

  const handleClearSelection = () => {
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

  const handleNextToStep2 = () => {
    if (!form.namaKegiatan.trim()) {
      toast.error("Nama kegiatan wajib diisi");
      return;
    }
    if (!form.tempat.trim()) {
      toast.error("Tempat pelaksanaan wajib diisi");
      return;
    }
    if (!form.tanggal) {
      toast.error("Tanggal pelaksanaan wajib diisi");
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextToStep3 = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitFinal = async () => {
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

      toast.success(`Agenda berhasil diterbitkan dengan ${selectedPesertaIds.length} peserta terdaftar`);
      router.push(`/dashboard/absensi/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat agenda");
      setLoading(false);
    }
  };

  const allFilteredSelected =
    filteredPegawai.length > 0 &&
    filteredPegawai.every((p) => selectedPesertaIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* ── STEP INDICATOR BAR ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 cursor-pointer select-none transition-colors ${
              currentStep === 1 ? "text-indigo-600 font-bold" : "text-slate-500 font-medium"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 1
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-4 ring-indigo-50"
                  : currentStep > 1
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <div>
              <p className="text-xs">Langkah 1</p>
              <p className="text-[11px] text-slate-400 hidden sm:block">Informasi Kegiatan</p>
            </div>
          </div>

          <div className="flex-1 h-[2px] bg-slate-100 mx-4 max-w-[80px]" />

          {/* Step 2 */}
          <div
            onClick={() => {
              if (form.namaKegiatan.trim() && form.tempat.trim()) setCurrentStep(2);
            }}
            className={`flex items-center gap-3 cursor-pointer select-none transition-colors ${
              currentStep === 2 ? "text-indigo-600 font-bold" : "text-slate-500 font-medium"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 2
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-4 ring-indigo-50"
                  : currentStep > 2
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <div>
              <p className="text-xs">Langkah 2</p>
              <p className="text-[11px] text-slate-400 hidden sm:block">Pilih Peserta Diundang</p>
            </div>
          </div>

          <div className="flex-1 h-[2px] bg-slate-100 mx-4 max-w-[80px]" />

          {/* Step 3 */}
          <div
            onClick={() => {
              if (form.namaKegiatan.trim() && form.tempat.trim()) setCurrentStep(3);
            }}
            className={`flex items-center gap-3 cursor-pointer select-none transition-colors ${
              currentStep === 3 ? "text-indigo-600 font-bold" : "text-slate-500 font-medium"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-4 ring-indigo-50"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              3
            </div>
            <div>
              <p className="text-xs">Langkah 3</p>
              <p className="text-[11px] text-slate-400 hidden sm:block">Ringkasan & Terbitkan</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 1: INFORMASI KEGIATAN & PENGATURAN ── */}
      {currentStep === 1 && (
        <Card className="bg-white border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/40">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-indigo-600" />
              Langkah 1: Informasi Kegiatan & Pengaturan Presensi
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Isi nama agenda, waktu pelaksanaan WITA, lokasi acara, dan konfigurasi validasi foto/GPS.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* Baris 1: Nama Kegiatan (Full Width) */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Nama / Perihal Kegiatan <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                placeholder="Contoh: Rapat Koordinasi Evaluasi Kinerja Triwulan II"
                value={form.namaKegiatan}
                onChange={(e) => setForm({ ...form, namaKegiatan: e.target.value })}
                className="mt-1.5 text-xs h-10 bg-white font-medium focus:border-indigo-500"
              />
            </div>

            {/* Baris 2: Tanggal & Tempat (Maksimal 2 Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tanggal Pelaksanaan <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    Hari {form.hari}
                  </span>
                </div>
                <Input
                  type="date"
                  required
                  value={form.tanggal}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="mt-1.5 text-xs h-10 bg-white font-medium"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Tempat Pelaksanaan <span className="text-red-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="Contoh: Gedung ATJ / Ruang Rapat"
                  value={form.tempat}
                  onChange={(e) => setForm({ ...form, tempat: e.target.value })}
                  className="mt-1.5 text-xs h-10 bg-white font-medium"
                />
              </div>
            </div>

            {/* Baris 3: Waktu Acara & Rentang Presensi (2 Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Waktu Pelaksanaan Acara (WITA)</span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded">
                    {form.waktu}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <Label className="text-[10.5px] font-semibold text-slate-600">
                      Jam Mulai:
                    </Label>
                    <Input
                      type="time"
                      required
                      value={form.jamMulai}
                      onChange={(e) => handleJamMulaiChange(e.target.value)}
                      className="mt-1 text-xs bg-white h-9 font-semibold"
                      title="Jam Mulai Acara"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] font-semibold text-slate-600">
                      Jam Selesai (Opsional):
                    </Label>
                    <Input
                      type="time"
                      value={form.jamSelesai}
                      onChange={(e) => handleJamSelesaiChange(e.target.value)}
                      className="mt-1 text-xs bg-white h-9 font-semibold"
                      title="Jam Selesai (Opsional)"
                    />
                  </div>
                </div>
              </div>

              {/* RENTANG WAKTU PENGISIAN ABSEN (TIME WINDOW) */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Rentang Waktu Presensi Publik (WITA)</span>
                  </div>
                  <span className="text-[9.5px] text-indigo-700 font-semibold bg-white border border-indigo-200 px-1.5 py-0.5 rounded">
                    H-1 Jam s/d Selesai
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <Label className="text-[10.5px] font-semibold text-slate-700">
                      Buka Presensi:
                    </Label>
                    <Input
                      type="time"
                      required
                      value={form.jamBuka}
                      onChange={(e) => setForm({ ...form, jamBuka: e.target.value })}
                      className="mt-1 text-xs bg-white h-9 font-semibold"
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
                      className="mt-1 text-xs bg-white h-9 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Baris 4: Validasi Presensi & Presensi Pulang (2 Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Kiri: Opsi Validasi Foto & GPS */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Validasi Kehadiran Peserta</h4>
                <div className="space-y-2.5 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requirePhoto}
                      onChange={(e) => setForm({ ...form, requirePhoto: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        Wajib Foto Selfie Biometrik
                      </span>
                      <p className="text-[10.5px] text-slate-500">Verifikasi wajah peserta secara visual</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requireLocation}
                      onChange={(e) => setForm({ ...form, requireLocation: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        Wajib Kunci Lokasi GPS
                      </span>
                      <p className="text-[10.5px] text-slate-500">Memastikan peserta berada di tempat acara</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Kolom Kanan: Presensi Pulang & Peserta Luar */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Pengaturan Tambahan</h4>
                <div className="space-y-2.5 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
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
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <LogOut className="w-3.5 h-3.5 text-indigo-600" />
                        Aktifkan Presensi Pulang (Check-out)
                      </span>
                      <p className="text-[10.5px] text-slate-500">Peserta dapat absen pulang saat acara berakhir</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allowNonPeserta}
                      onChange={(e) => setForm({ ...form, allowNonPeserta: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        Izinkan Peserta Luar (Di Luar Undangan)
                      </span>
                      <p className="text-[10.5px] text-slate-500">Tamu yang tidak terdaftar tetap dapat mengisi presensi</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Baris 5: Catatan Agenda (Full Width) */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Catatan / Keterangan Agenda (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan khusus untuk agenda ini jika diperlukan..."
                value={form.deskripsi}
                onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                rows={2}
                className="mt-1.5 text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                onClick={handleNextToStep2}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-6 h-10 shadow-xs"
              >
                <span>Lanjut: Pilih Peserta Diundang</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: PILIH PEGAWAI / PESERTA YANG DIUNDANG (FULL-WIDTH SELEKTOR) ── */}
      {currentStep === 2 && (
        <Card className="bg-white border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Langkah 2: Pilih Pegawai / Pejabat yang Diundang
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Centang pegawai yang diundang. Pegawai berstatus rekomendasi OPD otomatis tercentang secara default.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold px-3 py-1.5">
                {selectedPesertaIds.length} dari {allPegawai.length} Pegawai Terpilih
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Filter & Action Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Cari nama pegawai, jabatan, NIP, atau OPD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs h-9.5 bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={filterEselon}
                  onValueChange={(val) => setFilterEselon(val || "ALL")}
                >
                  <SelectTrigger className="text-xs h-9.5 w-44 bg-white font-medium">
                    <SelectValue placeholder="Filter Eselon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Eselon / Staf</SelectItem>
                    <SelectItem value="I">Eselon I</SelectItem>
                    <SelectItem value="II">Eselon II (Kadis/Kaban)</SelectItem>
                    <SelectItem value="III">Eselon III (Kabid/Sek)</SelectItem>
                    <SelectItem value="IV">Eselon IV (Kasi/Kasubag)</SelectItem>
                    <SelectItem value="OTHER">Non-Eselon / Staf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Action Selection Bar */}
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="wizard-select-all"
                  checked={allFilteredSelected}
                  onCheckedChange={handleSelectAllFiltered}
                />
                <Label
                  htmlFor="wizard-select-all"
                  className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                >
                  Pilih Semua Hasil Filter ({filteredPegawai.length} Pegawai)
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllRecommended}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1.5 bg-indigo-50/70 hover:bg-indigo-100/70 px-2.5 py-1 rounded-md transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Semua Rekomendasi OPD ({recommendedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-slate-500 hover:text-red-600 font-medium cursor-pointer px-2 py-1"
                >
                  Kosongkan Pilihan
                </button>
              </div>
            </div>

            {/* Spacious Pegawai Table List with Lazy Loading */}
            <div
              onScroll={handleScrollPegawai}
              className="border border-slate-200/80 rounded-xl overflow-y-auto max-h-[480px] divide-y divide-slate-100 bg-white"
            >
              {filteredPegawai.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  Tidak ada data pegawai yang sesuai dengan filter pencarian
                </div>
              ) : (
                <>
                  {visiblePegawai.map((p, idx) => {
                    const isSelected = selectedPesertaIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectPegawai(p.id)}
                        className={`p-3 text-xs flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                          isSelected ? "bg-indigo-50/40 hover:bg-indigo-50/60" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectPegawai(p.id)}
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">
                                {p.nama}
                              </span>
                              {p.nip && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  NIP. {p.nip}
                                </span>
                              )}
                              {p.eselon && (
                                <Badge
                                  variant="outline"
                                  className="text-[9.5px] px-1.5 py-0 border-slate-300 text-slate-600 font-medium"
                                >
                                  Eselon {p.eselon}
                                </Badge>
                              )}
                              {p.wajibAbsenOpd && (
                                <Badge
                                  variant="outline"
                                  className="text-[9.5px] px-1.5 py-0 bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                                >
                                  Rekomendasi OPD
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-600 text-xs truncate mt-0.5">
                              {p.jabatan}
                            </p>
                            <p className="text-slate-400 text-[11px] truncate">
                              {p.instansi}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {isSelected ? "Diundang" : "Tidak Diundang"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Lazy load indicator */}
                  {displayLimit < filteredPegawai.length && (
                    <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2 bg-slate-50/60 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>Menampilkan {visiblePegawai.length} dari {filteredPegawai.length} pegawai (gulir ke bawah untuk memuat lagi)...</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Step 2 Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="text-xs h-10 px-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Kembali: Edit Informasi</span>
              </Button>

              <Button
                type="button"
                onClick={handleNextToStep3}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-5 h-10 shadow-xs"
              >
                <span>Lanjut: Ringkasan & Terbitkan</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: RINGKASAN & TERBITKAN AGENDA ── */}
      {currentStep === 3 && (
        <Card className="bg-white border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/40">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Langkah 3: Konfirmasi Ringkasan & Terbitkan Agenda
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Periksa kembali seluruh informasi sebelum agenda resmi diterbitkan dan tautan presensi diaktifkan.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box Info Agenda */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Detail Kegiatan
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Kegiatan:</span>
                    <span className="font-bold text-slate-900 text-sm">{form.namaKegiatan}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Tanggal & Hari:</span>
                      <span className="font-semibold text-slate-800">{form.hari}, {form.tanggal}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Waktu Acara:</span>
                      <span className="font-semibold text-indigo-700">{form.waktu}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tempat Pelaksanaan:</span>
                    <span className="font-semibold text-slate-800">{form.tempat}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Rentang Waktu Presensi:</span>
                    <span className="font-semibold text-slate-800">{form.jamBuka} s/d {form.jamTutup} WITA</span>
                  </div>
                </div>
              </div>

              {/* Box Info Peserta & Validasi */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Peserta & Pengaturan Presensi
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-100">
                    <span className="text-slate-600 font-medium">Total Pegawai Diundang:</span>
                    <span className="text-base font-black text-indigo-600">{selectedPesertaIds.length} Orang</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-semibold text-slate-700">
                        {form.requirePhoto ? "Wajib Foto Selfie" : "Tanpa Foto"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-semibold text-slate-700">
                        {form.requireLocation ? "Wajib Kunci GPS" : "Tanpa GPS"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-semibold text-slate-700">
                        {form.enableCheckOut ? "Presensi Pulang Aktif" : "Hanya Datang"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200/60 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span className="text-[11px] font-semibold text-slate-700">
                        {form.allowNonPeserta ? "Peserta Luar Diizinkan" : "Khusus Undangan"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Final Submit Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                disabled={loading}
                className="text-xs h-10 px-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Ubah Peserta</span>
              </Button>

              <Button
                type="button"
                onClick={handleSubmitFinal}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 h-11 shadow-md shadow-indigo-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Menerbitkan Agenda...</span>
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    <span>Terbitkan Agenda Absensi & Buka Link</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
