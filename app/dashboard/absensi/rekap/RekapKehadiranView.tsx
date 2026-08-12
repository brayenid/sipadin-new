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
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import CetakRekapModal from "./CetakRekapModal";
import CetakRekapPegawaiModal from "./CetakRekapPegawaiModal";

type OpdSummaryItem = {
  instansi: string;
  jabatanTerdata: string[];
  totalDiundang: number;
  hadir: number;
  mewakili: number;
  tidakHadir: number;
  izin: number;
  totalPartisipasi: number;
  persentaseKehadiran: number;
  persentaseHadirLangsung: number;
  history: {
    agendaId: string;
    namaKegiatan: string;
    tanggal: Date;
    status: "HADIR" | "MEWAKILI" | "TIDAK_HADIR" | "IZIN";
    keterangan?: string | null;
    namaPerwakilan?: string | null;
  }[];
};

type PegawaiSummaryItem = {
  nama: string;
  nip: string | null;
  jabatan: string;
  instansi: string;
  totalDiundang: number;
  hadir: number;
  mewakili: number;
  tidakHadir: number;
  izin: number;
  totalPartisipasi: number;
  persentaseKehadiran: number;
  history: {
    agendaId: string;
    namaKegiatan: string;
    tanggal: Date;
    status: "HADIR" | "MEWAKILI" | "TIDAK_HADIR" | "IZIN";
    keterangan?: string | null;
    namaPerwakilan?: string | null;
  }[];
};

