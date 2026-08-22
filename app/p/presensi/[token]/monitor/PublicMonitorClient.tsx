"use client";

import React, { useState, useTransition } from "react";
import { getPublicAgendaMonitorData } from "@/app/actions/absensi";
import { formatWita } from "@/lib/date-utils";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  RefreshCw,
  Camera,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface MonitorData {
  agenda: {
    id: string;
    publicToken: string | null;
    namaKegiatan: string;
    hari: string | null;
    tanggal: string | null;
    waktu: string | null;
    tempat: string | null;
    deskripsi: string | null;
    targetPeserta: string | null;
    targetKategori: string | null;
    status: string;
    isPublicActive: boolean;
    waktuBukaAbsen: string | null;
    waktuTutupAbsen: string | null;
    enableCheckOut: boolean;
    waktuBukaPulang: string | null;
    waktuTutupPulang: string | null;
    isRecurring: boolean;
    recurringDays: string[] | null;
    recurringWeeks: number[] | null;
    recurringJamBuka: string | null;
    recurringJamTutup: string | null;
    kategori: string | null;
    picNama: string | null;
    picJabatan: string | null;
  };
  sesi: {
    id: string;
    tanggalSesi: string | null;
  };
  stats: {
    total: number;
    hadir: number;
    mewakili: number;
    izin: number;
    tidakHadir: number;
    totalMengisi: number;
    persentase: number;
  };
  peserta: {
    id: string;
    urutan: number;
    nama: string;
    nip: string | null;
    jabatan: string;
    instansi: string;
    eselon: string | null;
    status: string;
    namaPerwakilan: string | null;
    jabatanPerwakilan: string | null;
    keterangan: string | null;
    waktuInput: string | null;
    waktuPulang: string | null;
    isSelfInput: boolean;
    isNonUndangan: boolean;
    fotoUrl: string | null;
    fotoPulangUrl: string | null;
    lokasiText: string | null;
    distanceMeters: number | null;
    isInsideRadius: boolean | null;
    hasFoto: boolean;
    hasFotoPulang: boolean;
  }[];
  lastUpdated: string;
}

