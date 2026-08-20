"use client";

import { useState, useTransition } from "react";
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
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
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
import { createAgenda, updateAgenda, deleteAgenda } from "@/app/actions/agenda";
import { KategoriAgenda, StatusAgenda } from "@prisma/client";
import { AgendaExcelActions } from "./AgendaExcelActions";

interface AgendaItem {
  id: string;
  judul: string;
  kategori: KategoriAgenda;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  waktuMulai: string | null;
  waktuSelesai: string | null;
  lokasi: string | null;
  deskripsi: string | null;
  pic: string | null;
  status: StatusAgenda;
}

const KATEGORI_CONFIG: Record<
  KategoriAgenda,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  RAPAT: {
    label: "Rapat",
    bg: "bg-blue-50/90 text-blue-700 border-blue-200/80 hover:bg-blue-100/70",
    text: "text-blue-700",
    border: "border-blue-200/80",
    dot: "bg-blue-500",
  },
  PERJALANAN_DINAS: {
    label: "Perjalanan Dinas",
    bg: "bg-amber-50/90 text-amber-800 border-amber-200/80 hover:bg-amber-100/70",
    text: "text-amber-800",
    border: "border-amber-200/80",
    dot: "bg-amber-500",
  },
  SOSIALISASI: {
    label: "Sosialisasi / Bimtek",
    bg: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/70",
    text: "text-emerald-800",
    border: "border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  MONITORING_EVALUASI: {
    label: "Monev",
    bg: "bg-purple-50/90 text-purple-800 border-purple-200/80 hover:bg-purple-100/70",
    text: "text-purple-800",
    border: "border-purple-200/80",
    dot: "bg-purple-500",
  },
  ACARA_INTERNAL: {
    label: "Acara Internal",
    bg: "bg-pink-50/90 text-pink-800 border-pink-200/80 hover:bg-pink-100/70",
    text: "text-pink-800",
    border: "border-pink-200/80",
    dot: "bg-pink-500",
  },
  PENGINGAT: {
    label: "Pengingat",
    bg: "bg-indigo-50/90 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/70",
    text: "text-indigo-700",
    border: "border-indigo-200/80",
    dot: "bg-indigo-500",
  },
  LAINNYA: {
    label: "Lainnya",
    bg: "bg-slate-50/90 text-slate-700 border-slate-200/80 hover:bg-slate-100/80",
    text: "text-slate-700",
    border: "border-slate-200/80",
    dot: "bg-slate-400",
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

export default function AgendaCalendarView({ initialAgendas }: { initialAgendas: AgendaItem[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendas, setAgendas] = useState<AgendaItem[]>(initialAgendas);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedMobileDate, setSelectedMobileDate] = useState<Date>(new Date());

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeAgenda, setActiveAgenda] = useState<AgendaItem | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form State
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

  // Calendar Calculation
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Senin
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const numWeeks = Math.ceil(days.length / 7);

  const filteredAgendas =
    selectedCategory === "ALL"
      ? agendas
      : agendas.filter((a) => a.kategori === selectedCategory);

  const getAgendasForDay = (day: Date) => {
    return filteredAgendas.filter((agenda) => {
      const start = parseISO(agenda.tanggalMulai);
      const end = agenda.tanggalSelesai ? parseISO(agenda.tanggalSelesai) : start;
      const dayTime = day.getTime();
      return (
        isSameDay(day, start) ||
        isSameDay(day, end) ||
        (dayTime >= start.getTime() && dayTime <= end.getTime())
      );
    });
  };

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

  const handleOpenEditModal = (agenda: AgendaItem) => {
    setFormId(agenda.id);
    setFormJudul(agenda.judul);
    setFormKategori(agenda.kategori);
    setFormTglMulai(format(parseISO(agenda.tanggalMulai), "yyyy-MM-dd"));
    setFormTglSelesai(agenda.tanggalSelesai ? format(parseISO(agenda.tanggalSelesai), "yyyy-MM-dd") : "");
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
                  tanggalMulai: new Date(formTglMulai).toISOString(),
                  tanggalSelesai: formTglSelesai ? new Date(formTglSelesai).toISOString() : null,
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
        const newAgenda: AgendaItem = {
          id: res.id,
          judul: formJudul,
          kategori: formKategori,
          tanggalMulai: new Date(formTglMulai).toISOString(),
          tanggalSelesai: formTglSelesai ? new Date(formTglSelesai).toISOString() : null,
          waktuMulai: formWaktuMulai,
          waktuSelesai: formWaktuSelesai,
          lokasi: formLokasi,
          deskripsi: formDeskripsi,
          pic: formPic,
          status: formStatus,
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 p-3 sm:p-4 lg:p-5 overflow-y-auto md:overflow-hidden min-h-0">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Agenda Kegiatan Tim</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-medium">
              Kalender
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola, jadwalkan, dan pantau aktivitas tim kerja secara real-time.
          </p>
        </div>

        {/* Controls: Filter Selector, Hari Ini, Navigasi Bulan, Tambah Agenda */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Selector Filter Kategori */}
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              if (val) setSelectedCategory(val);
            }}
          >
            <SelectTrigger className="h-8 sm:h-8.5 w-[135px] sm:w-[155px] text-xs bg-white border-slate-200 text-slate-700 shadow-none font-medium rounded-lg">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Kategori ({agendas.length})</SelectItem>
              {(Object.keys(KATEGORI_CONFIG) as KategoriAgenda[]).map((kat) => (
                <SelectItem key={kat} value={kat} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${KATEGORI_CONFIG[kat].dot}`} />
                    <span>{KATEGORI_CONFIG[kat].label} ({agendas.filter((a) => a.kategori === kat).length})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentDate(now);
              setSelectedMobileDate(now);
            }}
            className="h-8 sm:h-8.5 px-2.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-none text-xs font-medium rounded-lg"
          >
            Hari Ini
          </Button>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
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

          <AgendaExcelActions />

          <Button
            size="sm"
            onClick={() => handleOpenAddModal(selectedMobileDate)}
            className="h-8 sm:h-8.5 text-xs font-medium rounded-lg shadow-none gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Calendar Grid Container (Full height, No outer scroll) */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden min-h-0">
        {/* Days Header (Singkat) */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center py-2 sm:py-2.5 flex-shrink-0">
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

        {/* Days Cells Grid */}
        <div
          className="flex-1 grid grid-cols-7 gap-[1px] bg-slate-200/80 min-h-0"
          style={{ gridTemplateRows: `repeat(${numWeeks}, minmax(0, 1fr))` }}
        >
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);
            const dayAgendas = getAgendasForDay(day);
            const isMobileSelected = isSameDay(day, selectedMobileDate);

            return (
              <div
                key={day.toISOString()}
                onClick={() => {
                  setSelectedMobileDate(day);
                  if (typeof window !== "undefined" && window.innerWidth >= 768) {
                    handleOpenAddModal(day);
                  }
                }}
                className={`h-full min-h-0 p-1 md:p-1.5 lg:p-2 flex flex-col transition-all cursor-pointer group hover:bg-slate-50/90 relative overflow-hidden ${
                  !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "bg-white text-slate-800"
                } ${isMobileSelected ? "max-md:bg-primary/5 max-md:ring-2 max-md:ring-inset max-md:ring-primary/50" : ""}`}
              >
                {/* Date Number & Cell Header */}
                <div className="flex items-center justify-between flex-shrink-0 md:mb-1">
                  <span
                    className={`inline-flex items-center justify-center text-[11px] md:text-xs rounded-full w-5 h-5 md:w-6 md:h-6 transition-all ${
                      isDayToday
                        ? "bg-primary text-white font-bold"
                        : isCurrentMonth
                        ? "group-hover:bg-slate-200/80 text-slate-700 font-semibold"
                        : "text-slate-300 font-normal"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  <span className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity hidden md:inline-flex">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>

                {/* Mobile Dots Row */}
                <div className="flex md:hidden items-center justify-center gap-0.5 mt-0.5 flex-shrink-0">
                  {dayAgendas.slice(0, 3).map((a) => {
                    const config = KATEGORI_CONFIG[a.kategori] || KATEGORI_CONFIG.LAINNYA;
                    return (
                      <span
                        key={a.id}
                        className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                        title={a.judul}
                      />
                    );
                  })}
                  {dayAgendas.length > 3 && (
                    <span className="text-[8px] font-bold text-slate-400">+{dayAgendas.length - 3}</span>
                  )}
                </div>

                {/* Desktop Full Agenda Items List */}
                <div className="hidden md:flex flex-1 min-h-0 flex-col gap-1 overflow-y-auto scrollbar-none">
                  {dayAgendas.map((agenda) => {
                    const config = KATEGORI_CONFIG[agenda.kategori] || KATEGORI_CONFIG.LAINNYA;
                    return (
                      <div
                        key={agenda.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAgenda(agenda);
                          setIsDetailOpen(true);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-md border ${config.bg} ${config.text} ${config.border} truncate font-medium flex items-center justify-between gap-1 hover:scale-[1.01] transition-all cursor-pointer flex-shrink-0`}
                        title={agenda.judul}
                      >
                        <span className="truncate flex items-center gap-1.5 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                          <span className="truncate">{agenda.judul}</span>
                        </span>
                        {agenda.waktuMulai && (
                          <span className="text-[9.5px] font-mono opacity-75 shrink-0 ml-1 bg-black/5 px-1 py-0.2 rounded">
                            {agenda.waktuMulai}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Selected Date Agenda List (Beneath Calendar) */}
      <div className="md:hidden mt-3 bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-slate-800 capitalize truncate">
              {format(selectedMobileDate, "EEEE, d MMMM yyyy", { locale: idLocale })}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenAddModal(selectedMobileDate)}
            className="h-7 px-2 text-[11px] gap-1 shadow-none border-slate-200 text-slate-700 shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah</span>
          </Button>
        </div>

        {getAgendasForDay(selectedMobileDate).length === 0 ? (
          <p className="text-xs text-slate-400 py-2 text-center bg-slate-50 rounded-lg">
            Tidak ada agenda pada tanggal ini.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {getAgendasForDay(selectedMobileDate).map((agenda) => {
              const config = KATEGORI_CONFIG[agenda.kategori] || KATEGORI_CONFIG.LAINNYA;
              return (
                <div
                  key={agenda.id}
                  onClick={() => {
                    setActiveAgenda(agenda);
                    setIsDetailOpen(true);
                  }}
                  className={`p-2.5 rounded-lg border ${config.bg} ${config.border} flex items-start justify-between gap-2 cursor-pointer transition-all active:scale-[0.99]`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${config.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${config.text} truncate`}>{agenda.judul}</p>
                      {agenda.deskripsi && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{agenda.deskripsi}</p>
                      )}
                    </div>
                  </div>
                  {agenda.waktuMulai && (
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/5 text-slate-600 shrink-0">
                      {agenda.waktuMulai}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETAIL AGENDA */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[480px]">
          {activeAgenda && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4 mb-1">
                  <Badge
                    variant="outline"
                    className={`${KATEGORI_CONFIG[activeAgenda.kategori]?.bg} ${KATEGORI_CONFIG[activeAgenda.kategori]?.text} ${KATEGORI_CONFIG[activeAgenda.kategori]?.border}`}
                  >
                    {KATEGORI_CONFIG[activeAgenda.kategori]?.label}
                  </Badge>
                  <Badge
                    className={`${STATUS_CONFIG[activeAgenda.status]?.bg} ${STATUS_CONFIG[activeAgenda.status]?.text} text-[11px]`}
                  >
                    {STATUS_CONFIG[activeAgenda.status]?.label}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 leading-snug">
                  {activeAgenda.judul}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3.5 py-2 text-sm text-slate-700">
                {/* Tanggal & Waktu */}
                <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <CalendarIcon className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-800">
                      {format(parseISO(activeAgenda.tanggalMulai), "EEEE, d MMMM yyyy", {
                        locale: idLocale,
                      })}
                      {activeAgenda.tanggalSelesai &&
                        !isSameDay(parseISO(activeAgenda.tanggalMulai), parseISO(activeAgenda.tanggalSelesai)) && (
                          <span>
                            {" - "}
                            {format(parseISO(activeAgenda.tanggalSelesai), "d MMMM yyyy", {
                              locale: idLocale,
                            })}
                          </span>
                        )}
                    </p>
                    {(activeAgenda.waktuMulai || activeAgenda.waktuSelesai) && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {activeAgenda.waktuMulai || "00:00"}
                        {activeAgenda.waktuSelesai ? ` - ${activeAgenda.waktuSelesai} WITA` : " WITA"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lokasi */}
                {activeAgenda.lokasi && (
                  <div className="flex items-center gap-2.5 px-1 text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{activeAgenda.lokasi}</span>
                  </div>
                )}

                {/* PIC */}
                {activeAgenda.pic && (
                  <div className="flex items-center gap-2.5 px-1 text-slate-600">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      PIC / Penanggung Jawab: <strong>{activeAgenda.pic}</strong>
                    </span>
                  </div>
                )}

                {/* Deskripsi */}
                {activeAgenda.deskripsi && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Deskripsi / Catatan:
                    </p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {activeAgenda.deskripsi}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 pt-3">
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
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL FORM TAMBAH / EDIT AGENDA */}
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
    </div>
  );
}
