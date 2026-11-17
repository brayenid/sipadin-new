"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Trash2,
  Edit2,
  ExternalLink,
  Plane,
  Lock,
  Sparkles,
  FileText,
  Users,
  Wallet,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAgenda,
  updateAgenda,
  deleteAgenda,
  getNationalHolidays,
  type AgendaItemDTO,
  type HolidayItem,
} from "@/app/actions/agenda";
import { KategoriAgenda, StatusAgenda } from "@prisma/client";
import { AgendaExcelActions } from "./AgendaExcelActions";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import { formatCurrency } from "@/lib/utils";

const KATEGORI_CONFIG: Record<
  KategoriAgenda,
  { label: string; bg: string; text: string; border: string; dot: string; barBg: string; barLine: string }
> = {
  RAPAT: {
    label: "Rapat",
    bg: "bg-blue-50/90 text-blue-700 border-blue-200/80 hover:bg-blue-100/70",
    text: "text-blue-700",
    border: "border-blue-200/80",
    dot: "bg-blue-500",
    barBg: "bg-blue-50/95 border-blue-300 text-blue-800 hover:bg-blue-100/90",
    barLine: "bg-blue-400",
  },
  PERJALANAN_DINAS: {
    label: "Perjalanan Dinas",
    bg: "bg-amber-50/90 text-amber-800 border-amber-200/80 hover:bg-amber-100/70",
    text: "text-amber-800",
    border: "border-amber-200/80",
    dot: "bg-amber-500",
    barBg: "bg-gradient-to-r from-amber-50 via-orange-50/90 to-amber-50 border-amber-300/90 text-amber-900 hover:from-amber-100/90 hover:to-amber-100/80",
    barLine: "bg-amber-500",
  },
  SOSIALISASI: {
    label: "Sosialisasi / Bimtek",
    bg: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/70",
    text: "text-emerald-800",
    border: "border-emerald-200/80",
    dot: "bg-emerald-500",
    barBg: "bg-emerald-50/95 border-emerald-300 text-emerald-800 hover:bg-emerald-100/90",
    barLine: "bg-emerald-400",
  },
  MONITORING_EVALUASI: {
    label: "Monev",
    bg: "bg-purple-50/90 text-purple-800 border-purple-200/80 hover:bg-purple-100/70",
    text: "text-purple-800",
    border: "border-purple-200/80",
    dot: "bg-purple-500",
    barBg: "bg-purple-50/95 border-purple-300 text-purple-800 hover:bg-purple-100/90",
    barLine: "bg-purple-400",
  },
  ACARA_INTERNAL: {
    label: "Acara Internal",
    bg: "bg-pink-50/90 text-pink-800 border-pink-200/80 hover:bg-pink-100/70",
    text: "text-pink-800",
    border: "border-pink-200/80",
    dot: "bg-pink-500",
    barBg: "bg-pink-50/95 border-pink-300 text-pink-800 hover:bg-pink-100/90",
    barLine: "bg-pink-400",
  },
  PENGINGAT: {
    label: "Pengingat",
    bg: "bg-indigo-50/90 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/70",
    text: "text-indigo-700",
    border: "border-indigo-200/80",
    dot: "bg-indigo-500",
    barBg: "bg-indigo-50/95 border-indigo-300 text-indigo-800 hover:bg-indigo-100/90",
    barLine: "bg-indigo-400",
  },
  LAINNYA: {
    label: "Lainnya",
    bg: "bg-slate-50/90 text-slate-700 border-slate-200/80 hover:bg-slate-100/80",
    text: "text-slate-700",
    border: "border-slate-200/80",
    dot: "bg-slate-400",
    barBg: "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200/70",
    barLine: "bg-slate-400",
  },
};

const STATUS_CONFIG: Record<
  StatusAgenda,
  { label: string; bg: string; text: string }
> = {
  DIRENCANAKAN: { label: "Direncanakan", bg: "bg-slate-100", text: "text-slate-700" },
  BERLANGSUNG: { label: "Sedang Berlangsung", bg: "bg-blue-100", text: "text-blue-700" },
  SELESAI: { label: "Selesai", bg: "bg-emerald-100", text: "text-emerald-700" },
  DIBATALKAN: { label: "Dibatalkan", bg: "bg-rose-100", text: "text-rose-700" },
};

const DAYS_HEADER = [
  { short: "Sen", full: "Senin", isWeekend: false },
  { short: "Sel", full: "Selasa", isWeekend: false },
  { short: "Rab", full: "Rabu", isWeekend: false },
  { short: "Kam", full: "Kamis", isWeekend: false },
  { short: "Jum", full: "Jumat", isWeekend: false },
  { short: "Sab", full: "Sabtu", isWeekend: true, color: "text-amber-600 dark:text-amber-500" },
  { short: "Min", full: "Minggu", isWeekend: true, color: "text-rose-600 dark:text-rose-500" },
];

