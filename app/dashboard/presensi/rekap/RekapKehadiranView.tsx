"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  BarChart3,
  Award,
  User,
  Filter,
  FileText,
  Loader2,
  Camera,
  MapPin,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import CetakRekapModal from "./CetakRekapModal";
import CetakRekapPegawaiModal from "./CetakRekapPegawaiModal";

type HistoryItem = {
  agendaId: string;
  namaKegiatan: string;
  tanggal: Date;
  status: "HADIR" | "MEWAKILI" | "TIDAK_HADIR" | "IZIN";
  keterangan?: string | null;
  namaPerwakilan?: string | null;
  jabatanPerwakilan?: string | null;
  fotoUrl?: string | null;
  fotoPulangUrl?: string | null;
  lokasiText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isSelfInput?: boolean;
  isNonUndangan?: boolean;
  waktuInput?: Date | null;
  waktuPulang?: Date | null;
  distanceMeters?: number | null;
  isInsideRadius?: boolean | null;
  radiusToleransiMeters?: number | null;
};

type OpdSummaryItem = {
  instansi: string;
  jabatanTerdata: string[];
  totalDiundang: number;
  hadir: number;
  hadirValid?: number;
  hadirLuarRadius?: number;
  hadirNonUndangan?: number;
  mewakili: number;
  tidakHadir: number;
  izin: number;
  totalPartisipasi: number;
  persentaseKehadiran: number;
  persentaseHadirLangsung: number;
  persentaseValidLokasi?: number;
  avgJarakLuarKm?: number;
  maxJarakLuarKm?: number;
  predikatKepatuhan?: string;
  evaluasiSingkat?: string;
  history: HistoryItem[];
};

type PegawaiSummaryItem = {
  nama: string;
  nip: string | null;
  jabatan: string;
  instansi: string;
  totalDiundang: number;
  hadir: number;
  hadirValid?: number;
  hadirLuarRadius?: number;
  hadirNonUndangan?: number;
  mewakili: number;
  tidakHadir: number;
  izin: number;
  totalPartisipasi: number;
  persentaseKehadiran: number;
  persentaseValidLokasi?: number;
  avgJarakLuarKm?: number;
  maxJarakLuarKm?: number;
  predikatKepatuhan?: string;
  evaluasiSingkat?: string;
  history: HistoryItem[];
};

