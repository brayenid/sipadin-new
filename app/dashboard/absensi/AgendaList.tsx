"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Trash2,
  Users,
  BarChart3,
  CheckCheck,
  Eye,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";
import { deleteAgendaAbsensi } from "@/app/actions/absensi";
import ModalBuatAgenda from "./ModalBuatAgenda";

type AgendaItem = {
  id: string;
  namaKegiatan: string;
  hari: string | null;
  tanggal: Date;
  waktu: string | null;
  tempat: string;
  deskripsi: string | null;
  targetPeserta: string | null;
  status: "BERLANGSUNG" | "SELESAI" | "DIBATALKAN";
  driveUrl: string | null;
  stats: {
    total: number;
    hadir: number;
    mewakili: number;
    tidakHadir: number;
    izin: number;
    persentase: number;
  };
};

export default function AgendaList({
  initialData,
  totalPejabatTerdaftar,
}: {
  initialData: AgendaItem[];
  totalPejabatTerdaftar: number;
}) {
  const router = useRouter();
  const [data, setData] = useState<AgendaItem[]>(initialData);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus agenda "${nama}"?`)) return;

    setDeletingId(id);
    try {
      await deleteAgendaAbsensi(id);
      setData((prev) => prev.filter((item) => item.id !== id));
      toast.success("Agenda berhasil dihapus");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus agenda");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredData = data.filter((item) => {
    const matchSearch =
      item.namaKegiatan.toLowerCase().includes(search.toLowerCase()) ||
      item.tempat.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      filterStatus === "ALL" || item.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const totalAgenda = data.length;
  const countBerlangsung = data.filter((d) => d.status === "BERLANGSUNG").length;
  const countSelesai = data.filter((d) => d.status === "SELESAI").length;

  return (
    <div className="space-y-6">
      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-indigo-100 bg-indigo-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                Total Agenda
              </p>
              <p className="text-2xl font-black text-indigo-950 mt-0.5">{totalAgenda}</p>
              <p className="text-[11px] text-indigo-600/80 mt-0.5">Kegiatan Tercatat</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Sedang Berlangsung
              </p>
              <p className="text-2xl font-black text-amber-950 mt-0.5">{countBerlangsung}</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Perlu Pengisian Hadir</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Selesai Dilaporkan
              </p>
              <p className="text-2xl font-black text-emerald-950 mt-0.5">{countSelesai}</p>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Absensi Tuntas</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pejabat Ter-binding
              </p>
              <p className="text-2xl font-black text-slate-800 mt-0.5">{totalPejabatTerdaftar}</p>
              <Link
                href="/dashboard/absensi/pejabat"
                className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-0.5 mt-0.5"
              >
                Kelola Daftar &rarr;
              </Link>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content List */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Daftar Agenda Absensi Perangkat Daerah
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Kelola agenda, cetak blanko daftar hadir fisik, checklist kehadiran pejabat, dan tautkan arsip Google Drive.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/absensi/rekap">
                <Button variant="outline" size="sm" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  Rekapitulasi
                </Button>
              </Link>

              <Link href="/dashboard/absensi/pejabat">
                <Button variant="outline" size="sm" className="text-xs">
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Master Pejabat
                </Button>
              </Link>

              <Button
                onClick={() => setIsModalOpen(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Buat Agenda
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari kegiatan atau tempat acara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 text-xs h-9"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9 w-full sm:w-44"
            >
              <option value="ALL">Semua Agenda ({totalAgenda})</option>
              <option value="BERLANGSUNG">Berlangsung ({countBerlangsung})</option>
              <option value="SELESAI">Selesai ({countSelesai})</option>
            </select>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="text-xs">Kegiatan & Lokasi</TableHead>
                  <TableHead className="text-xs w-48">Waktu Pelaksanaan</TableHead>
                  <TableHead className="text-xs text-center w-36">Kehadiran OPD</TableHead>
                  <TableHead className="text-xs text-center w-28">Status</TableHead>
                  <TableHead className="text-xs text-center w-28">Arsip Drive</TableHead>
                  <TableHead className="text-xs text-right w-32">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-xs">
                      Belum ada data agenda absensi
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, idx) => {
                    const isFinished = item.status === "SELESAI";
                    // Nomor baris berlanjut per halaman
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="text-center text-xs font-medium text-slate-500">
                          {rowNumber}
                        </TableCell>

                        <TableCell className="text-xs">
                          <Link
                            href={`/dashboard/absensi/${item.id}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block text-sm"
                          >
                            {item.namaKegiatan}
                          </Link>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.tempat}</span>
                          </div>
                          {item.targetPeserta && (
                            <span className="inline-block mt-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-sm">
                              {item.targetPeserta}
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          <div className="font-semibold text-slate-900">
                            {item.hari ? `${item.hari}, ` : ""}
                            {formatWita(item.tanggal, "dd MMM yyyy")}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {item.waktu || "-"}
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-xs">
                          <div className="font-bold text-slate-900">
                            {item.stats.persentase}%
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            <span className="text-emerald-700 font-semibold">{item.stats.hadir} Hadir</span>
                            {item.stats.mewakili > 0 && (
                              <span className="text-amber-600"> • {item.stats.mewakili} Wakili</span>
                            )}
                            <span className="text-slate-400"> / {item.stats.total} OPD</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, item.stats.persentase)}%` }}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-xs">
                          {isFinished ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] hover:bg-emerald-50 font-semibold">
                              <CheckCheck className="w-3 h-3 mr-1" />
                              Selesai
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] hover:bg-amber-50 font-semibold">
                              <Clock className="w-3 h-3 mr-1" />
                              Berlangsung
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-xs">
                          {item.driveUrl ? (
                            <a
                              href={item.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Buka Drive
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-300 italic">Belum ada link</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/absensi/${item.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Kelola
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item.id, item.namaKegiatan)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredData.length >= 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
              <p className="text-[10px] sm:text-sm text-slate-500">
                Menampilkan <span className="font-medium text-slate-900">{filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-medium text-slate-900">{filteredData.length}</span>
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="h-8 px-2 sm:px-3 text-slate-600"
                >
                  <span className="hidden sm:inline">Sebelumnya</span>
                  <span className="sm:hidden">&laquo;</span>
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button 
                      key={p} 
                      variant={p === currentPage ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setCurrentPage(p)} 
                      className={`h-8 w-8 p-0 ${p === currentPage ? 'bg-blue-600 text-white hover:bg-blue-750' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <div className="flex sm:hidden items-center justify-center px-2 text-xs font-medium text-slate-600">
                  {currentPage} / {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="h-8 px-2 sm:px-3 text-slate-600"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <span className="sm:hidden">&raquo;</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalBuatAgenda
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        totalPejabatTerdaftar={totalPejabatTerdaftar}
      />
    </div>
  );
}
