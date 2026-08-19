"use client";

import { useState } from "react";
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
import { createAgendaAbsensi } from "@/app/actions/absensi";
import { calculatePresensiWindow } from "@/lib/date-utils";
import { Loader2, CalendarPlus, Info, Clock, MapPin, Camera, Users, ShieldCheck, LogOut } from "lucide-react";
import Link from "next/link";

export default function ModalBuatAgenda({
  isOpen,
  onClose,
  totalPejabatTerdaftar = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalPejabatTerdaftar?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    namaKegiatan: "",
    tanggal: todayStr,
    hari: "Senin",
    jamMulai: "09:00",
    jamSelesai: "",
    waktu: "09:00 WITA",
    tempat: "",
    deskripsi: "",
    targetPeserta: "Seluruh Perangkat Daerah / Pegawai",
    targetKategori: "SEMUA_OPD",
    jamBuka: "08:00",
    jamTutup: "13:00",
    enableCheckOut: false,
    requireLocation: true,
    requirePhoto: true,
    allowNonPeserta: true,
  });

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

  const handleTargetKategoriChange = (kat: string) => {
    let targetLabel = "Seluruh Perangkat Daerah / Pegawai";
    if (kat === "SEMUA_OPD") targetLabel = "Seluruh Perangkat Daerah / Pegawai";
    else if (kat === "ESELON_2_3") targetLabel = "OPD Utama (Eselon II & III)";
    else if (kat === "ESELON_2") targetLabel = "Khusus Pegawai Eselon II (Kepala OPD)";
    else if (kat === "ESELON_3") targetLabel = "Khusus Pegawai Eselon III (Sekretaris / Kabid)";
    else if (kat === "KECAMATAN") targetLabel = "Camat dan Perangkat Kecamatan";

    setForm((prev) => ({
      ...prev,
      targetKategori: kat,
      targetPeserta: targetLabel,
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
        targetPeserta: form.targetPeserta,
        targetKategori: form.targetKategori,
        jamBuka: form.jamBuka,
        jamTutup: form.jamTutup,
        enableCheckOut: form.enableCheckOut,
        requireLocation: form.requireLocation,
        requirePhoto: form.requirePhoto,
        allowNonPeserta: form.allowNonPeserta,
      });

      toast.success("Agenda kegiatan berhasil dibuat dengan tautan presensi publik");
      onClose();
      router.push(`/dashboard/absensi/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat agenda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[92vh] overflow-y-auto" style={{ maxWidth: "850px" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <CalendarPlus className="w-5 h-5 text-indigo-600" />
            Buat Agenda Absensi Baru (Self-Input & Manual)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Agenda baru akan menghasilkan tautan presensi mandiri online beserta QR Code untuk dibagikan ke peserta rapat.
          </DialogDescription>
        </DialogHeader>

        {totalPejabatTerdaftar === 0 && (
          <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-lg flex items-start gap-2.5 text-xs text-amber-800 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Belum ada Pegawai yang ditetapkan!</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Silakan lakukan penetapan data dari Master Pegawai terlebih dahulu agar nama pegawai OPD otomatis terisi pada agenda ini.
              </p>
              <Link
                href="/dashboard/absensi/pejabat"
                onClick={onClose}
                className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline mt-1.5"
              >
                Kelola Pegawai &rarr;
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Nama / Perihal Kegiatan <span className="text-red-500">*</span>
            </Label>
            <Input
              required
              placeholder="Contoh: Rapat Koordinasi Evaluasi Kinerja Triwulan II"
              value={form.namaKegiatan}
              onChange={(e) => setForm({ ...form, namaKegiatan: e.target.value })}
              className="mt-1 text-xs"
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
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Hari</Label>
              <Input
                value={form.hari}
                onChange={(e) => setForm({ ...form, hari: e.target.value })}
                placeholder="Contoh: Senin"
                className="mt-1 text-xs"
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
                placeholder="Contoh: Gedung Aji Tulur Jejangkat"
                value={form.tempat}
                onChange={(e) => setForm({ ...form, tempat: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Waktu Acara (WITA)
                </Label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
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
                  <span className="text-[10px] text-slate-500">Mulai</span>
                </div>
                <div>
                  <Input
                    type="time"
                    value={form.jamSelesai}
                    onChange={(e) => handleJamSelesaiChange(e.target.value)}
                    className="text-xs bg-white h-9 font-medium"
                    title="Jam Selesai (Opsional)"
                  />
                  <span className="text-[10px] text-slate-500">Selesai (Opsional)</span>
                </div>
              </div>
            </div>
          </div>

          {/* RENTANG WAKTU PENGISIAN ABSEN (TIME WINDOW) & PRESENSI PULANG */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Rentang Waktu Presensi Mandiri (WITA)</span>
              </div>
              <span className="text-[10px] text-indigo-700 font-semibold bg-white/90 border border-indigo-200 px-2 py-0.5 rounded-full">
                Otomatis: H-1 Jam s/d H+4 Jam
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Form presensi publik otomatis dibuka 1 jam sebelum acara (H-1) dan ditutup setelah acara selesai. Anda tetap dapat menyesuaikan jam jika diperlukan.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Jam Buka Presensi (WITA):
                </Label>
                <Input
                  type="time"
                  required
                  value={form.jamBuka}
                  onChange={(e) => setForm({ ...form, jamBuka: e.target.value })}
                  className="mt-1 text-xs bg-white font-semibold"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Jam Tutup Presensi (WITA):
                </Label>
                <Input
                  type="time"
                  required
                  value={form.jamTutup}
                  onChange={(e) => setForm({ ...form, jamTutup: e.target.value })}
                  className="mt-1 text-xs bg-white font-semibold"
                />
              </div>
            </div>

            {/* TOGGLE PRESENSI PULANG (DALAM SATU KONTEKS WAKTU) */}
            <div className="pt-2.5 border-t border-indigo-100/80">
              <label className="flex items-start justify-between cursor-pointer gap-3">
                <div className="flex items-start gap-2">
                  <LogOut className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      Aktifkan Presensi Pulang (Check-out)
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      Peserta yang telah absen Datang dapat membuka kembali link/QR untuk mengirim presensi kepulangan saat acara selesai.
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
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 mt-0.5"
                />
              </label>
            </div>
          </div>

          {/* FILTER & GENERALISASI TARGET BINDING */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Target Kategori Binding Pegawai
              </Label>
              <select
                value={form.targetKategori}
                onChange={(e) => handleTargetKategoriChange(e.target.value)}
                className="mt-1 w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="SEMUA_OPD">Semua / Seluruh Perangkat Daerah & Pegawai</option>
                <option value="ESELON_2_3">OPD Utama (Eselon II & III)</option>
                <option value="ESELON_2">Khusus Eselon II (Kepala OPD)</option>
                <option value="ESELON_3">Khusus Eselon III (Sekretaris/Kabid)</option>
                <option value="KECAMATAN">Kecamatan se-Kutai Barat</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Label Target Peserta (Kop)
              </Label>
              <Input
                placeholder="Contoh: Eselon II.b dan III.a"
                value={form.targetPeserta}
                onChange={(e) => setForm({ ...form, targetPeserta: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* OPSI VALIDASI GEOTAG, FOTO, & PESERTA LUAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requirePhoto}
                onChange={(e) => setForm({ ...form, requirePhoto: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  Wajib Foto Selfie
                </span>
                <p className="text-[10px] text-slate-500">Bukti kehadiran visual</p>
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
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Wajib Kunci GPS
                </span>
                <p className="text-[10px] text-slate-500">Verifikasi di lokasi</p>
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
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Izinkan Peserta Luar
                </span>
                <p className="text-[10px] text-slate-500">Nama tidak di daftar</p>
              </div>
            </label>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Keterangan / Catatan Agenda (Opsional)</Label>
            <Textarea
              placeholder="Tambahkan catatan khusus untuk agenda ini jika diperlukan..."
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              rows={2}
              className="mt-1 text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-[11px] text-slate-400">
              {totalPejabatTerdaftar} pegawai terdaftar di sistem.
            </span>
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