const NAMA_BULAN = [
  { value: "ALL", label: "Seluruh Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function RekapKehadiranView({
  initialData,
  selectedYear,
  selectedBulan = "ALL",
  customStartDate = "",
  customEndDate = "",
}: {
  initialData: {
    totalAgenda: number;
    opdSummary: OpdSummaryItem[];
    pegawaiSummary: PegawaiSummaryItem[];
  };
  selectedYear: string;
  selectedBulan?: string;
  customStartDate?: string;
  customEndDate?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("opd");
  const [search, setSearch] = useState("");
  const [expandedOpd, setExpandedOpd] = useState<string | null>(null);
  const [expandedPegawai, setExpandedPegawai] = useState<string | null>(null);
  const [isCetakPdfOpen, setIsCetakPdfOpen] = useState(false);
  const [isCetakPegPdfOpen, setIsCetakPegPdfOpen] = useState(false);

  // Filter state untuk rentang tanggal opsional
  const [startDateInput, setStartDateInput] = useState(customStartDate);
  const [endDateInput, setEndDateInput] = useState(customEndDate);
  const [isCustomRange, setIsCustomRange] = useState(!!(customStartDate && customEndDate));

  const updateFilters = (newParams: { tahun?: string; bulan?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    const yr = newParams.tahun !== undefined ? newParams.tahun : selectedYear;
    const bln = newParams.bulan !== undefined ? newParams.bulan : selectedBulan;
    const sDate = newParams.startDate !== undefined ? newParams.startDate : startDateInput;
    const eDate = newParams.endDate !== undefined ? newParams.endDate : endDateInput;

    if (yr) params.set("tahun", yr);
    if (sDate && eDate) {
      params.set("startDate", sDate);
      params.set("endDate", eDate);
    } else if (bln && bln !== "ALL") {
      params.set("bulan", bln);
    }

    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.push(`?${params.toString()}${hash}`);
  };

  const getPeriodeLabel = () => {
    if (customStartDate && customEndDate) {
      return `${customStartDate} s/d ${customEndDate}`;
    }
    if (selectedBulan && selectedBulan !== "ALL") {
      const bObj = NAMA_BULAN.find((b) => b.value === selectedBulan);
      return `${bObj ? bObj.label : ""} ${selectedYear}`;
    }
    return `Tahun ${selectedYear}`;
  };

  const periodeLabelText = getPeriodeLabel();

  // Sync state activeTab dengan Hash URL saat load
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "opd" || hash === "pegawai") {
        setActiveTab(hash);
      }
    }
  }, []);

  // Update Hash URL saat tab diganti
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearch("");
    if (typeof window !== "undefined") {
      window.location.hash = val;
    }
  };

  // Filter OPD
  const filteredOpd = initialData.opdSummary.filter((item) =>
    item.instansi.toLowerCase().includes(search.toLowerCase())
  );

  // Filter Pegawai
  const filteredPegawai = (initialData.pegawaiSummary || []).filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase()) ||
    item.jabatan.toLowerCase().includes(search.toLowerCase()) ||
    item.instansi.toLowerCase().includes(search.toLowerCase())
  );

  const totalOpd = initialData.opdSummary.length;
  const avgKehadiran =
    totalOpd > 0
      ? Math.round(
          initialData.opdSummary.reduce((acc, curr) => acc + curr.persentaseKehadiran, 0) /
            totalOpd
        )
      : 0;

  const topAttendance = initialData.opdSummary.filter((d) => d.persentaseKehadiran >= 80).length;

  const handleExportExcelOpd = () => {
    const rows = filteredOpd.map((opd, idx) => ({
      No: idx + 1,
      "Perangkat Daerah": opd.instansi,
      "Total Diundang": opd.totalDiundang,
      "Total Hadir": opd.hadir,
      "Hadir Valid (Di Lokasi)": opd.hadirValid ?? opd.hadir,
      "Hadir Luar Radius (Anomali)": opd.hadirLuarRadius ?? 0,
      "Hadir Non-Undangan": opd.hadirNonUndangan ?? 0,
      Mewakili: opd.mewakili,
      "Izin / Sakit": opd.izin,
      "Tidak Hadir": opd.tidakHadir,
      "Total Partisipasi": opd.totalPartisipasi,
      "Persentase Kehadiran (%)": `${opd.persentaseKehadiran}%`,
      "Validitas Lokasi (%)": `${opd.persentaseValidLokasi ?? 100}%`,
      "Predikat Kepatuhan": opd.predikatKepatuhan || "-",
      "Catatan Evaluasi": opd.evaluasiSingkat || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran OPD");

    const colWidths = [
      { wch: 5 },
      { wch: 35 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 25 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 45 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `Rekap_Kehadiran_Perangkat_Daerah_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleExportExcelPegawai = () => {
    const rows = filteredPegawai.map((peg, idx) => ({
      No: idx + 1,
      Nama: peg.nama,
      NIP: peg.nip || "-",
      Jabatan: peg.jabatan,
      "Perangkat Daerah": peg.instansi,
      "Total Agenda": peg.totalDiundang,
      "Total Hadir": peg.hadir,
      "Hadir Valid (Di Lokasi)": peg.hadirValid ?? peg.hadir,
      "Hadir Luar Radius (Anomali)": peg.hadirLuarRadius ?? 0,
      "Hadir Non-Undangan": peg.hadirNonUndangan ?? 0,
      Mewakili: peg.mewakili,
      "Tidak Hadir / Izin": peg.tidakHadir + peg.izin,
      "Persentase Kehadiran (%)": `${peg.persentaseKehadiran}%`,
      "Validitas Lokasi (%)": `${peg.persentaseValidLokasi ?? 100}%`,
      "Predikat Kepatuhan": peg.predikatKepatuhan || "-",
      "Catatan Evaluasi": peg.evaluasiSingkat || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran Pegawai");

    const colWidths = [
      { wch: 5 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 25 },
      { wch: 20 },
      { wch: 10 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 45 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `Rekap_Kehadiran_Pegawai_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* 3 Summary KPI Cards (All bg-white, horizontal scroll on mobile) */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-1.5 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Card className="min-w-[260px] sm:min-w-0 snap-start flex-1 border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                Total Agenda Dievaluasi
              </p>
              <p className="text-2xl font-black text-indigo-950 mt-0.5">{initialData.totalAgenda}</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">{totalOpd} Perangkat Daerah Terdata</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[260px] sm:min-w-0 snap-start flex-1 border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Rata-rata Kehadiran OPD
              </p>
              <p className="text-2xl font-black text-emerald-950 mt-0.5">{avgKehadiran}%</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Hadir Langsung + Mewakili</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-[260px] sm:min-w-0 snap-start flex-1 border-slate-200/60 bg-white shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Kepatuhan Tinggi (≥80%)
              </p>
              <p className="text-2xl font-black text-amber-950 mt-0.5">{topAttendance} OPD</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Tingkat Disiplin Kehadiran Baik</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Period Filter Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
          <TabsList className="mb-0">
            <TabsTrigger value="opd" className="text-xs font-semibold">Rekap Per OPD</TabsTrigger>
            <TabsTrigger value="pegawai" className="text-xs font-semibold">Rekap Per Pegawai</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter Waktu: Tahun, Bulan, dan Rentang Tanggal */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filter:</span>
          </div>

          {/* Selector Tahun */}
          <select
            value={selectedYear}
            onChange={(e) => {
              updateFilters({ tahun: e.target.value });
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
          >
            {Array.from({ length: new Date().getFullYear() - 2024 + 2 }, (_, i) => 2024 + i)
              .reverse()
              .map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
          </select>

          {/* Selector Bulan */}
          <select
            value={isCustomRange ? "ALL" : selectedBulan}
            disabled={isCustomRange}
            onChange={(e) => {
              updateFilters({ bulan: e.target.value, startDate: "", endDate: "" });
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9 disabled:opacity-50"
          >
            {NAMA_BULAN.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>

          {/* Toggle Custom Rentang Tanggal */}
          <Button
            type="button"
            variant={isCustomRange ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (isCustomRange) {
                setIsCustomRange(false);
                setStartDateInput("");
                setEndDateInput("");
                updateFilters({ startDate: "", endDate: "" });
              } else {
                setIsCustomRange(true);
              }
            }}
            className={`text-xs! h-9 font-semibold ${
              isCustomRange
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Rentang
          </Button>

          {/* Input Tanggal Mulai - Selesai jika Custom Range aktif */}
          {isCustomRange && (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-indigo-200 animate-in fade-in">
              <Input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="text-xs h-7 w-32 bg-white"
              />
              <span className="text-xs text-slate-400 font-medium">s/d</span>
              <Input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="text-xs h-7 w-32 bg-white"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (startDateInput && endDateInput) {
                    updateFilters({ startDate: startDateInput, endDate: endDateInput });
                  }
                }}
                className="text-xs h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0"
              >
                Terapkan
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} className="w-full">

        {/* 1. REKAP PER OPD */}
        <TabsContent value="opd">
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Peringkat & Rekapitulasi Kehadiran Perangkat Daerah
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Akumulasi tingkat kehadiran pegawai dari seluruh agenda kegiatan resmi. Klik baris OPD untuk melihat riwayat agenda.
                  </CardDescription>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    onClick={() => setIsCetakPdfOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold shrink-0 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Ekspor ke PDF
                  </Button>

                  <Button
                    onClick={handleExportExcelOpd}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                    Ekspor ke Excel
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Cari nama Perangkat Daerah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="border border-slate-200/60 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">Rank</TableHead>
                      <TableHead className="text-xs">Perangkat Daerah</TableHead>
                      <TableHead className="text-xs text-center w-24">Diundang</TableHead>
                      <TableHead className="text-xs text-center w-24">Hadir</TableHead>
                      <TableHead className="text-xs text-center w-24">Mewakili</TableHead>
                      <TableHead className="text-xs text-center w-24">Absen/Izin</TableHead>
                      <TableHead className="text-xs text-center w-36">Tingkat Kehadiran</TableHead>
                      <TableHead className="text-xs text-center w-28">Kategori</TableHead>
                      <TableHead className="text-xs text-right w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOpd.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-slate-400 text-xs">
                          Belum ada data rekapitulasi kehadiran OPD
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOpd.map((opd, idx) => {
                        const isExpanded = expandedOpd === opd.instansi;
                        const persen = opd.persentaseKehadiran;

                        let statusBadge = (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] hover:bg-emerald-50">
                            Sangat Baik
                          </Badge>
                        );
                        if (persen < 60) {
                          statusBadge = (
                            <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] hover:bg-red-50">
                              Rendah
                            </Badge>
                          );
                        } else if (persen < 80) {
                          statusBadge = (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] hover:bg-amber-50">
                              Cukup
                            </Badge>
                          );
                        }

                        return (
                          <React.Fragment key={opd.instansi}>
                            <TableRow
                              onClick={() => setExpandedOpd(isExpanded ? null : opd.instansi)}
                              className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                            >
                              <TableCell className="text-center text-xs font-bold text-slate-500">
                                {idx + 1}
                              </TableCell>

                              <TableCell className="text-xs">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  {opd.instansi}
                                </div>
                                {opd.jabatanTerdata.length > 0 && (
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Pegawai: {opd.jabatanTerdata.join(", ")}
                                  </p>
                                )}
                              </TableCell>

                              <TableCell className="text-center text-xs font-semibold text-slate-700">
                                {opd.totalDiundang}
                              </TableCell>

                              <TableCell className="text-center text-xs">
                                <span className="font-bold text-emerald-700">{opd.hadir}</span>
                                {opd.hadirNonUndangan && opd.hadirNonUndangan > 0 ? (
                                  <p className="text-[9.5px] text-purple-700 font-semibold leading-none mt-0.5">
                                    ({opd.hadirNonUndangan} Non-Undangan)
                                  </p>
                                ) : null}
                                {opd.hadirLuarRadius && opd.hadirLuarRadius > 0 ? (
                                  <p className="text-[9.5px] text-amber-600 font-semibold leading-none mt-0.5">
                                    ({opd.hadirLuarRadius} Luar Rad.)
                                  </p>
                                ) : null}
                              </TableCell>

                              <TableCell className="text-center text-xs font-medium text-amber-700">
                                {opd.mewakili}
                              </TableCell>

                              <TableCell className="text-center text-xs font-medium text-red-600">
                                {opd.tidakHadir + opd.izin}
                              </TableCell>

                              <TableCell className="text-center text-xs">
                                <div className="font-bold text-slate-900">{persen}%</div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      persen >= 80
                                        ? "bg-emerald-600"
                                        : "bg-amber-500"
                                    }`}
                                    style={{ width: `${Math.min(100, persen)}%` }}
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="text-center text-xs">
                                {statusBadge}
                              </TableCell>

                              <TableCell className="text-right text-xs">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Detail History Riwayat Per OPD */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/90">
                                <TableCell colSpan={9} className="p-4">
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                      Riwayat Kehadiran {opd.instansi} ({opd.history.length} Agenda):
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                                      {opd.history.map((h, i) => (
                                        <Link 
                                          key={i} 
                                          href={`/dashboard/presensi/${h.agendaId}`}
                                          className="block p-3 bg-white border border-slate-200/80 rounded-xl text-xs space-y-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-slate-900 truncate">
                                              {h.namaKegiatan}
                                            </span>
                                            <Badge
                                              className={`text-[9px] px-1.5 py-0 shrink-0 ${
                                                h.status === "HADIR"
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                  : h.status === "MEWAKILI"
                                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                                  : "bg-red-50 text-red-600 border-red-200"
                                              }`}
                                            >
                                              {h.status === "HADIR"
                                                ? "Hadir"
                                                : h.status === "MEWAKILI"
                                                ? "Mewakili"
                                                : "Absen"}
                                            </Badge>
                                          </div>

                                          <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-slate-400" />
                                              {formatWita(h.tanggal, "dd MMM yyyy")}
                                            </span>
                                            {h.namaPerwakilan && (
                                              <span className="text-amber-700 font-medium truncate">
                                                Wakili: {h.namaPerwakilan}
                                              </span>
                                            )}
                                          </div>

                                          {/* Metadata Metode, Foto & Geotag */}
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                                            {h.isNonUndangan && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
                                                <Users className="w-2.5 h-2.5" />
                                                Non-Undangan
                                              </span>
                                            )}

                                            {h.isSelfInput ? (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded font-semibold">
                                                <Smartphone className="w-2.5 h-2.5" />
                                                Self-Input
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                                <UserCheck className="w-2.5 h-2.5" />
                                                Manual
                                              </span>
                                            )}

                                            {h.fotoUrl && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                                <Camera className="w-2.5 h-2.5" />
                                                Foto {h.fotoPulangUrl ? "Dtg" : ""}
                                              </span>
                                            )}

                                            {h.fotoPulangUrl && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                                                <Camera className="w-2.5 h-2.5" />
                                                Foto Plg
                                              </span>
                                            )}

                                            {(h.lokasiText || h.latitude) && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                                                <MapPin className="w-2.5 h-2.5" />
                                                GPS
                                              </span>
                                            )}

                                            {h.isInsideRadius === false && (
                                              <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded font-semibold">
                                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                                Luar Rad. {h.distanceMeters ? (h.distanceMeters >= 1000 ? `${(h.distanceMeters / 1000).toFixed(1)}km` : `${h.distanceMeters}m`) : ""}
                                              </span>
                                            )}

                                            <div className="text-[10px] text-slate-400 ml-auto flex items-center gap-1.5 font-mono">
                                              {h.waktuInput && (
                                                <span>Dtg: {formatWita(h.waktuInput, "HH:mm")}</span>
                                              )}
                                              {h.waktuPulang && (
                                                <span className="text-indigo-600 font-semibold">• Plg: {formatWita(h.waktuPulang, "HH:mm")}</span>
                                              )}
                                            </div>
                                          </div>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. REKAP PER PEGAWAI */}
        <TabsContent value="pegawai">
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Rekapitulasi Kehadiran Individu / Pegawai
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Laporan persentase kehadiran masing-masing pegawai dari seluruh undangan agenda. Klik baris pegawai untuk detail riwayat.
                  </CardDescription>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    onClick={() => setIsCetakPegPdfOpen(true)}
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold shrink-0 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Ekspor ke PDF
                  </Button>

                  <Button
                    onClick={handleExportExcelPegawai}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                    Ekspor ke Excel
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Cari nama, jabatan, atau OPD..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="border border-slate-200/60 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/70">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">No</TableHead>
                      <TableHead className="text-xs">Pegawai & Jabatan</TableHead>
                      <TableHead className="text-xs">Perangkat Daerah</TableHead>
                      <TableHead className="text-xs text-center w-20">Agenda</TableHead>
                      <TableHead className="text-xs text-center w-20">Hadir</TableHead>
                      <TableHead className="text-xs text-center w-20">Mewakili</TableHead>
                      <TableHead className="text-xs text-center w-20">Absen</TableHead>
                      <TableHead className="text-xs text-center w-32">Persentase</TableHead>
                      <TableHead className="text-xs text-right w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPegawai.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-slate-400 text-xs">
                          Tidak ada data rekapitulasi pegawai yang ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPegawai.map((peg, idx) => {
                        const isExpanded = expandedPegawai === peg.nama;
                        const persen = peg.persentaseKehadiran;

                        return (
                          <React.Fragment key={idx}>
                            <TableRow
                              onClick={() => setExpandedPegawai(isExpanded ? null : peg.nama)}
                              className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                            >
                              <TableCell className="text-center text-xs font-semibold text-slate-500">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  {peg.nama}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{peg.jabatan}</p>
                              </TableCell>
                              <TableCell className="text-xs text-slate-600 font-medium">{peg.instansi}</TableCell>
                              <TableCell className="text-center text-xs font-semibold text-slate-700">{peg.totalDiundang}</TableCell>
                              <TableCell className="text-center text-xs">
                                <span className="font-bold text-emerald-700">{peg.hadir}</span>
                                {peg.hadirNonUndangan && peg.hadirNonUndangan > 0 ? (
                                  <p className="text-[9.5px] text-purple-700 font-semibold leading-none mt-0.5">
                                    ({peg.hadirNonUndangan} Non-Undangan)
                                  </p>
                                ) : null}
                                {peg.hadirLuarRadius && peg.hadirLuarRadius > 0 ? (
                                  <p className="text-[9.5px] text-amber-600 font-semibold leading-none mt-0.5">
                                    ({peg.hadirLuarRadius} Luar Rad.)
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-center text-xs font-medium text-amber-700">{peg.mewakili}</TableCell>
                              <TableCell className="text-center text-xs font-medium text-red-600">{peg.tidakHadir + peg.izin}</TableCell>
                              
                              <TableCell className="text-center text-xs">
                                <div className="font-bold text-slate-900">{persen}%</div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      persen >= 80 ? "bg-emerald-600" : "bg-amber-500"
                                    }`}
                                    style={{ width: `${Math.min(100, persen)}%` }}
                                  />
                                </div>
                              </TableCell>

                              <TableCell className="text-right text-xs">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400">
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Detail Riwayat per Pegawai */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/90">
                                <TableCell colSpan={9} className="p-4">
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                      Riwayat Kehadiran Individu ({peg.history.length} Agenda):
                                    </p>                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                                      {peg.history.map((h, i) => (
                                        <Link 
                                          key={i} 
                                          href={`/dashboard/presensi/${h.agendaId}`}
                                          className="block p-3 bg-white border border-slate-200/80 rounded-xl text-xs space-y-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-slate-900 truncate">
                                              {h.namaKegiatan}
                                            </span>
                                            <Badge
                                              className={`text-[9px] px-1.5 py-0 shrink-0 ${
                                                h.status === "HADIR"
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                  : h.status === "MEWAKILI"
                                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                                  : "bg-red-50 text-red-600 border-red-200"
                                              }`}
                                            >
                                              {h.status === "HADIR"
                                                ? "Hadir"
                                                : h.status === "MEWAKILI"
                                                ? "Mewakili"
                                                : "Absen"}
                                            </Badge>
                                          </div>

                                          <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-slate-400" />
                                              {formatWita(h.tanggal, "dd MMM yyyy")}
                                            </span>
                                            {h.namaPerwakilan && (
                                              <span className="text-amber-700 font-medium truncate">
                                                Wakili: {h.namaPerwakilan}
                                              </span>
                                            )}
                                          </div>

                                          {/* Metadata Metode, Foto & Geotag */}
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                                            {h.isNonUndangan && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
                                                <Users className="w-2.5 h-2.5" />
                                                Non-Undangan
                                              </span>
                                            )}

                                            {h.isSelfInput ? (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded font-semibold">
                                                <Smartphone className="w-2.5 h-2.5" />
                                                Self-Input
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                                <UserCheck className="w-2.5 h-2.5" />
                                                Manual
                                              </span>
                                            )}

                                            {h.fotoUrl && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">
                                                <Camera className="w-2.5 h-2.5" />
                                                Foto {h.fotoPulangUrl ? "Dtg" : ""}
                                              </span>
                                            )}

                                            {h.fotoPulangUrl && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-semibold">
                                                <Camera className="w-2.5 h-2.5" />
                                                Foto Plg
                                              </span>
                                            )}

                                            {(h.lokasiText || h.latitude) && (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-semibold">
                                                <MapPin className="w-2.5 h-2.5" />
                                                GPS
                                              </span>
                                            )}

                                            {h.isInsideRadius === false && (
                                              <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded font-semibold">
                                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                                Luar Rad. {h.distanceMeters ? (h.distanceMeters >= 1000 ? `${(h.distanceMeters / 1000).toFixed(1)}km` : `${h.distanceMeters}m`) : ""}
                                              </span>
                                            )}

                                            <div className="text-[10px] text-slate-400 ml-auto flex items-center gap-1.5 font-mono">
                                              {h.waktuInput && (
                                                <span>Dtg: {formatWita(h.waktuInput, "HH:mm")}</span>
                                              )}
                                              {h.waktuPulang && (
                                                <span className="text-indigo-600 font-semibold">• Plg: {formatWita(h.waktuPulang, "HH:mm")}</span>
                                              )}
                                            </div>
                                          </div>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal PDF Viewer Rekapitulasi */}
      <CetakRekapModal
        isOpen={isCetakPdfOpen}
        onClose={() => setIsCetakPdfOpen(false)}
        data={{
          tahun: selectedYear,
          periodeLabel: periodeLabelText,
          totalAgenda: initialData.totalAgenda,
          dataOpd: filteredOpd.map((opd) => ({
            instansi: opd.instansi,
            totalDiundang: opd.totalDiundang,
            hadir: opd.hadir,
            hadirValid: opd.hadirValid,
            hadirLuarRadius: opd.hadirLuarRadius,
            hadirNonUndangan: opd.hadirNonUndangan,
            mewakili: opd.mewakili,
            tidakHadir: opd.tidakHadir,
            izin: opd.izin,
            persentaseKehadiran: opd.persentaseKehadiran,
            persentaseValidLokasi: opd.persentaseValidLokasi,
            predikatKepatuhan: opd.predikatKepatuhan,
            evaluasiSingkat: opd.evaluasiSingkat,
          })),
        }}
      />

      {/* Modal PDF Viewer Rekapitulasi Individu */}
      <CetakRekapPegawaiModal
        isOpen={isCetakPegPdfOpen}
        onClose={() => setIsCetakPegPdfOpen(false)}
        data={{
          tahun: selectedYear,
          periodeLabel: periodeLabelText,
          totalAgenda: initialData.totalAgenda,
          dataPegawai: filteredPegawai.map((peg) => ({
            nama: peg.nama,
            nip: peg.nip,
            jabatan: peg.jabatan,
            instansi: peg.instansi,
            totalDiundang: peg.totalDiundang,
            hadir: peg.hadir,
            hadirValid: peg.hadirValid,
            hadirLuarRadius: peg.hadirLuarRadius,
            hadirNonUndangan: peg.hadirNonUndangan,
            mewakili: peg.mewakili,
            tidakHadir: peg.tidakHadir,
            izin: peg.izin,
            persentaseKehadiran: peg.persentaseKehadiran,
            persentaseValidLokasi: peg.persentaseValidLokasi,
            predikatKepatuhan: peg.predikatKepatuhan,
            evaluasiSingkat: peg.evaluasiSingkat,
          })),
        }}
      />
      {/* Mobile Bottom Fixed Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2">
        {activeTab === "opd" ? (
          <>
            <Button
              onClick={() => setIsCetakPdfOpen(true)}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-red-200 text-red-700 bg-white"
              title="Ekspor ke PDF"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleExportExcelOpd}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Ekspor ke Excel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setIsCetakPegPdfOpen(true)}
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-red-200 text-red-700 bg-white"
              title="Ekspor ke PDF"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleExportExcelPegawai}
              className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Ekspor ke Excel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
