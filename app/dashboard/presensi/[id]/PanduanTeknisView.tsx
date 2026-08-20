"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PanduanTeknisView() {
  const [subTab, setSubTab] = useState<"geofence" | "cluster" | "filosofi">("geofence");

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
      {/* Header Halaman */}
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/40">
        <CardTitle className="text-base font-bold text-slate-900">
          Panduan Metodologi & Parameter Pengukuran
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Penjelasan teknis geofence, estimasi sebaran kerumunan, dan prinsip alat bantu audit presensi.
        </CardDescription>

        {/* Sub-Tab Navigasi Sederhana */}
        <div className="flex items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-xs sm:text-sm font-medium pt-3 border-t border-slate-200/70 mt-3">
          <button
            type="button"
            onClick={() => setSubTab("geofence")}
            className={`pb-2 px-0.5 border-b-2 transition-all whitespace-nowrap cursor-pointer -mb-[1px] ${
              subTab === "geofence"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            Geofence & Radius
          </button>

          <button
            type="button"
            onClick={() => setSubTab("cluster")}
            className={`pb-2 px-0.5 border-b-2 transition-all whitespace-nowrap cursor-pointer -mb-[1px] ${
              subTab === "cluster"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            Pusat Kerumunan (Centroid)
          </button>

          <button
            type="button"
            onClick={() => setSubTab("filosofi")}
            className={`pb-2 px-0.5 border-b-2 transition-all whitespace-nowrap cursor-pointer -mb-[1px] ${
              subTab === "filosofi"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            Prinsip Non-Deterministik
          </button>
        </div>
      </CardHeader>

      {/* Konten Halaman */}
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* 1. GEOFENCE & RADIUS */}
        {subTab === "geofence" && (
          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                1. Geofence dan Radius Toleransi
              </h3>
              <p className="leading-relaxed text-slate-600">
                <b>Geofence</b> adalah batas area lingkaran virtual yang dibuat di sekitar lokasi kegiatan resmi berdasarkan koordinat lintang dan bujur (GPS). 
                <b> Radius</b> menentukan seberapa jauh jarak jangkauan (dalam meter) yang masih dianggap sah di sekitar lokasi tersebut.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  A. Cara Kerja Pengukuran Jarak
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Saat peserta mengirim presensi dari ponsel, sistem membaca titik koordinat GPS peserta lalu membandingkannya langsung dengan titik koordinat resmi kegiatan untuk mengukur jarak sebenarnya dalam satuan meter.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  B. Pengaturan Radius (Manual vs Otomatis)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Admin dapat mengatur batas radius di tab <b>&quot;Edit Agenda & Lokasi&quot;</b> (misalnya 50 meter untuk ruangan rapat, atau 200 meter untuk gedung bertingkat/kompleks kantor). Jika belum disetel manual, sistem otomatis memberi toleransi awal <b>100 meter</b>.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 block">
                C. Hasil Klasifikasi Lokasi
              </span>
              <ul className="space-y-1 text-slate-600 pl-3.5 list-disc text-xs leading-relaxed">
                <li><b>Di Dalam Radius</b>: Jarak posisi peserta berada di dalam batas toleransi lokasi yang ditentukan.</li>
                <li><b>Luar Radius</b>: Peserta terdeteksi berada di luar jangkauan lokasi, dan jarak selisihnya dicatat pada laporan sebagai bahan evaluasi kedinasan.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 2. ANALISIS KERUMUNAN & CENTROID */}
        {subTab === "cluster" && (
          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                2. Estimasi Pusat Kerumunan dan Sebaran Peserta
              </h3>
              <p className="leading-relaxed text-slate-600">
                Fitur ini bekerja secara otomatis ketika agenda berlangsung di lokasi baru atau admin belum sempat menetapkan titik GPS kegiatan secara manual.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  1. Menemukan Pusat Kerumunan (Titik Tengah)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Sistem mengumpulkan seluruh koordinat GPS peserta yang hadir, lalu menghitung titik rata-ratanya. Titik rata-rata ini menjadi perkiraan pusat kerumunan acara secara otomatis.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  2. Mengukur Sebaran Jarak Peserta
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Sistem menganalisis variasi jarak setiap peserta terhadap titik pusat tersebut untuk mengetahui seberapa luas peserta menyebar di area acara (misalnya di aula besar atau halaman gedung).
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 block">
                  3. Penentuan Batas Area yang Wajar
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Berdasarkan sebaran tersebut, sistem menetapkan batas lingkaran area yang adil (antara 50 hingga 500 meter). Hal ini memastikan pegawai yang berada di dalam ruangan tetap terakomodasi meskipun sinyal GPS di ponsel mereka sempat bergeser tipis karena pengaruh dinding gedung (GPS drift).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. PRINSIP NON-DETERMINISTIK & ALAT BANTU */}
        {subTab === "filosofi" && (
          <div className="space-y-4 text-xs text-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                3. Prinsip Utama: Alat Bantu Pengawasan (Bukan Alat Deterministik)
              </h3>
              <p className="leading-relaxed text-slate-600">
                Pernyataan tata kelola mengenai peran data dan teknologi kecerdasan buatan dalam administrasi kedinasan.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  A. Sebagai Alat Bantu Verifikasi (Decision Support Tool)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Hasil pemantauan lokasi GPS, perkiraan radius, dan persentase kemiripan wajah dirancang sebagai <b>alat bantu verifikasi dan audit visual bagi pimpinan serta admin presensi</b>, bukan sistem otomatis yang secara kaku menggugurkan hak kehadiran pegawai.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  B. Toleransi Kondisi Lapangan (Non-Blocking Submit)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Sistem tidak pernah memblokir tombol presensi. Apabila pegawai menggunakan ponsel dengan kamera beresolusi rendah, pencahayaan ruangan redup, atau sinyal GPS melemah di dalam gedung bertingkat, presensi <b>tetap dapat dikirimkan dan tercatat dengan aman</b>.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  C. Kewenangan Validasi Tetap pada Pejabat / Admin (Human-in-the-Loop)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Status seperti <i>Indikasi Beda</i> atau <i>Luar Radius</i> berfungsi sebagai sinyal audit agar admin dapat mengonfirmasi kondisi faktual pegawai (misalnya sedang menjalankan tugas luar atau diwakilkan secara resmi). Keputusan akhir keabsahan data sepenuhnya berada pada pertimbangan manusia.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