function parseLocalDay(dateStr: string): Date {
  const clean = dateStr.split("T")[0];
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

interface WeekSpanSegment {
  agenda: AgendaItemDTO;
  startCol: number; // 1..7
  endCol: number; // 1..7
  span: number; // 1..7
  continuesLeft: boolean;
  continuesRight: boolean;
  totalDays: number;
  lane: number;
}

export default function AgendaCalendarView({
  initialAgendas,
  initialHolidays = [],
  initialHolidaySource = "SKB 3 Menteri",
  initialYear,
}: {
  initialAgendas: AgendaItemDTO[];
  initialHolidays?: HolidayItem[];
  initialHolidaySource?: string;
  initialYear?: number;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendas, setAgendas] = useState<AgendaItemDTO[]>(initialAgendas);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // State Hari Libur Nasional per tahun
  const [holidaysByYear, setHolidaysByYear] = useState<Record<number, HolidayItem[]>>(() => {
    const yr = initialYear || new Date().getFullYear();
    return { [yr]: initialHolidays };
  });
  const [holidaySource, setHolidaySource] = useState<string>(initialHolidaySource);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeAgenda, setActiveAgenda] = useState<AgendaItemDTO | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State (untuk agenda manual)
  const [formId, setFormId] = useState<string | null>(null);
  const [formJudul, setFormJudul] = useState("");
  const [formKategori, setFormKategori] = useState<KategoriAgenda>("RAPAT");
  const [formTglMulai, setFormTglMulai] = useState("");
  const [formTglSelesai, setFormTglSelesai] = useState("");
  const [formWaktuMulai, setFormWaktuMulai] = useState("09:00");
  const [formWaktuSelesai, setFormWaktuSelesai] = useState("12:00");
  const [formLokasi, setFormLokasi] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formPic, setFormPic] = useState("");
  const [formStatus, setFormStatus] = useState<StatusAgenda>("DIRENCANAKAN");

  const activeYear = currentDate.getFullYear();

  // Fetch hari libur nasional jika user berpindah ke tahun lain yang belum dimuat
  useEffect(() => {
    if (holidaysByYear[activeYear]) return;
    let cancelled = false;
    getNationalHolidays(activeYear)
      .then((res) => {
        if (cancelled) return;
        setHolidaysByYear((prev) => ({ ...prev, [activeYear]: res.holidays }));
        setHolidaySource(res.source);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeYear, holidaysByYear]);

  // Map tanggal YYYY-MM-DD -> HolidayItem
  const holidayMap = useMemo(() => {
    const map = new Map<string, HolidayItem>();
    Object.values(holidaysByYear).forEach((list) => {
      list.forEach((h) => map.set(h.date, h));
    });
    return map;
  }, [holidaysByYear]);

  // Calendar Calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Senin
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const numWeeks = Math.ceil(days.length / 7);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < numWeeks; i++) {
      result.push(days.slice(i * 7, i * 7 + 7));
    }
    return result;
  }, [days, numWeeks]);

  const filteredAgendas = useMemo(() => {
    if (selectedCategory === "ALL") return agendas;
    if (selectedCategory === "SPJ_ONLY") {
      return agendas.filter((a) => a.sourceType === "SPJ_PERJADIN");
    }
    return agendas.filter((a) => a.kategori === selectedCategory);
  }, [agendas, selectedCategory]);

  // Apakah suatu agenda ditampilkan sebagai Horizontal Range Bar (Multi-hari atau SPJ Perjadin)
  const isRangeBarAgenda = (agenda: AgendaItemDTO) => {
    if (agenda.sourceType === "SPJ_PERJADIN") return true;
    if (!agenda.tanggalSelesai) return false;
    const s = parseLocalDay(agenda.tanggalMulai);
    const e = parseLocalDay(agenda.tanggalSelesai);
    return differenceInCalendarDays(e, s) >= 1;
  };

  // Hitung segmen bar rentang horizontal untuk 1 baris minggu (7 hari)
  const getWeekSpanSegments = (weekDays: Date[]): WeekSpanSegment[] => {
    const weekStart = startOfDay(weekDays[0]);
    const weekEnd = startOfDay(weekDays[6]);

    const rawSegments: Omit<WeekSpanSegment, "lane">[] = [];

    for (const agenda of filteredAgendas) {
      if (!isRangeBarAgenda(agenda)) continue;
      const evStart = parseLocalDay(agenda.tanggalMulai);
      const evEnd = agenda.tanggalSelesai ? parseLocalDay(agenda.tanggalSelesai) : evStart;

      if (evEnd < weekStart || evStart > weekEnd) continue;

      const clampedStart = evStart < weekStart ? weekStart : evStart;
      const clampedEnd = evEnd > weekEnd ? weekEnd : evEnd;

      const startCol = differenceInCalendarDays(clampedStart, weekStart) + 1;
      const endCol = differenceInCalendarDays(clampedEnd, weekStart) + 1;
      const span = Math.max(1, endCol - startCol + 1);
      const totalDays = Math.max(1, differenceInCalendarDays(evEnd, evStart) + 1);

      rawSegments.push({
        agenda,
        startCol,
        endCol,
        span,
        continuesLeft: evStart < weekStart,
        continuesRight: evEnd > weekEnd,
        totalDays,
      });
    }

    // Urutkan dari startCol terkecil, lalu durasi terpanjang
    rawSegments.sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return b.span - a.span;
    });

    // Alokasi jalur (lane) horizontal agar bar yang tidak bertabrakan sejajar rapi
    const laneEnds: number[] = [];
    const placed: WeekSpanSegment[] = [];

    for (const seg of rawSegments) {
      let assignedLane = -1;
      for (let l = 0; l < laneEnds.length; l++) {
        if (laneEnds[l] < seg.startCol) {
          assignedLane = l;
          laneEnds[l] = seg.endCol;
          break;
        }
      }
      if (assignedLane === -1) {
        assignedLane = laneEnds.length;
        laneEnds.push(seg.endCol);
      }
      placed.push({ ...seg, lane: assignedLane });
    }

    return placed;
  };

  // Agenda harian tunggal (bukan bar rentang) pada suatu tanggal
  const getSingleDayAgendasForDay = (day: Date) => {
    const target = startOfDay(day);
    return filteredAgendas.filter((agenda) => {
      if (isRangeBarAgenda(agenda)) return false;
      const start = parseLocalDay(agenda.tanggalMulai);
      return isSameDay(target, start);
    });
  };

  // Semua agenda (termasuk Perjadin & Multi-hari) pada suatu tanggal (untuk tampilan mobile & badge)
  const getAgendasForDay = (day: Date) => {
    const target = startOfDay(day).getTime();
    return filteredAgendas.filter((agenda) => {
      const start = parseLocalDay(agenda.tanggalMulai).getTime();
      const end = (agenda.tanggalSelesai ? parseLocalDay(agenda.tanggalSelesai) : parseLocalDay(agenda.tanggalMulai)).getTime();
      return target >= start && target <= end;
    });
  };

  const selectedDateAgendas = useMemo(
    () => getAgendasForDay(selectedDate),
    [selectedDate, filteredAgendas]
  );

  const selectedDateHoliday = useMemo(
    () => holidayMap.get(format(selectedDate, "yyyy-MM-dd")),
    [selectedDate, holidayMap]
  );

  const handleOpenAddModal = (date?: Date) => {
    const targetDate = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
    setFormId(null);
    setFormJudul("");
    setFormKategori("RAPAT");
    setFormTglMulai(targetDate);
    setFormTglSelesai(targetDate);
    setFormWaktuMulai("09:00");
    setFormWaktuSelesai("12:00");
    setFormLokasi("");
    setFormDeskripsi("");
    setFormPic("");
    setFormStatus("DIRENCANAKAN");
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (agenda: AgendaItemDTO) => {
    if (agenda.isReadOnly) return;
    setFormId(agenda.id);
    setFormJudul(agenda.judul);
    setFormKategori(agenda.kategori);
    setFormTglMulai(format(parseLocalDay(agenda.tanggalMulai), "yyyy-MM-dd"));
    setFormTglSelesai(
      agenda.tanggalSelesai ? format(parseLocalDay(agenda.tanggalSelesai), "yyyy-MM-dd") : ""
    );
    setFormWaktuMulai(agenda.waktuMulai || "09:00");
    setFormWaktuSelesai(agenda.waktuSelesai || "12:00");
    setFormLokasi(agenda.lokasi || "");
    setFormDeskripsi(agenda.deskripsi || "");
    setFormPic(agenda.pic || "");
    setFormStatus(agenda.status);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul || !formTglMulai) return;

    startTransition(async () => {
      if (formId) {
        await updateAgenda(formId, {
          judul: formJudul,
          kategori: formKategori,
          tanggalMulai: formTglMulai,
          tanggalSelesai: formTglSelesai || null,
          waktuMulai: formWaktuMulai,
          waktuSelesai: formWaktuSelesai,
          lokasi: formLokasi,
          deskripsi: formDeskripsi,
          pic: formPic,
          status: formStatus,
        });
        setAgendas((prev) =>
          prev.map((a) =>
            a.id === formId
              ? {
                  ...a,
                  judul: formJudul,
                  kategori: formKategori,
                  tanggalMulai: formTglMulai,
                  tanggalSelesai: formTglSelesai || null,
                  waktuMulai: formWaktuMulai,
                  waktuSelesai: formWaktuSelesai,
                  lokasi: formLokasi,
                  deskripsi: formDeskripsi,
                  pic: formPic,
                  status: formStatus,
                }
              : a
          )
        );
      } else {
        const res = await createAgenda({
          judul: formJudul,
          kategori: formKategori,
          tanggalMulai: formTglMulai,
          tanggalSelesai: formTglSelesai || null,
          waktuMulai: formWaktuMulai,
          waktuSelesai: formWaktuSelesai,
          lokasi: formLokasi,
          deskripsi: formDeskripsi,
          pic: formPic,
          status: formStatus,
        });
        const newAgenda: AgendaItemDTO = {
          id: res.id,
          judul: formJudul,
          kategori: formKategori,
          tanggalMulai: formTglMulai,
          tanggalSelesai: formTglSelesai || null,
          waktuMulai: formWaktuMulai,
          waktuSelesai: formWaktuSelesai,
          lokasi: formLokasi,
          deskripsi: formDeskripsi,
          pic: formPic,
          status: formStatus,
          isReadOnly: false,
          sourceType: "MANUAL",
        };
        setAgendas((prev) => [...prev, newAgenda]);
      }
      setIsFormOpen(false);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus agenda ini?")) return;
    startTransition(async () => {
      await deleteAgenda(id);
      setAgendas((prev) => prev.filter((a) => a.id !== id));
      setIsDetailOpen(false);
    });
  };

  const spjPerjadinCount = useMemo(
    () => agendas.filter((a) => a.sourceType === "SPJ_PERJADIN").length,
    [agendas]
  );

  // Daftar libur nasional pada bulan yang sedang aktif ditampilkan
  const currentMonthHolidays = useMemo(() => {
    const prefix = format(currentDate, "yyyy-MM");
    const list: HolidayItem[] = [];
    holidayMap.forEach((h) => {
      if (h.date.startsWith(prefix)) list.push(h);
    });
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [currentDate, holidayMap]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-3 sm:p-4 lg:p-5 overflow-y-auto md:overflow-hidden min-h-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2.5 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Agenda &amp; Perjalanan Dinas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau jadwal agenda tim, rentang perjalanan dinas (SPJ), dan hari libur nasional.
          </p>
        </div>

        {/* Controls: Navigasi Bulan & Hari Ini Saja (Tombol aksi & filter dipindah ke panel samping) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentDate(now);
              setSelectedDate(now);
            }}
            className="h-8 sm:h-8.5 px-2.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-none text-xs font-medium rounded-lg"
          >
            Hari Ini
          </Button>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-1.5 sm:px-2.5 text-xs font-semibold text-slate-800 min-w-[100px] sm:min-w-[120px] text-center capitalize">
              {format(currentDate, "MMMM yyyy", { locale: idLocale })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Workspace (Kalender Utama + Panel Samping Aksi & Inspektor) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* Calendar Grid Container (Kiri) */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden min-h-0 shadow-xs">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center py-2 flex-shrink-0">
          {DAYS_HEADER.map((day) => (
            <span
              key={day.short}
              title={day.full}
              className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                day.color || "text-slate-500"
              }`}
            >
              {day.short}
            </span>
          ))}
        </div>

        {/* Weeks Rows Grid */}
        <div
          className="flex-1 grid divide-y divide-slate-200/80 min-h-0 overflow-y-auto"
          style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(95px, 1fr))` }}
        >
          {weeks.map((weekDays, wIdx) => {
            const spanSegments = getWeekSpanSegments(weekDays);

            return (
              <div key={wIdx} className="relative flex flex-col min-h-0 select-none">
                {/* Layer 1: Background 7 Kolom Hari (Klik untuk tambah agenda) */}
                <div className="absolute inset-0 grid grid-cols-7 divide-x divide-slate-200/80">
                  {weekDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const holiday = holidayMap.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isSunday = day.getDay() === 0;
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                      <div
                        key={dateKey}
                        onClick={() => {
                          setSelectedDate(day);
                        }}
                        className={`h-full transition-colors cursor-pointer group ${
                          !isCurrentMonth
                            ? "bg-slate-50/60"
                            : holiday && !holiday.isCutiBersama
                            ? "bg-rose-50/25 hover:bg-rose-50/50"
                            : holiday && holiday.isCutiBersama
                            ? "bg-amber-50/20 hover:bg-amber-50/40"
                            : isSunday
                            ? "bg-rose-50/10 hover:bg-slate-50/90"
                            : "bg-white hover:bg-slate-50/90"
                        } ${
                          isSelected
                            ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/30"
                            : ""
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Layer 2: Baris Nomor Tanggal & Label Libur Nasional */}
                <div className="relative z-10 grid grid-cols-7 pointer-events-none">
                  {weekDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const holiday = holidayMap.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isDayToday = isToday(day);
                    const isSunday = day.getDay() === 0;
                    const isSaturday = day.getDay() === 6;
                    const dayAgendas = getAgendasForDay(day);

                    return (
                      <div
                        key={dateKey}
                        className="px-1.5 pt-1 pb-0.5 flex flex-col min-w-0"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span
                              className={`inline-flex items-center justify-center text-[11px] md:text-xs rounded-full w-5 h-5 md:w-6 md:h-6 shrink-0 transition-all ${
                                isDayToday
                                  ? "bg-primary text-white font-bold shadow-xs"
                                  : !isCurrentMonth
                                  ? "text-slate-300 font-normal"
                                  : holiday && !holiday.isCutiBersama
                                  ? "text-rose-600 font-bold bg-rose-100/70"
                                  : isSunday
                                  ? "text-rose-600 font-bold"
                                  : isSaturday
                                  ? "text-amber-600 font-semibold"
                                  : "text-slate-700 font-semibold"
                              }`}
                            >
                              {format(day, "d")}
                            </span>

                            {/* Label Hari Libur Nasional di Samping Nomor Tanggal */}
                            {holiday && (
                              <span
                                title={holiday.name}
                                className={`hidden md:inline-block text-[9.5px] leading-tight font-semibold truncate px-1 py-0.2 rounded ${
                                  holiday.isCutiBersama
                                    ? "text-amber-700 bg-amber-100/70"
                                    : "text-rose-700 bg-rose-100/70"
                                }`}
                              >
                                {holiday.name}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddModal(day);
                            }}
                            title="Tambah agenda pada tanggal ini"
                            className="pointer-events-auto opacity-0 hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-primary transition-opacity hidden md:inline-flex p-0.5 rounded hover:bg-slate-200/60"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Mobile Dots Indicator */}
                        <div className="flex md:hidden items-center justify-center gap-0.5 mt-1">
                          {holiday && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                holiday.isCutiBersama ? "bg-amber-500" : "bg-rose-600"
                              }`}
                              title={holiday.name}
                            />
                          )}
                          {dayAgendas.slice(0, 3).map((a) => {
                            const config =
                              KATEGORI_CONFIG[a.kategori] || KATEGORI_CONFIG.LAINNYA;
                            return (
                              <span
                                key={a.id}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  a.sourceType === "SPJ_PERJADIN"
                                    ? "bg-indigo-600"
                                    : config.dot
                                }`}
                              />
                            );
                          })}
                          {dayAgendas.length > 3 && (
                            <span className="text-[8px] font-bold text-slate-400">
                              +{dayAgendas.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Layer 3 (Desktop): Multi-Day & SPJ Perjadin Horizontal Range Bars */}
                {spanSegments.length > 0 && (
                  <div className="hidden md:grid grid-cols-7 gap-y-0.5 px-1 py-0.5 relative z-10">
                    {spanSegments.map((seg) => {
                      const { agenda, startCol, span, continuesLeft, continuesRight, totalDays } =
                        seg;
                      const isSpj = agenda.sourceType === "SPJ_PERJADIN";
                      const config =
                        KATEGORI_CONFIG[agenda.kategori] || KATEGORI_CONFIG.LAINNYA;

                      const startDayStr = format(parseLocalDay(agenda.tanggalMulai), "d MMM", {
                        locale: idLocale,
                      });
                      const endDayStr = agenda.tanggalSelesai
                        ? format(parseLocalDay(agenda.tanggalSelesai), "d MMM", {
                            locale: idLocale,
                          })
                        : startDayStr;

                      return (
                        <div
                          key={`${agenda.id}-w${wIdx}`}
                          style={{
                            gridColumn: `${startCol} / span ${span}`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAgenda(agenda);
                            setIsDetailOpen(true);
                          }}
                          title={`${agenda.judul} (${startDayStr} - ${endDayStr}) • Klik untuk rincian`}
                          className={`group/bar relative flex items-center justify-between gap-1 px-1.5 py-[2px] text-[9.5px] font-semibold border shadow-2xs cursor-pointer transition-all hover:shadow-sm hover:brightness-[0.98] mx-0.5 ${
                            continuesLeft ? "rounded-l-none border-l-0 ml-0" : "rounded-l-md border-l-[3px]"
                          } ${
                            continuesRight ? "rounded-r-none border-r-0 mr-0" : "rounded-r-md"
                          } ${
                            isSpj
                              ? "bg-gradient-to-r from-indigo-50/95 via-sky-50/90 to-indigo-50/95 border-indigo-300 border-l-indigo-600 text-indigo-950"
                              : `${config.barBg}`
                          }`}
                        >
                          {/* Bagian Kiri: Ikon + Badge SPJ + Nama Tujuan/Personel */}
                          <div className="flex items-center gap-1 min-w-0 shrink">
                            {continuesLeft && (
                              <span className="text-[8px] text-indigo-500 font-bold shrink-0">
                                ◀
                              </span>
                            )}
                            {isSpj ? (
                              <span className="inline-flex items-center gap-0.5 px-1 py-[1px] rounded bg-indigo-600 text-white text-[7.5px] font-bold uppercase tracking-wider shrink-0">
                                <Plane className="w-2 h-2" />
                                SPJ
                              </span>
                            ) : (
                              <span
                                className={`w-1 h-1 rounded-full shrink-0 ${config.dot}`}
                              />
                            )}
                            <span className="truncate">{agenda.judul}</span>
                          </div>

                          {/* Garis Rentang Horizontal Ramping (Visual Range Line dari Tanggal Mulai ke Tanggal Selesai) */}
                          {span >= 2 && (
                            <div className="flex-1 flex items-center min-w-[16px] mx-1 opacity-70">
                              <span
                                className={`w-1 h-1 rounded-full shrink-0 ${
                                  isSpj ? "bg-indigo-600" : config.barLine
                                }`}
                              />
                              <div
                                className={`flex-1 h-[1px] ${
                                  isSpj
                                    ? "bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600"
                                    : config.barLine
                                }`}
                              />
                              <span
                                className={`w-1 h-1 rounded-full shrink-0 ${
                                  isSpj ? "bg-indigo-600" : config.barLine
                                }`}
                              />
                            </div>
                          )}

                          {/* Bagian Kanan: Info Durasi Hari & Pintasan ke SPJ */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[8.5px] font-mono px-1 py-0 rounded ${
                                isSpj
                                  ? "bg-indigo-100/90 text-indigo-800"
                                  : "bg-black/5 text-slate-700"
                              }`}
                            >
                              {totalDays > 1 ? `${totalDays} hr` : startDayStr}
                            </span>
                            {isSpj && agenda.spjId && (
                              <Link
                                href={`/dashboard/spj/${agenda.spjId}`}
                                onClick={(e) => e.stopPropagation()}
                                title="Langsung buka halaman Detail SPJ"
                                className="p-0.5 rounded bg-white/80 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-colors border border-indigo-200/80"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            )}
                            {continuesRight && (
                              <span className="text-[8px] text-indigo-500 font-bold">▶</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Layer 4 (Desktop): Single-Day Agendas per Kolom Hari */}
                <div className="hidden md:grid grid-cols-7 flex-1 min-h-0 relative z-10 pointer-events-none">
                  {weekDays.map((day) => {
                    const singleAgendas = getSingleDayAgendasForDay(day);
                    const colIdx = weekDays.findIndex((d) => isSameDay(d, day)) + 1;
                    const hasRangeBar = spanSegments.some(
                      (seg) => colIdx >= seg.startCol && colIdx <= seg.endCol
                    );
                    const maxVisible = hasRangeBar ? 1 : 2;
                    const visibleAgendas = singleAgendas.slice(0, maxVisible);
                    const hiddenCount = singleAgendas.length - maxVisible;

                    return (
                      <div
                        key={day.toISOString()}
                        className="px-1 pb-1 flex flex-col gap-0.5 overflow-hidden"
                      >
                        {visibleAgendas.map((agenda) => {
                          const config =
                            KATEGORI_CONFIG[agenda.kategori] || KATEGORI_CONFIG.LAINNYA;
                          return (
                            <div
                              key={agenda.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAgenda(agenda);
                                setIsDetailOpen(true);
                                setSelectedDate(day);
                              }}
                              className={`pointer-events-auto text-[9px] sm:text-[9.5px] px-1 py-[1.5px] rounded-sm border ${config.bg} ${config.text} ${config.border} truncate font-medium flex items-center justify-between gap-1 hover:brightness-[0.98] transition-all cursor-pointer flex-shrink-0 leading-tight`}
                              title={agenda.judul}
                            >
                              <span className="truncate flex items-center gap-1 min-w-0">
                                <span
                                  className={`w-1 h-1 rounded-full shrink-0 ${config.dot}`}
                                />
                                <span className="truncate">{agenda.judul}</span>
                              </span>
                              {agenda.waktuMulai && (
                                <span className="text-[8px] font-mono opacity-70 shrink-0 ml-0.5">
                                  {agenda.waktuMulai}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {hiddenCount > 0 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(day);
                            }}
                            className="pointer-events-auto text-[8.5px] font-bold text-slate-500 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 px-1 py-0.5 rounded text-center cursor-pointer transition-colors leading-none"
                            title={`Klik untuk lihat ${hiddenCount} agenda lainnya di panel samping`}
                          >
                            +{hiddenCount} lagi
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Legend & Hari Libur Bulan Ini */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-indigo-900">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-300 text-indigo-700 text-[9px] font-bold">
                ●━━● SPJ
              </span>
              <span>Rentang Perjalanan Dinas (Read-Only • Klik ke SPJ)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Libur Nasional</span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Cuti Bersama</span>
            </span>
          </div>

          {currentMonthHolidays.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              {currentMonthHolidays.map((h) => (
                <span
                  key={h.date}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                    h.isCutiBersama
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span>{format(parseLocalDay(h.date), "d MMM", { locale: idLocale })}:</span>
                  <span>{h.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel Samping Kanan (Aksi, Filter & Inspektor Hari Terpilih) */}
      <div className="hidden lg:flex flex-col w-64 xl:w-70 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs shrink-0 text-xs">
        {/* Header Aksi & Filter */}
        <div className="p-2.5 border-b border-slate-200 bg-slate-50/70 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-500">
              Aksi &amp; Filter
            </span>
            <span className="font-mono font-medium text-slate-400">
              {filteredAgendas.length} Agenda
            </span>
          </div>

          {/* Tombol Utama: + Tambah Agenda */}
          <Button
            size="sm"
            onClick={() => handleOpenAddModal(selectedDate)}
            className="w-full h-7 sm:h-7 text-[11px] sm:text-[11px] font-medium gap-1 shadow-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-md justify-center px-2 py-0"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah Agenda</span>
          </Button>

          {/* Tombol Sekunder: Edit Cepat & Import Excel (Grid 2 Kolom) */}
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/dashboard/agenda/edit-cepat"
              className="inline-flex items-center justify-center w-full h-7 sm:h-7 px-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-[11px] sm:text-[11px] font-medium rounded-md gap-1 transition-colors shadow-none"
              title="Buka halaman spreadsheet untuk edit cepat massal"
            >
              <Table2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <span className="truncate">Edit Cepat</span>
            </Link>

            <AgendaExcelActions className="w-full h-7 sm:h-7 px-1.5 text-[11px] sm:text-[11px] justify-center rounded-md gap-1 shadow-none" />
          </div>

          {/* Filter Kategori */}
          <div>
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                if (val) setSelectedCategory(val);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full h-7 sm:h-7 text-[11px] sm:text-[11px] bg-white border-slate-200 text-slate-700 shadow-none font-medium rounded-md px-2 py-0"
              >
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Agenda ({agendas.length})
                </SelectItem>
                <SelectItem value="SPJ_ONLY" className="text-xs font-semibold text-indigo-700">
                  <div className="flex items-center gap-1.5">
                    <Plane className="w-3 h-3 text-indigo-600" />
                    <span>Khusus SPJ Perjadin ({spjPerjadinCount})</span>
                  </div>
                </SelectItem>
                {(Object.keys(KATEGORI_CONFIG) as KategoriAgenda[]).map((kat) => (
                  <SelectItem key={kat} value={kat} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${KATEGORI_CONFIG[kat].dot}`} />
                      <span>
                        {KATEGORI_CONFIG[kat].label} (
                        {agendas.filter((a) => a.kategori === kat).length})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Header Rincian Hari Terpilih */}
        <div className="px-2.5 py-1.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              <h3 className="text-[11px] font-bold text-slate-800 capitalize truncate">
                {format(selectedDate, "EEEE, d MMM yyyy", { locale: idLocale })}
              </h3>
              {isToday(selectedDate) && (
                <span className="text-[8px] px-1 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider shrink-0">
                  Hari Ini
                </span>
              )}
            </div>
            {selectedDateHoliday ? (
              <p className="text-[9.5px] text-rose-600 font-semibold flex items-center gap-1 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span className="truncate">{selectedDateHoliday.name}</span>
              </p>
            ) : (
              <p className="text-[9.5px] text-slate-400 mt-0.5">
                {selectedDateAgendas.length} agenda pada tanggal ini
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleOpenAddModal(selectedDate)}
            title="Tambah agenda di tanggal ini"
            className="h-6 w-6 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md shrink-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* List Agenda Tanggal Terpilih (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {selectedDateAgendas.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-medium text-slate-600">Tidak ada agenda</p>
              <p className="text-[9.5px] text-slate-400 max-w-[170px] mt-0.5 mb-2">
                Belum ada agenda atau perjalanan dinas yang dijadwalkan pada hari ini.
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => handleOpenAddModal(selectedDate)}
                className="text-[10px] gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-6 px-2"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Jadwalkan Agenda</span>
              </Button>
            </div>
          ) : (
            selectedDateAgendas.map((agenda) => {
              const isSpj = agenda.sourceType === "SPJ_PERJADIN";
              const config = KATEGORI_CONFIG[agenda.kategori] || KATEGORI_CONFIG.LAINNYA;

              return (
                <div
                  key={agenda.id}
                  onClick={() => {
                    setActiveAgenda(agenda);
                    setIsDetailOpen(true);
                  }}
                  className={`p-2 rounded-lg border transition-all cursor-pointer hover:shadow-xs group ${
                    isSpj
                      ? "bg-gradient-to-br from-indigo-50/90 to-sky-50/50 border-indigo-200 hover:border-indigo-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Top row: badge & waktu */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    {isSpj ? (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-indigo-600 text-white text-[7.5px] font-bold tracking-wide uppercase">
                        <Plane className="w-2 h-2" />
                        SPJ PERJADIN
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-1 py-0.2 rounded text-[8.5px] font-semibold border ${config.bg} ${config.text} ${config.border}`}
                      >
                        <span className={`w-1 h-1 rounded-full ${config.dot}`} />
                        <span>{config.label}</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {agenda.waktuMulai && (
                        <span className="text-[8.5px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded font-medium">
                          {agenda.waktuMulai}
                        </span>
                      )}
                      {isSpj && agenda.spjId && (
                        <Link
                          href={`/dashboard/spj/${agenda.spjId}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Lihat Detail SPJ"
                          className="p-0.5 rounded bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-[11px] font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                    {agenda.judul}
                  </h4>

                  {/* Lokasi / PIC */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-slate-500">
                    {agenda.lokasi && (
                      <span className="flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{agenda.lokasi}</span>
                      </span>
                    )}
                    {agenda.pic && (
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{agenda.pic}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Panel Samping */}
        <div className="p-2 bg-slate-50 border-t border-slate-200 text-[9.5px] text-slate-500 flex items-center justify-between shrink-0 font-medium">
          <span>Bulan ini: {filteredAgendas.length} kegiatan</span>
          <span className="text-indigo-700 font-semibold">{spjPerjadinCount} SPJ Aktif</span>
        </div>
      </div>
    </div>

      {/* Mobile Selected Date Agenda List (Beneath Calendar) */}
      <div className="lg:hidden mt-3 bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-slate-800 capitalize truncate">
              {format(selectedDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenAddModal(selectedDate)}
            className="h-7 px-2 text-[11px] gap-1 shadow-none border-slate-200 text-slate-700 shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah</span>
          </Button>
        </div>

        {/* Info Libur Nasional di Mobile */}
        {(() => {
          const mobHoliday = holidayMap.get(format(selectedDate, "yyyy-MM-dd"));
          if (!mobHoliday) return null;
          return (
            <div
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                mobHoliday.isCutiBersama
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  mobHoliday.isCutiBersama ? "bg-amber-500" : "bg-rose-600"
                }`}
              />
              <span>
                {mobHoliday.isCutiBersama ? "Cuti Bersama: " : "Hari Libur Nasional: "}
                {mobHoliday.name}
              </span>
            </div>
          );
        })()}

        {getAgendasForDay(selectedDate).length === 0 ? (
          <p className="text-xs text-slate-400 py-2 text-center bg-slate-50 rounded-lg">
            Tidak ada agenda atau perjalanan dinas pada tanggal ini.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
            {getAgendasForDay(selectedDate).map((agenda) => {
              const isSpj = agenda.sourceType === "SPJ_PERJADIN";
              const config = KATEGORI_CONFIG[agenda.kategori] || KATEGORI_CONFIG.LAINNYA;
              return (
                <div
                  key={agenda.id}
                  onClick={() => {
                    setActiveAgenda(agenda);
                    setIsDetailOpen(true);
                  }}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 cursor-pointer transition-all active:scale-[0.99] ${
                    isSpj
                      ? "bg-indigo-50/80 border-indigo-200 text-indigo-950"
                      : `${config.bg} ${config.border}`
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {isSpj ? (
                      <Plane className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                    ) : (
                      <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${config.dot}`} />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isSpj && (
                          <span className="px-1 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-bold">
                            SPJ
                          </span>
                        )}
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSpj ? "text-indigo-950" : config.text
                          }`}
                        >
                          {agenda.judul}
                        </p>
                      </div>
                      {agenda.deskripsi && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {agenda.deskripsi}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSpj && agenda.spjId ? (
                    <Link
                      href={`/dashboard/spj/${agenda.spjId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-semibold px-2 py-1 rounded bg-indigo-600 text-white shrink-0 flex items-center gap-1"
                    >
                      <span>SPJ</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  ) : (
                    agenda.waktuMulai && (
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/5 text-slate-600 shrink-0">
                        {agenda.waktuMulai}
                      </span>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETAIL AGENDA / PERJALANAN DINAS (READ-ONLY UNTUK SPJ) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {activeAgenda && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4 mb-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`${KATEGORI_CONFIG[activeAgenda.kategori]?.bg} ${KATEGORI_CONFIG[activeAgenda.kategori]?.text} ${KATEGORI_CONFIG[activeAgenda.kategori]?.border}`}
                    >
                      {KATEGORI_CONFIG[activeAgenda.kategori]?.label}
                    </Badge>
                    {activeAgenda.isReadOnly && (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] gap-1 font-semibold"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        Data SPJ (Read-Only)
                      </Badge>
                    )}
                  </div>
                  <Badge
                    className={`${STATUS_CONFIG[activeAgenda.status]?.bg} ${STATUS_CONFIG[activeAgenda.status]?.text} text-[11px]`}
                  >
                    {STATUS_CONFIG[activeAgenda.status]?.label}
                  </Badge>
                </div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {activeAgenda.judul}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2 text-sm text-slate-700">
                {/* Tanggal & Rentang Waktu */}
                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                  <CalendarIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                      {format(parseLocalDay(activeAgenda.tanggalMulai), "EEEE, d MMMM yyyy", {
                        locale: idLocale,
                      })}
                      {activeAgenda.tanggalSelesai &&
                        !isSameDay(
                          parseLocalDay(activeAgenda.tanggalMulai),
                          parseLocalDay(activeAgenda.tanggalSelesai)
                        ) && (
                          <span>
                            {" s/d "}
                            {format(
                              parseLocalDay(activeAgenda.tanggalSelesai),
                              "EEEE, d MMMM yyyy",
                              {
                                locale: idLocale,
                              }
                            )}
                          </span>
                        )}
                    </p>
                    {activeAgenda.spjMeta ? (
                      <p className="text-xs text-indigo-700 font-semibold mt-0.5">
                        Durasi Perjalanan: {activeAgenda.spjMeta.lamaPerjalanan} Hari • Angkutan:{" "}
                        {activeAgenda.spjMeta.alatAngkut}
                      </p>
                    ) : (
                      (activeAgenda.waktuMulai || activeAgenda.waktuSelesai) && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {activeAgenda.waktuMulai || "00:00"}
                          {activeAgenda.waktuSelesai
                            ? ` - ${activeAgenda.waktuSelesai} WITA`
                            : " WITA"}
                        </p>
                      )
                    )}
                  </div>
                </div>

                {/* Rute / Lokasi */}
                {activeAgenda.lokasi && (
                  <div className="flex items-center gap-2.5 px-1 text-slate-700 text-xs sm:text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      Rute / Lokasi: <strong>{activeAgenda.lokasi}</strong>
                    </span>
                  </div>
                )}

                {/* Daftar Personel SPJ atau PIC */}
                {activeAgenda.spjMeta?.rosterNames &&
                activeAgenda.spjMeta.rosterNames.length > 0 ? (
                  <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-1.5">
                    <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Personel Pelaksana ({activeAgenda.spjMeta.rosterNames.length} Orang)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeAgenda.spjMeta.rosterNames.map((nama, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-white text-slate-800 border border-indigo-200/80 px-2 py-0.5 rounded-md font-medium"
                        >
                          {idx + 1}. {nama}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  activeAgenda.pic && (
                    <div className="flex items-center gap-2.5 px-1 text-slate-600 text-xs sm:text-sm">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        PIC / Penanggung Jawab: <strong>{activeAgenda.pic}</strong>
                      </span>
                    </div>
                  )
                )}

                {/* Perihal / Deskripsi */}
                {activeAgenda.deskripsi && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {activeAgenda.isReadOnly ? "Perihal SPJ:" : "Deskripsi / Catatan:"}
                    </p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {activeAgenda.deskripsi}
                    </p>
                  </div>
                )}

                {/* Meta Anggaran SPJ */}
                {activeAgenda.spjMeta && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                        Total Biaya SPJ
                      </span>
                      <span className="font-mono font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                        <Wallet className="w-3 h-3 text-indigo-600" />
                        {formatCurrency(activeAgenda.spjMeta.totalPengeluaran || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                        Status Pencairan
                      </span>
                      <span
                        className={`inline-block mt-0.5 font-semibold ${
                          activeAgenda.spjMeta.terbayar
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }`}
                      >
                        {activeAgenda.spjMeta.terbayar ? "Sudah Terbayar" : "Belum Terbayar"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 pt-3">
                {activeAgenda.isReadOnly && activeAgenda.spjId ? (
                  <>
                    <span className="text-[11px] text-slate-400 italic">
                      Data bersumber dari modul SPJ
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDetailOpen(false)}
                      >
                        Tutup
                      </Button>
                      <Link href={`/dashboard/spj/${activeAgenda.spjId}`}>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 font-semibold"
                        >
                          <span>Buka Detail SPJ</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(activeAgenda.id)}
                      disabled={isPending}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Hapus
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDetailOpen(false)}
                      >
                        Tutup
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenEditModal(activeAgenda)}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                    </div>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL FORM TAMBAH / EDIT AGENDA MANUAL */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleSaveForm}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {formId ? "Edit Agenda Kegiatan" : "Tambah Agenda Baru"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-sm">
              {/* Judul Kegiatan */}
              <div className="space-y-1.5">
                <Label htmlFor="judul" className="text-xs font-semibold text-slate-700">
                  Nama / Judul Kegiatan *
                </Label>
                <Input
                  id="judul"
                  placeholder="Contoh: Rapat Evaluasi SPBE Triwulan II"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  required
                />
              </div>

              {/* Kategori & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Kategori</Label>
                  <Select
                    value={formKategori}
                    onValueChange={(val) => setFormKategori(val as KategoriAgenda)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RAPAT">Rapat</SelectItem>
                      <SelectItem value="PERJALANAN_DINAS">Perjalanan Dinas</SelectItem>
                      <SelectItem value="SOSIALISASI">Sosialisasi / Bimtek</SelectItem>
                      <SelectItem value="MONITORING_EVALUASI">Monev</SelectItem>
                      <SelectItem value="ACARA_INTERNAL">Acara Internal</SelectItem>
                      <SelectItem value="PENGINGAT">Pengingat</SelectItem>
                      <SelectItem value="LAINNYA">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Status</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(val) => setFormStatus(val as StatusAgenda)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
                      <SelectItem value="BERLANGSUNG">Sedang Berlangsung</SelectItem>
                      <SelectItem value="SELESAI">Selesai</SelectItem>
                      <SelectItem value="DIBATALKAN">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tglMulai" className="text-xs font-semibold text-slate-700">
                    Tanggal Mulai *
                  </Label>
                  <Input
                    id="tglMulai"
                    type="date"
                    value={formTglMulai}
                    onChange={(e) => setFormTglMulai(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tglSelesai" className="text-xs font-semibold text-slate-700">
                    Tanggal Selesai (Opsional)
                  </Label>
                  <Input
                    id="tglSelesai"
                    type="date"
                    value={formTglSelesai}
                    onChange={(e) => setFormTglSelesai(e.target.value)}
                  />
                </div>
              </div>

              {/* Jam / Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="waktuMulai" className="text-xs font-semibold text-slate-700">
                    Jam Mulai (WITA)
                  </Label>
                  <Input
                    id="waktuMulai"
                    type="time"
                    value={formWaktuMulai}
                    onChange={(e) => setFormWaktuMulai(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="waktuSelesai" className="text-xs font-semibold text-slate-700">
                    Jam Selesai (WITA)
                  </Label>
                  <Input
                    id="waktuSelesai"
                    type="time"
                    value={formWaktuSelesai}
                    onChange={(e) => setFormWaktuSelesai(e.target.value)}
                  />
                </div>
              </div>

              {/* Lokasi & PIC */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lokasi" className="text-xs font-semibold text-slate-700">
                    Lokasi / Tempat
                  </Label>
                  <Input
                    id="lokasi"
                    placeholder="Ruang Rapat / Samarinda"
                    value={formLokasi}
                    onChange={(e) => setFormLokasi(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pic" className="text-xs font-semibold text-slate-700">
                    PIC / Penanggung Jawab
                  </Label>
                  <Input
                    id="pic"
                    placeholder="Nama PIC"
                    value={formPic}
                    onChange={(e) => setFormPic(e.target.value)}
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label htmlFor="deskripsi" className="text-xs font-semibold text-slate-700">
                  Catatan / Keterangan Tambahan
                </Label>
                <Textarea
                  id="deskripsi"
                  placeholder="Detail agenda, perlengkapan yang disiapkan, agenda pembahasan..."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {isPending ? "Menyimpan..." : formId ? "Simpan Perubahan" : "Tambah Agenda"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        primaryAction={
          <Button
            onClick={() => handleOpenAddModal(selectedDate)}
            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Agenda
          </Button>
        }
        secondaryDrawer={{
          title: "Opsi Agenda Kegiatan",
          description: "Navigasi kalender dan ekspor data agenda",
          children: (close) => (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  close();
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDate(now);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                      Hari Ini
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Lompat langsung ke tanggal dan bulan hari ini
                    </p>
                  </div>
                </div>
              </button>

              <Link
                href="/dashboard/agenda/edit-cepat"
                onClick={() => close()}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Table2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                      Edit Cepat (Mode Spreadsheet)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Buka halaman tabel untuk ubah, hapus, & tambah kegiatan massal
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ),
        }}
      />
    </div>
  );
}