export default function RekapKehadiranView({
  initialData,
  selectedYear,
}: {
  initialData: {
    totalAgenda: number;
    opdSummary: OpdSummaryItem[];
    pegawaiSummary: PegawaiSummaryItem[];
  };
  selectedYear: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("opd");
  const [search, setSearch] = useState("");
  const [expandedOpd, setExpandedOpd] = useState<string | null>(null);
  const [expandedPegawai, setExpandedPegawai] = useState<string | null>(null);
  const [isCetakPdfOpen, setIsCetakPdfOpen] = useState(false);
  const [isCetakPegPdfOpen, setIsCetakPegPdfOpen] = useState(false);

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
      "Hadir Langsung": opd.hadir,
      Mewakili: opd.mewakili,
      "Izin / Sakit": opd.izin,
      "Tidak Hadir": opd.tidakHadir,
      "Total Partisipasi": opd.totalPartisipasi,
      "Persentase Kehadiran (%)": `${opd.persentaseKehadiran}%`,
      "Persentase Hadir Langsung (%)": `${opd.persentaseHadirLangsung}%`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kehadiran OPD");

    const colWidths = [
      { wch: 5 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 22 },
      { wch: 26 },
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
      Hadir: peg.hadir,
      Mewakili: peg.mewakili,
      "Tidak Hadir/Izin": peg.tidakHadir + peg.izin,
      "Persentase Kehadiran (%)": `${peg.persentaseKehadiran}%`,
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
      { wch: 10 },
      { wch: 10 },
      { wch: 15 },
      { wch: 22 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `Rekap_Kehadiran_Pegawai_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-indigo-100/80 bg-indigo-50/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                Total Agenda Dievaluasi
              </p>
              <p className="text-2xl font-black text-indigo-950 mt-0.5">{initialData.totalAgenda}</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">{totalOpd} Perangkat Daerah Terdata</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100/80 bg-emerald-50/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Rata-rata Kehadiran OPD
              </p>
              <p className="text-2xl font-black text-emerald-950 mt-0.5">{avgKehadiran}%</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Hadir Langsung + Mewakili</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <BarChart3 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100/80 bg-amber-50/30 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Kepatuhan Tinggi (≥80%)
              </p>
              <p className="text-2xl font-black text-amber-950 mt-0.5">{topAttendance} OPD</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Tingkat Disiplin Kehadiran Baik</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Year Selector Layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
          <TabsList className="mb-0">
            <TabsTrigger value="opd" className="text-xs font-semibold">Rekap Per OPD</TabsTrigger>
            <TabsTrigger value="pegawai" className="text-xs font-semibold">Rekap Per Pegawai</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Year Filter Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Tahun Laporan:
          </span>
          <select
            value={selectedYear}
            onChange={(e) => {
              router.push(`?tahun=${e.target.value}`);
            }}
            className="text-xs border border-slate-200/60 rounded-md px-2.5 py-1.5 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9"
          >
            {/* Array dari 2024 sampai tahun berjalan + 1 */}
            {Array.from({ length: new Date().getFullYear() - 2024 + 2 }, (_, i) => 2024 + i)
              .reverse()
              .map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
          </select>
        </div>
      </div>

      <Tabs value={activeTab} className="w-full">

        {/* 1. REKAP PER OPD */}
        <TabsContent value="opd">
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Peringkat & Rekapitulasi Kehadiran Perangkat Daerah
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Akumulasi tingkat kehadiran pejabat dari seluruh agenda kegiatan resmi. Klik baris OPD untuk melihat riwayat agenda.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
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

            <CardContent className="pt-4 space-y-4">
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
                                    Pejabat: {opd.jabatanTerdata.join(", ")}
                                  </p>
                                )}
                              </TableCell>

                              <TableCell className="text-center text-xs font-semibold text-slate-700">
                                {opd.totalDiundang}
                              </TableCell>

                              <TableCell className="text-center text-xs font-bold text-emerald-700">
                                {opd.hadir}
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                      {opd.history.map((h, i) => (
                                        <Link 
                                          key={i} 
                                          href={`/dashboard/absensi/${h.agendaId}`}
                                          className="block p-2.5 bg-white border border-slate-200 rounded-md text-xs space-y-1 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 truncate pr-2">
                                              {h.namaKegiatan}
                                            </span>
                                            <Badge
                                              className={`text-[9px] px-1.5 py-0 ${
                                                h.status === "HADIR"
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                  : h.status === "MEWAKILI"
                                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                                  : "bg-red-50 text-red-600 border-red-200"
                                              }`}
                                            >
                                              {h.status === "HADIR"
                                                ? "100% Hadir"
                                                : h.status === "MEWAKILI"
                                                ? "50% Mewakili"
                                                : "0% Absen"}
                                            </Badge>
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                            <span>{formatWita(h.tanggal, "dd MMM yyyy")}</span>
                                            {h.namaPerwakilan && (
                                              <span className="text-amber-700 font-medium">
                                                Wakili: {h.namaPerwakilan}
                                              </span>
                                            )}
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
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Rekapitulasi Kehadiran Individu / Pegawai
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Laporan persentase kehadiran masing-masing pejabat dari seluruh undangan agenda. Klik baris pegawai untuk detail riwayat.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
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

            <CardContent className="pt-4 space-y-4">
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
                              <TableCell className="text-center text-xs font-bold text-emerald-700">{peg.hadir}</TableCell>
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
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                      {peg.history.map((h, i) => (
                                        <Link
                                          key={i}
                                          href={`/dashboard/absensi/${h.agendaId}`}
                                          className="block p-2.5 bg-white border border-slate-200 rounded-md text-xs space-y-1 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 truncate pr-2">
                                              {h.namaKegiatan}
                                            </span>
                                            <Badge
                                              className={`text-[9px] px-1.5 py-0 ${
                                                h.status === "HADIR"
                                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                  : h.status === "MEWAKILI"
                                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                                  : "bg-red-50 text-red-600 border-red-200"
                                              }`}
                                            >
                                              {h.status === "HADIR"
                                                ? "100% Hadir"
                                                : h.status === "MEWAKILI"
                                                ? "50% Mewakili"
                                                : "0% Absen"}
                                            </Badge>
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                            <span>{formatWita(h.tanggal, "dd MMM yyyy")}</span>
                                            {h.namaPerwakilan && (
                                              <span className="text-amber-700 font-medium">
                                                Wakili: {h.namaPerwakilan}
                                              </span>
                                            )}
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
          totalAgenda: initialData.totalAgenda,
          dataOpd: filteredOpd.map((opd) => ({
            instansi: opd.instansi,
            totalDiundang: opd.totalDiundang,
            hadir: opd.hadir,
            mewakili: opd.mewakili,
            tidakHadir: opd.tidakHadir,
            izin: opd.izin,
            persentaseKehadiran: opd.persentaseKehadiran,
          })),
        }}
      />

      {/* Modal PDF Viewer Rekapitulasi Individu */}
      <CetakRekapPegawaiModal
        isOpen={isCetakPegPdfOpen}
        onClose={() => setIsCetakPegPdfOpen(false)}
        data={{
          tahun: selectedYear,
          totalAgenda: initialData.totalAgenda,
          dataPegawai: filteredPegawai.map((peg) => ({
            nama: peg.nama,
            jabatan: peg.jabatan,
            instansi: peg.instansi,
            totalDiundang: peg.totalDiundang,
            hadir: peg.hadir,
            mewakili: peg.mewakili,
            tidakHadir: peg.tidakHadir,
            izin: peg.izin,
            persentaseKehadiran: peg.persentaseKehadiran,
          })),
        }}
      />
    </div>
  );
}