export default function PublicMonitorClient({
  initialData,
}: {
  token: string;
  initialData: MonitorData;
}) {
  const PAGE_STEP = 25;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_STEP);
  const [data, setData] = useState<MonitorData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    title: string;
    nama: string;
    waktu?: string | null;
  } | null>(null);

  // Manual Refresh Handler
  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const freshData = await getPublicAgendaMonitorData(data.agenda.id);
        setData(freshData);
        toast.success("Data presensi diperbarui");
      } catch (err: any) {
        toast.error(err.message || "Gagal memuat ulang data presensi.");
      }
    });
  };

  // Filter Peserta
  const filteredPeserta = data.peserta.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      p.nama.toLowerCase().includes(q) ||
      (p.nip && p.nip.toLowerCase().includes(q)) ||
      p.jabatan.toLowerCase().includes(q) ||
      p.instansi.toLowerCase().includes(q) ||
      (p.namaPerwakilan && p.namaPerwakilan.toLowerCase().includes(q)) ||
      (p.keterangan && p.keterangan.toLowerCase().includes(q));

    const matchStatus =
      filterStatus === "ALL"
        ? true
        : filterStatus === "HADIR"
        ? p.status === "HADIR"
        : filterStatus === "MEWAKILI"
        ? p.status === "MEWAKILI"
        : filterStatus === "IZIN"
        ? p.status === "IZIN"
        : p.status === "TIDAK_HADIR";

    return matchQuery && matchStatus;
  });

  const displayedPeserta = filteredPeserta.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPeserta.length;
  const remainingCount = filteredPeserta.length - visibleCount;

  const formattedLastUpdated = formatWita(data.lastUpdated, "HH:mm:ss");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 sm:pb-12 font-sans text-xs">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sipadin.png"
              alt="SIPADIN"
              className="h-6.5 w-auto object-contain shrink-0"
            />
            <div className="min-w-0 border-l border-slate-200 pl-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 font-mono">
                  Live Monitor
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[260px] sm:max-w-md">{data.agenda.namaKegiatan}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isPending ? "animate-spin text-indigo-600" : ""}`} />
              <span>{isPending ? "Menyegarkan..." : "Segarkan"}</span>
              <span className="text-[10px] text-slate-400 font-mono ml-0.5">({formattedLastUpdated})</span>
            </button>

            {/* Form Link */}
            <Link
              href={data.agenda.publicToken ? `/p/presensi/${data.agenda.publicToken}` : `/p/presensi/${data.agenda.id}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
              target="_blank"
            >
              <span>Isi Presensi</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-3">
        {/* Info & Stats Bar */}
        <div className="bg-white rounded-lg border border-slate-200/80 p-3.5 sm:p-4 space-y-3 shadow-2xs">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900">
                {data.agenda.namaKegiatan}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                {data.agenda.tanggal && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {data.agenda.hari ? `${data.agenda.hari}, ` : ""}
                    {formatWita(data.agenda.tanggal, "dd MMMM yyyy")}
                  </span>
                )}
                {data.agenda.waktu && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {data.agenda.waktu}
                  </span>
                )}
                {data.agenda.tempat && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {data.agenda.tempat}
                  </span>
                )}
              </div>
            </div>

            <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded self-start sm:self-center">
              Partisipasi: <b className="text-slate-900 font-bold">{data.stats.persentase}%</b> ({data.stats.totalMengisi}/{data.stats.total})
            </span>
          </div>

          {/* Inline Stats Badges (Native SIPADIN Style) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11.5px]">
              Total: <b className="font-bold text-slate-900">{data.stats.total}</b>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Hadir: <b className="font-bold">{data.stats.hadir}</b>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-medium text-[11.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Mewakili: <b className="font-bold">{data.stats.mewakili}</b>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium text-[11.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Izin: <b className="font-bold">{data.stats.izin}</b>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-medium text-[11.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Belum Hadir: <b className="font-bold">{data.stats.tidakHadir}</b>
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, jabatan, atau OPD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 h-8.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8.5 text-xs border border-slate-300 rounded-md px-2.5 bg-white text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-48 cursor-pointer"
          >
            <option value="ALL">Semua Status ({data.stats.total})</option>
            <option value="HADIR">Hadir ({data.stats.hadir})</option>
            <option value="MEWAKILI">Mewakili ({data.stats.mewakili})</option>
            <option value="IZIN">Izin ({data.stats.izin})</option>
            <option value="TIDAK_HADIR">Belum Hadir ({data.stats.tidakHadir})</option>
          </select>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="w-10 py-2.5 px-3 text-center">No</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Pegawai &amp; OPD</th>
                  <th className="w-40 py-2.5 px-3 text-center">Status Kehadiran</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Data Perwakilan / Alasan</th>
                  <th className="w-40 py-2.5 px-3 text-center">Bukti &amp; Waktu Presensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedPeserta.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Tidak ada peserta yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  displayedPeserta.map((p, idx) => {
                    const isHadir = p.status === "HADIR";
                    const isMewakili = p.status === "MEWAKILI";
                    const isIzin = p.status === "IZIN";
                    const isTidakHadir = p.status === "TIDAK_HADIR";

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isHadir
                            ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                            : isMewakili
                            ? "bg-blue-50/20 hover:bg-amber-50/40"
                            : isIzin
                            ? "bg-amber-50/20 hover:bg-amber-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* No */}
                        <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                          {idx + 1}
                        </td>

                        {/* Pegawai & OPD */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{p.nama}</span>
                            {p.isNonUndangan && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 text-[9px] font-bold rounded border border-purple-200">
                                Non-Undangan
                              </span>
                            )}
                            {p.isSelfInput && (
                              <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-200">
                                Mandiri
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                            {p.jabatan}
                            {p.nip && <span className="text-slate-400 font-mono"> • NIP. {p.nip}</span>}
                          </div>
                          <div className="text-indigo-700 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{p.instansi}</span>
                          </div>
                        </td>

                        {/* Status Kehadiran (Clean native badge) */}
                        <td className="py-2.5 px-3 text-center">
                          {isHadir && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Hadir
                            </span>
                          )}
                          {isMewakili && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              <Users className="w-3 h-3 text-blue-600" />
                              Mewakili
                            </span>
                          )}
                          {isIzin && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Izin / Dinas Luar
                            </span>
                          )}
                          {isTidakHadir && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Tidak Hadir
                            </span>
                          )}
                        </td>

                        {/* Data Perwakilan / Alasan */}
                        <td className="py-2.5 px-3">
                          {isMewakili ? (
                            <div className="p-2 bg-blue-50/80 rounded-md border border-blue-200/80 text-[11px] space-y-0.5">
                              <p className="font-bold text-slate-900">{p.namaPerwakilan || "-"}</p>
                              {p.jabatanPerwakilan && (
                                <p className="text-slate-600 text-[10.5px]">{p.jabatanPerwakilan}</p>
                              )}
                            </div>
                          ) : isIzin ? (
                            <div className="p-1.5 bg-amber-50/80 rounded-md border border-amber-200/80 text-[11px] text-amber-900">
                              <span className="font-semibold text-[10px] text-amber-700 block uppercase">Alasan:</span>
                              <span className="italic text-slate-800">&ldquo;{p.keterangan || "Izin"}&rdquo;</span>
                            </div>
                          ) : isHadir && p.keterangan ? (
                            <span className="text-[11px] text-slate-600 italic">
                              Catatan: {p.keterangan}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-center block">-</span>
                          )}
                        </td>

                        {/* Bukti & Waktu Presensi */}
                        <td className="py-2.5 px-3 text-center">
                          {p.waktuInput ? (
                            <div className="space-y-1 inline-flex flex-col items-center">
                              <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{formatWita(p.waktuInput, "HH:mm")} WITA</span>
                              </div>

                              {p.waktuPulang && (
                                <div className="text-[10px] font-mono text-indigo-700">
                                  Pulang: {formatWita(p.waktuPulang, "HH:mm")} WITA
                                </div>
                              )}

                              {p.fotoUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedPhoto({
                                      url: p.fotoUrl!,
                                      title: `Bukti Presensi`,
                                      nama: isMewakili ? `${p.namaPerwakilan} (Mewakili ${p.nama})` : p.nama,
                                      waktu: p.waktuInput,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 px-1.5 py-0.2 rounded transition cursor-pointer font-medium"
                                >
                                  <Camera className="w-2.5 h-2.5" />
                                  <span>Lihat Foto</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono text-center block">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Load More & Pagination Bar */}
          {filteredPeserta.length > PAGE_STEP && (
            <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
              <span className="text-slate-500 text-[11.5px]">
                Menampilkan <b>{Math.min(visibleCount, filteredPeserta.length)}</b> dari <b>{filteredPeserta.length}</b> pegawai
              </span>

              <div className="flex items-center gap-2">
                {hasMore ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + PAGE_STEP)}
                      className="h-8 px-3.5 rounded-md font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer"
                    >
                      Muat Lebih Banyak (+{Math.min(PAGE_STEP, remainingCount)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleCount(filteredPeserta.length)}
                      className="h-8 px-3 rounded-md font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition cursor-pointer"
                    >
                      Tampilkan Semua
                    </button>
                  </>
                ) : (
                  <span className="text-slate-400 text-[11px] font-medium">
                    Semua data telah ditampilkan
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Refresh Button Khusus Mobile */}
      <div className="sm:hidden fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-900 text-white font-semibold text-xs shadow-lg hover:bg-slate-800 active:scale-95 transition cursor-pointer disabled:opacity-70"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
          <span>{isPending ? "Menyegarkan..." : "Segarkan"}</span>
        </button>
      </div>

      {/* Modal Preview Foto Selfie */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white max-w-sm w-full rounded-xl p-4 space-y-3 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{selectedPhoto.title}</h4>
                <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{selectedPhoto.nama}</p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-4/3 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhoto.url}
                alt="Bukti Presensi"
                className="w-full h-full object-cover"
              />
            </div>

            {selectedPhoto.waktu && (
              <div className="text-center text-[11px] font-mono text-slate-500">
                Waktu: {formatWita(selectedPhoto.waktu, "dd MMMM yyyy HH:mm:ss")} WITA
              </div>
            )}

            <button
              onClick={() => setSelectedPhoto(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
