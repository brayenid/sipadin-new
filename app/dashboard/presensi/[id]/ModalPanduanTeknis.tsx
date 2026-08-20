"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapPin,
  ShieldCheck,
  Users,
  Compass,
  Calculator,
  ScanFace,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModalPanduanTeknisProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalPanduanTeknis({
  isOpen,
  onClose,
}: ModalPanduanTeknisProps) {
  const [activeSection, setActiveSection] = useState("geofence");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-4xl w-[95vw] sm:!max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Panduan Metodologi & Parameter Teknis Pengukuran
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                  SIPADIN AI & Geotag
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Dokumentasi matematis, formula geolokasi, algoritma biometrik AI, dan filosofi audit non-deterministik.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body with Tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full bg-slate-200/70 p-1 rounded-xl h-auto gap-1">
              <TabsTrigger
                value="geofence"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs rounded-lg flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                Geofence & Radius
              </TabsTrigger>
              <TabsTrigger
                value="cluster"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs rounded-lg flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" />
                Analisis Kerumunan
              </TabsTrigger>
              <TabsTrigger
                value="biometrik"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs rounded-lg flex items-center gap-1.5"
              >
                <ScanFace className="w-3.5 h-3.5" />
                Biometrik & Deteksi
              </TabsTrigger>
              <TabsTrigger
                value="filosofi"
                className="text-xs font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:shadow-2xs rounded-lg flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Prinsip Non-Deterministik
              </TabsTrigger>
            </TabsList>

            {/* 1. GEOFENCE & RADIUS */}
            <TabsContent value="geofence" className="mt-4 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      1. Konsep Geofence & Radius Toleransi
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      <b>Geofence</b> adalah pagar perimeter virtual berbasis koordinat geografis bumi (Latitude & Longitude). 
                      <b> Radius Toleransi</b> adalah jarak melingkar (dalam satuan meter) yang diizinkan dari titik acuan pusat kegiatan gedung/ruangan rapat.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-indigo-900 block mb-1">
                      A. Cara Mengatur Radius Resmi
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Admin dapat menentukan titik koordinat resmi pada tab <b>&quot;Edit Agenda & Lokasi&quot;</b> dengan menekan tombol <i>&quot;Ambil Titik Saat Ini&quot;</i> atau memasukkan Latitude/Longitude manual, lalu menentukan batas radius (misal: <b>50m - 200m</b> sesuai luas gedung/kompleks perkantoran).
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-indigo-900 block mb-1">
                      B. Radius Default Otomatis
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Jika admin belum mengunci titik GPS resmi sebelum acara dimulai, sistem menerapkan radius awal <b>±100 meter</b> sebagai standar toleransi GPS perangkat mobile di area perkotaan.
                    </p>
                  </div>
                </div>

                {/* Rumus Haversine */}
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5 mb-2">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    Formula Jarak Geodesik (Haversine Great-Circle Distance)
                  </span>
                  <p className="text-xs text-indigo-900 leading-relaxed mb-3">
                    Sistem menghitung jarak kelengkungan bumi antara koordinat GPS peserta (lat1, lon1) dengan titik pusat (lat2, lon2) menggunakan rumus Haversine (Radius Bumi R = 6.371.000 meter):
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 font-mono text-[11.5px] text-slate-800 overflow-x-auto shadow-2xs">
                    <code>
                      a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)<br />
                      c = 2 · atan2(√a, √(1−a))<br />
                      Jarak (d) = R · c
                    </code>
                  </div>
                  <p className="text-[11px] text-indigo-700/90 mt-2">
                    *Jika jarak d ≤ Radius, peserta diklasifikasikan <b>Di Dalam Radius</b>. Jika d &gt; Radius, selisih jarak ditampilkan pada laporan.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* 2. ANALISIS KERUMUNAN & CENTROID */}
            <TabsContent value="cluster" className="mt-4 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      2. Estimasi Pusat Kerumunan & Radius Kluster Statistik
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Bagaimana jika kegiatan berlangsung di luar ruangan atau admin belum sempat mengeset titik GPS? 
                      SIPADIN menggunakan algoritma <b>Spatial Centroid & Multi-Participant Dispersion Estimation</b>.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block mb-1">
                      1. Perhitungan Titik Berat Kerumunan (Centroid)
                    </span>
                    <p className="text-xs text-slate-600 mb-2">
                      Dihitung dari rata-rata aritmatika seluruh koordinat peserta (N ≥ 4) yang hadir:
                    </p>
                    <div className="bg-white px-3 py-2 rounded border font-mono text-xs text-slate-800">
                      Latitude_Pusat = (Σ lat_i) / N , &nbsp; Longitude_Pusat = (Σ lon_i) / N
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block mb-1">
                      2. Standar Deviasi Jarak (Dispersion / Jangkauan Sebaran)
                    </span>
                    <p className="text-xs text-slate-600 mb-2">
                      Mengukur rata-rata variasi jarak (d_i) setiap peserta ke titik pusat kerumunan (μ):
                    </p>
                    <div className="bg-white px-3 py-2 rounded border font-mono text-xs text-slate-800">
                      σ (Standar Deviasi) = √ [ (1/N) · Σ (d_i − μ)² ]
                    </div>
                  </div>

                  <div className="p-3.5 bg-indigo-50/70 rounded-lg border border-indigo-200">
                    <span className="text-xs font-bold text-indigo-950 block mb-1">
                      3. Penentuan Radius Efektif Kluster (Aturan 2-Sigma / 95% Confidence)
                    </span>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      Radius toleransi kerumunan dinamis ditetapkan sebesar:
                    </p>
                    <div className="bg-white px-3 py-2 rounded border border-indigo-200 font-mono text-xs text-indigo-950 font-bold my-2">
                      Radius_Efektif = clamp( μ + 2σ, min: 50m, max: 500m )
                    </div>
                    <p className="text-[11px] text-indigo-800">
                      Formula ini secara ilmiah mengakomodasi luasnya aula / lapangan upacara dan ketidakakuratan GPS bawaan smartphone (GPS drift), sekaligus menyaring outlier yang benar-benar berada di tempat lain.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 3. BIOMETRIK & DETEKSI WAJAH */}
            <TabsContent value="biometrik" className="mt-4 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    <ScanFace className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      3. Deteksi 1 Orang (Viewfinder) & Pengukuran Kemiripan Wajah
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      SIPADIN mengimplementasikan Convolutional Neural Network (CNN) TinyFaceDetector dan ResNet-34 Face Recognition langsung di sisi browser pengguna.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      A. Menghitung Jumlah Orang dalam Viewfinder
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Setiap interval 400ms, sistem memindai frame kamera dan menghasilkan <i>Bounding Box</i> wajah dengan threshold kepercayaan ≥ 0.35.
                    </p>
                    <ul className="text-[11px] text-slate-600 space-y-1 pl-3 list-disc">
                      <li><b>0 Orang</b>: Garis putus-putus putih (&quot;Posisikan Wajah&quot;).</li>
                      <li><b>1 Orang</b>: Lingkaran hijau 🟢 (&quot;Wajah Terdeteksi&quot;).</li>
                      <li><b>&gt;1 Orang</b>: Lingkaran merah 🔴 (Peringatan kerumunan).</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      B. Ekstraksi Vektor Deskriptor 128-Dimensi
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Wajah dipetakan menjadi vektor matematis unik 128 floating-point (v ∈ ℝ¹²⁸) yang mewakili geometri jarak mata, hidung, rahang, dan kontur wajah.
                    </p>
                  </div>
                </div>

                {/* Rumus Kemiripan Biometrik */}
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-2">
                    <Calculator className="w-4 h-4 text-purple-700" />
                    Formula Jarak Euclidean & Persentase Kemiripan
                  </span>
                  <p className="text-xs text-purple-900 leading-relaxed mb-2">
                    Tingkat perbedaan antara wajah presensi (v1) dan master biometrik pegawai (v2) diukur dengan Jarak Euclidean (L2 Norm):
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-purple-200 font-mono text-xs text-slate-800 overflow-x-auto shadow-2xs mb-2">
                    <code>
                      D = ||v1 − v2||₂ = √ [ Σ (v1[i] − v2[i])² ] (i = 1 .. 128)<br />
                      Persentase Kemiripan (%) = max( 0, min( 100, (1 − D / 0.60) × 100 ) )
                    </code>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                      <b>Cocok (MATCH)</b>: Kemiripan ≥ 60% (D ≤ 0.40).
                    </div>
                    <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900">
                      <b>Biometrik Baru (ENROLLED)</b>: Pendaftaran awal 100%.
                    </div>
                    <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900">
                      <b>Indikasi Beda (MISMATCH)</b>: Kemiripan &lt; 60% (D &gt; 0.40).
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 4. PRINSIP NON-DETERMINISTIK & ALAT BANTU */}
            <TabsContent value="filosofi" className="mt-4 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      4. Prinsip Utama: Alat Bantu Pengawasan (Bukan Alat Deterministik)
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Pernyataan integritas sistem mengenai fungsi analitik data dalam tata kelola administrasi pemerintahan.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      A. Sistem Pendukung Keputusan (Decision Support System)
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Seluruh hasil analisis geofence, estimasi jarak radius, dan persentase kemiripan wajah dirancang sebagai <b>alat bantu verifikasi dan audit visual (&quot;Insight Tool&quot;)</b> bagi pimpinan dan operator presensi, <b>bukan instrumen deterministik otomatis yang menggugurkan hak kehadiran pegawai secara sepihak</b>.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      B. Toleransi Terhadap Variabilitas Lapangan
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sistem mengadopsi pendekatan <b>Non-Blocking & Silent Audit</b>. Apabila pegawai menggunakan ponsel dengan kamera beresolusi rendah, berada di ruangan dengan pencahayaan redup (<i>low light</i>), atau mengalami <i>GPS drift</i> akibat struktur beton gedung tinggi, sistem <b>tetap mengizinkan presensi tersimpan</b>.
                    </p>
                  </div>

                  <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-200 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      C. Kewenangan Validasi Tetap pada Pejabat / Admin Kedinasan
                    </div>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      Indikasi anomali (seperti <i>Indikasi Beda</i> atau <i>Luar Radius</i>) berfungsi sebagai sinyal penanda bagi admin untuk melakukan konfirmasi faktual (misalnya pegawai sedang menghadiri penugasan khusus atau diwakilkan secara resmi). Keputusan akhir keabsahan data sepenuhnya berada di bawah pertimbangan manusia (Human-in-the-Loop).
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dokumentasi Standar Pengukuran Absensi Elektronik SIPADIN Kutai Barat</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
