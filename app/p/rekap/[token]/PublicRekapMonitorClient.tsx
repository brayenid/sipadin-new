"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  buildGrafisData,
  type GrafisInput,
} from "@/app/dashboard/presensi/rekap/grafis/buildGrafisData";
import { getPublicRekapMonitorData } from "@/app/actions/absensi";
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  Sun,
  Moon,
  Monitor,
  X,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";

interface PublicRekapMonitorClientProps {
  token: string;
  initialConfig: {
    title?: string | null;
    teamName: string;
    startDate: string;
    endDate: string;
    kategoriAgenda: string;
    selectedUnits: string[];
    onlyInvited: boolean;
    createdAt: Date | string;
  };
  initialRekapData: GrafisInput;
}

type ThemeMode = "light" | "dark" | "system";

const ALL_MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default function PublicRekapMonitorClient({
  token,
  initialConfig,
  initialRekapData,
}: PublicRekapMonitorClientProps) {
  const [rekapData, setRekapData] = useState<GrafisInput>(initialRekapData);
  const [config, setConfig] = useState(initialConfig);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Default Auto-Refresh: OFF (false)
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Theme State: default "light", supports "light" | "dark" | "system"
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [resolvedDark, setResolvedDark] = useState(false);

  const STORAGE_KEY = `sipadin_monitor_pref_${token}`;
  const THEME_KEY = `sipadin_monitor_theme`;

  // Filter Checkbox OPD
  const [opdFilters, setOpdFilters] = useState({
    kritisOnly: false,
    waspadaOnly: false,
    tertibOnly: false,
    zeroOnly: false,
    hasAlpaOnly: false,
  });

  // Filter Checkbox Jabatan / Individu
  const [pegawaiFilters, setPegawaiFilters] = useState({
    alpaOnly: false,
    luarTitikOnly: false,
    eselon2: true,
    eselon3: true,
    nonEselon: true,
  });

  const [opdSearch, setOpdSearch] = useState("");
  const [pegawaiSearch, setPegawaiSearch] = useState("");

  // Load Theme & Filter State dari localStorage saat mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setThemeMode(savedTheme);
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.opdFilters) setOpdFilters(parsed.opdFilters);
        if (parsed.pegawaiFilters) setPegawaiFilters(parsed.pegawaiFilters);
        if (typeof parsed.autoRefresh === "boolean") setAutoRefresh(parsed.autoRefresh);
      }
    } catch {}
  }, [STORAGE_KEY, THEME_KEY]);

  // Sinkronisasi resolvedDark untuk mode "light" | "dark" | "system"
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const isDark = themeMode === "dark" || (themeMode === "system" && media.matches);
      setResolvedDark(isDark);
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themeMode]);

  const handleSetTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {}
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ opdFilters, pegawaiFilters, autoRefresh: next })
        );
      } catch {}
      return next;
    });
  };

  const updateOpdFilter = (key: keyof typeof opdFilters, val: boolean) => {
    setOpdFilters((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ opdFilters: next, pegawaiFilters, autoRefresh })
        );
      } catch {}
      return next;
    });
  };

  const updatePegawaiFilter = (key: keyof typeof pegawaiFilters, val: boolean) => {
    setPegawaiFilters((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ opdFilters, pegawaiFilters: next, autoRefresh })
        );
      } catch {}
      return next;
    });
  };

  const resetAllFilters = () => {
    const defaultOpd = {
      kritisOnly: false,
      waspadaOnly: false,
      tertibOnly: false,
      zeroOnly: false,
      hasAlpaOnly: false,
    };
    const defaultPeg = {
      alpaOnly: false,
      luarTitikOnly: false,
      eselon2: true,
      eselon3: true,
      nonEselon: true,
    };
    setOpdFilters(defaultOpd);
    setPegawaiFilters(defaultPeg);
    setOpdSearch("");
    setPegawaiSearch("");
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ opdFilters: defaultOpd, pegawaiFilters: defaultPeg, autoRefresh })
      );
    } catch {}
  };

  const grafis = useMemo(() => {
    return buildGrafisData(rekapData, {
      onlyInvited: config.onlyInvited,
      selectedUnits:
        config.selectedUnits && config.selectedUnits.length > 0 ? config.selectedUnits : null,
    });
  }, [rekapData, config]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getPublicRekapMonitorData(token);
      setRekapData(res.rekapData);
      setConfig(res.config);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Gagal memperbarui data monitor:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  // Auto-refresh interval tiap 20 detik jika diaktifkan
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      handleRefresh();
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, handleRefresh]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  // Perhitungan Prioritas Evaluasi (Tanpa Syarat Minimal 2 Undangan agar Tetap Muncul pada 1 Kegiatan)
  const attentionData = useMemo(() => {
    const opds = rekapData.opdSummary || [];
    const pegawais = rekapData.pegawaiSummary || [];

    const opdKritis = opds
      .filter((o) => o.totalDiundang > 0 && (o.persentaseKehadiran < 60 || o.tidakHadir >= 1))
      .sort((a, b) => a.persentaseKehadiran - b.persentaseKehadiran || b.tidakHadir - a.tidakHadir);

    const opdZero = opds.filter((o) => o.totalDiundang > 0 && o.hadir + o.mewakili === 0);

    const pegawaiAlpaTinggi = pegawais
      .filter(
        (p) =>
          p.totalDiundang >= 1 && ((p.tidakHadir || 0) >= 1 || p.persentaseKehadiran < 60)
      )
      .sort(
        (a, b) =>
          (b.tidakHadir || 0) - (a.tidakHadir || 0) ||
          a.persentaseKehadiran - b.persentaseKehadiran
      );

    return {
      opdKritis,
      opdZero,
      pegawaiAlpaTinggi,
    };
  }, [rekapData]);

  // Matriks 12 Bulan Utuh (Jan - Des)
  const fullYearMonths = useMemo(() => {
    const yearStr = config.startDate ? config.startDate.slice(0, 4) : String(new Date().getFullYear());
    const map = new Map<string, { persentase: number; hadir: number; diundang: number }>();
    for (const m of grafis.monthlyTrends) {
      map.set(m.bulanKey, {
        persentase: m.persentase,
        hadir: m.hadir,
        diundang: m.diundang,
      });
    }
    return ALL_MONTH_SHORT.map((label, idx) => {
      const mKey = `${yearStr}-${String(idx + 1).padStart(2, "0")}`;
      const found = map.get(mKey);
      return {
        key: mKey,
        label,
        persentase: found ? found.persentase : 0,
        diundang: found ? found.diundang : 0,
      };
    });
  }, [grafis.monthlyTrends, config.startDate]);

  // Filter Tabel OPD
  const filteredOpdList = useMemo(() => {
    let list = [...(rekapData.opdSummary || [])];
    if (config.selectedUnits && config.selectedUnits.length > 0) {
      const set = new Set(config.selectedUnits);
      list = list.filter((o) => set.has(o.instansi));
    }
    if (opdSearch.trim()) {
      const q = opdSearch.toLowerCase();
      list = list.filter((o) => o.instansi.toLowerCase().includes(q));
    }

    if (opdFilters.kritisOnly) {
      list = list.filter((o) => o.totalDiundang > 0 && o.persentaseKehadiran < 60);
    }
    if (opdFilters.waspadaOnly) {
      list = list.filter(
        (o) => o.totalDiundang > 0 && o.persentaseKehadiran >= 60 && o.persentaseKehadiran < 80
      );
    }
    if (opdFilters.tertibOnly) {
      list = list.filter((o) => o.persentaseKehadiran >= 80);
    }
    if (opdFilters.zeroOnly) {
      list = list.filter((o) => o.totalDiundang > 0 && o.hadir + o.mewakili === 0);
    }
    if (opdFilters.hasAlpaOnly) {
      list = list.filter((o) => o.tidakHadir > 0);
    }

    list.sort(
      (a, b) => a.persentaseKehadiran - b.persentaseKehadiran || b.tidakHadir - a.tidakHadir
    );
    return list;
  }, [rekapData.opdSummary, config.selectedUnits, opdSearch, opdFilters]);

  // Filter Tabel Pegawai & Jabatan
  const filteredPegawaiList = useMemo(() => {
    let list = [...(rekapData.pegawaiSummary || [])];
    if (config.selectedUnits && config.selectedUnits.length > 0) {
      const set = new Set(config.selectedUnits);
      list = list.filter((p) => set.has(p.instansi));
    }

    if (pegawaiSearch.trim()) {
      const q = pegawaiSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.instansi.toLowerCase().includes(q) ||
          (p.jabatan && p.jabatan.toLowerCase().includes(q))
      );
    }

    list = list.filter((p) => {
      const e = (p.eselon || "").toUpperCase();
      const isEselon2 = e.includes("II");
      const isEselon3 = e.includes("III");
      const isNon = !isEselon2 && !isEselon3;

      if (isEselon2 && !pegawaiFilters.eselon2) return false;
      if (isEselon3 && !pegawaiFilters.eselon3) return false;
      if (isNon && !pegawaiFilters.nonEselon) return false;
      return true;
    });

    if (pegawaiFilters.alpaOnly) {
      list = list.filter((p) => (p.tidakHadir || 0) > 0);
    }
    if (pegawaiFilters.luarTitikOnly) {
      list = list.filter((p) => (p.hadirLuarRadius || 0) > 0);
    }

    list.sort(
      (a, b) =>
        (b.tidakHadir || 0) - (a.tidakHadir || 0) ||
        a.persentaseKehadiran - b.persentaseKehadiran
    );
    return list;
  }, [rekapData.pegawaiSummary, config.selectedUnits, pegawaiSearch, pegawaiFilters]);

  const totalPartisipasi = grafis.status.hadir + grafis.status.mewakili;
  const totalPresensiMasuk = totalPartisipasi + grafis.status.izin + grafis.status.tidakHadir;

  const isAnyFilterActive =
    opdFilters.kritisOnly ||
    opdFilters.waspadaOnly ||
    opdFilters.tertibOnly ||
    opdFilters.zeroOnly ||
    opdFilters.hasAlpaOnly ||
    pegawaiFilters.alpaOnly ||
    pegawaiFilters.luarTitikOnly ||
    !pegawaiFilters.eselon2 ||
    !pegawaiFilters.eselon3 ||
    !pegawaiFilters.nonEselon ||
    Boolean(opdSearch) ||
    Boolean(pegawaiSearch);

  return (
    <div className={resolvedDark ? "dark" : ""}>
      <div className="min-h-screen xl:h-screen xl:w-screen xl:overflow-hidden bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
        {/* 1. TOP COMMAND BAR */}
        <header className="shrink-0 bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                autoRefresh ? "bg-emerald-600" : "bg-slate-400 dark:bg-zinc-600"
              }`}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="text-sm sm:text-base font-bold text-slate-950 dark:text-zinc-50 tracking-tight truncate">
                  {config.title || "Rekapitulasi Kehadiran Perangkat Daerah"}
                </h1>
                <span className="hidden md:inline-block text-slate-300 dark:text-zinc-700">|</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate">
                  {config.teamName}
                </span>
                <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-300 dark:border-zinc-700">
                  {config.startDate} s/d {config.endDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="h-8 px-2.5 rounded text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}

            <span className="hidden lg:inline-block text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400 mr-1.5">
              {formatWita(lastRefreshed, "HH:mm:ss")} WITA
            </span>

            {/* Auto Refresh Toggle */}
            <button
              onClick={toggleAutoRefresh}
              className={`h-8 px-3 rounded text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                autoRefresh
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
              title="Sinkronisasi otomatis"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoRefresh ? "bg-emerald-600" : "bg-slate-400 dark:bg-zinc-600"
                }`}
              />
              <span>Auto Update</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 rounded flex items-center justify-center bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 transition-colors"
              title="Muat ulang data"
            >
              <RotateCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Theme Switcher Segmented (Terang / Gelap / Sistem) */}
            <div className="flex items-center p-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700">
              <button
                onClick={() => handleSetTheme("light")}
                className={`h-7 px-2 rounded-xs text-xs font-bold flex items-center gap-1 transition-colors ${
                  themeMode === "light"
                    ? "bg-white dark:bg-zinc-900 text-slate-950 dark:text-zinc-100 shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title="Mode Terang"
              >
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Terang</span>
              </button>
              <button
                onClick={() => handleSetTheme("dark")}
                className={`h-7 px-2 rounded-xs text-xs font-bold flex items-center gap-1 transition-colors ${
                  themeMode === "dark"
                    ? "bg-white dark:bg-zinc-900 text-slate-950 dark:text-zinc-100 shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title="Mode Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Gelap</span>
              </button>
              <button
                onClick={() => handleSetTheme("system")}
                className={`h-7 px-2 rounded-xs text-xs font-bold flex items-center gap-1 transition-colors ${
                  themeMode === "system"
                    ? "bg-white dark:bg-zinc-900 text-slate-950 dark:text-zinc-100 shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                }`}
                title="Ikuti Sistem"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sistem</span>
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex h-8 w-8 rounded items-center justify-center bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 transition-colors"
              title="Layar Penuh"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </header>

        {/* 2. METRIC LEDGER STRIP (KONTRAS TINGGI, ANGKA SAN-SERIF TABULAR JELAS) */}
        <section className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-zinc-800">
          <div className="px-4 py-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Capaian Kehadiran
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-zinc-50">
                {grafis.kpi.rataRataKehadiran}%
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Target ≥ 80%
              </span>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col justify-between border-l border-slate-200 dark:border-zinc-800 sm:border-l-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Total Kegiatan
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-zinc-50">
                {grafis.kpi.totalAgenda}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                {grafis.kpi.jumlahOpd} OPD Terdata
              </span>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Hadir &amp; Mewakili
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-400">
                {totalPartisipasi.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                dari {totalPresensiMasuk.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col justify-between border-l border-slate-200 dark:border-zinc-800 sm:border-l-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Presensi Luar Titik
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
                {grafis.kpi.hadirLuarRadius.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                Valid: {grafis.kpi.hadirValid.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              OPD Kritis (&lt; 60%)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold tabular-nums text-rose-700 dark:text-rose-400">
                {attentionData.opdKritis.length}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                Nol Hadir: {attentionData.opdZero.length}
              </span>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col justify-between border-l border-slate-200 dark:border-zinc-800 sm:border-l-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Total Tanpa Keterangan
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold tabular-nums text-rose-700 dark:text-rose-400">
                {grafis.status.tidakHadir.toLocaleString("id-ID")}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                Izin: {grafis.status.izin.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </section>

        {/* 3. STRIP ANALITIK RINGKAS: PERHATIAN PIMPINAN, ESELON, & TREN 12 BULAN */}
        <section className="shrink-0 grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-zinc-900/70 border-b border-slate-300 dark:border-zinc-800 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
          {/* Kolom 1: Sorotan Evaluasi OPD & Pejabat (5 Col) */}
          <div className="lg:col-span-5 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400">
                  Perhatian OPD Terendah
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Alpa / Capaian
                </span>
              </div>
              {attentionData.opdKritis.length === 0 ? (
                <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 py-1.5">
                  Seluruh OPD memenuhi target kehadiran.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {attentionData.opdKritis.slice(0, 3).map((o, idx) => (
                    <div
                      key={o.instansi}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span
                        className="truncate text-slate-900 dark:text-zinc-100 font-semibold"
                        title={o.instansi}
                      >
                        {idx + 1}. {o.instansi}
                      </span>
                      <span className="text-xs shrink-0 tabular-nums text-rose-700 dark:text-rose-400 font-bold">
                        {o.tidakHadir} Alpa · {o.persentaseKehadiran}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-400">
                  Perhatian Jabatan / Individu
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Alpa / Capaian
                </span>
              </div>
              {attentionData.pegawaiAlpaTinggi.length === 0 ? (
                <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 py-1.5">
                  Tidak ada catatan ketidakhadiran pejabat.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {attentionData.pegawaiAlpaTinggi.slice(0, 3).map((p, idx) => (
                    <div
                      key={`${p.nama}_${idx}`}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span
                        className="truncate text-slate-900 dark:text-zinc-100 font-semibold"
                        title={`${p.nama} - ${p.jabatan || p.instansi}`}
                      >
                        {idx + 1}. {p.nama}
                      </span>
                      <span className="text-xs shrink-0 tabular-nums text-rose-700 dark:text-rose-400 font-bold">
                        {p.tidakHadir || 0} Alpa · {p.persentaseKehadiran}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kolom 2: Kepatuhan per Jenjang Eselon (3 Col) */}
          <div className="lg:col-span-3 px-4 py-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Rasio per Jenjang Eselon
              </span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                Hadir / Undang
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
              {grafis.eselon
                .filter((e) => e.diundangTotal > 0)
                .slice(0, 4)
                .map((es) => (
                  <div
                    key={es.label}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-800 dark:text-zinc-200 font-semibold truncate">
                      {es.label}
                    </span>
                    <span className="text-xs tabular-nums font-bold text-slate-950 dark:text-zinc-100">
                      {es.hadirTotal}/{es.diundangTotal} ({es.persentase}%)
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Kolom 3: Matriks Tren 12 Bulan Penuh (4 Col) */}
          <div className="lg:col-span-4 px-4 py-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Tren Capaian Bulanan (%)
              </span>
              {grafis.topKegiatan[0] && (
                <span
                  className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 truncate max-w-[210px]"
                  title={grafis.topKegiatan[0].namaKegiatan}
                >
                  Kegiatan: {grafis.topKegiatan[0].namaKegiatan}
                </span>
              )}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {fullYearMonths.map((m) => (
                <div
                  key={m.key}
                  className={`text-center py-1 px-0.5 rounded border ${
                    m.diundang > 0
                      ? "bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700"
                      : "bg-slate-100/70 dark:bg-zinc-900/40 border-slate-200/70 dark:border-zinc-800/60"
                  }`}
                >
                  <span className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase">
                    {m.label}
                  </span>
                  <span
                    className={`block text-xs font-extrabold tabular-nums mt-0.5 ${
                      m.diundang === 0
                        ? "text-slate-400 dark:text-zinc-600 font-normal"
                        : m.persentase >= 80
                        ? "text-emerald-700 dark:text-emerald-400"
                        : m.persentase >= 60
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-rose-700 dark:text-rose-400"
                    }`}
                  >
                    {m.diundang > 0 ? `${m.persentase}%` : "-"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. DUAL-PANE WORKSPACE: TABEL OPD (KIRI) & TABEL JABATAN/INDIVIDU (KANAN) */}
        <main className="flex-1 xl:min-h-0 grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-300 dark:divide-zinc-800 bg-white dark:bg-zinc-900 xl:overflow-hidden">
          {/* PANE KIRI: TABEL PERANGKAT DAERAH (OPD) */}
          <section className="xl:col-span-6 flex flex-col xl:min-h-0 xl:overflow-hidden">
            {/* Toolbar Filter OPD */}
            <div className="shrink-0 p-3 bg-slate-50 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                    Tabel Perangkat Daerah (OPD)
                  </h2>
                  <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-zinc-200 bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {filteredOpdList.length}
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama perangkat daerah..."
                    value={opdSearch}
                    onChange={(e) => setOpdSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 text-xs font-medium bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500"
                  />
                  {opdSearch && (
                    <button
                      onClick={() => setOpdSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Filter Bar OPD (Persisted in localStorage) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={opdFilters.kritisOnly}
                    onChange={(e) => updateOpdFilter("kritisOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Kritis (&lt; 60%)</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={opdFilters.waspadaOnly}
                    onChange={(e) => updateOpdFilter("waspadaOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Waspada (60–79%)</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={opdFilters.tertibOnly}
                    onChange={(e) => updateOpdFilter("tertibOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Tertib (≥ 80%)</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={opdFilters.hasAlpaOnly}
                    onChange={(e) => updateOpdFilter("hasAlpaOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Ada Alpa</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={opdFilters.zeroOnly}
                    onChange={(e) => updateOpdFilter("zeroOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>0% Hadir</span>
                </label>
              </div>
            </div>

            {/* Tabel Data OPD */}
            <div className="flex-1 xl:min-h-0 overflow-x-auto xl:overflow-y-auto max-h-[480px] xl:max-h-none">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-950 text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300 sticky top-0 z-10 border-b border-slate-300 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center w-9">No</th>
                    <th className="py-2.5 px-3">Perangkat Daerah (OPD)</th>
                    <th className="py-2.5 px-2 text-right w-14">Undang</th>
                    <th className="py-2.5 px-2 text-right w-14">Hadir</th>
                    <th className="hidden sm:table-cell py-2.5 px-2 text-right w-14">Wakil</th>
                    <th className="hidden sm:table-cell py-2.5 px-2 text-right w-14">Izin</th>
                    <th className="py-2.5 px-2 text-right w-14">Alpa</th>
                    <th className="hidden md:table-cell py-2.5 px-2 text-right w-16">Luar Titik</th>
                    <th className="py-2.5 px-3 text-right w-20">Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-xs tabular-nums">
                  {filteredOpdList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-600 dark:text-zinc-400 font-medium text-xs"
                      >
                        Tidak ada Perangkat Daerah yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOpdList.map((opd, idx) => {
                      const isLow = opd.totalDiundang > 0 && opd.persentaseKehadiran < 60;
                      return (
                        <tr
                          key={opd.instansi}
                          className={`hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 transition-colors ${
                            isLow ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-2.5 text-center font-semibold text-slate-500 dark:text-zinc-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-zinc-100">
                            <span
                              className="block sm:truncate max-w-[200px] sm:max-w-[260px] xl:max-w-[320px] leading-snug"
                              title={opd.instansi}
                            >
                              {opd.instansi}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300">
                            {opd.totalDiundang}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            {opd.hadir}
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300">
                            {opd.mewakili}
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300">
                            {opd.izin}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-extrabold ${
                              opd.tidakHadir > 0
                                ? "text-rose-700 dark:text-rose-400"
                                : "text-slate-400 dark:text-zinc-600 font-normal"
                            }`}
                          >
                            {opd.tidakHadir}
                          </td>
                          <td className="hidden md:table-cell py-2.5 px-2 text-right">
                            {opd.hadirLuarRadius ? (
                              <span className="text-amber-700 dark:text-amber-400 font-bold">
                                {opd.hadirLuarRadius}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-xs ${
                                opd.persentaseKehadiran >= 80
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                  : opd.persentaseKehadiran >= 60
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              }`}
                            >
                              {opd.persentaseKehadiran}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PANE KANAN: TABEL JABATAN & PEGAWAI (INDIVIDU) */}
          <section className="xl:col-span-6 flex flex-col xl:min-h-0 xl:overflow-hidden">
            {/* Toolbar Filter Pegawai */}
            <div className="shrink-0 p-3 bg-slate-50 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                    Tabel Pejabat &amp; Individu
                  </h2>
                  <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-zinc-200 bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {filteredPegawaiList.length}
                  </span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama, jabatan, OPD..."
                    value={pegawaiSearch}
                    onChange={(e) => setPegawaiSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 text-xs font-medium bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500"
                  />
                  {pegawaiSearch && (
                    <button
                      onClick={() => setPegawaiSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Checkbox Filter Bar Pegawai (Persisted in localStorage) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={pegawaiFilters.alpaOnly}
                    onChange={(e) => updatePegawaiFilter("alpaOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Ada Alpa</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={pegawaiFilters.luarTitikOnly}
                    onChange={(e) => updatePegawaiFilter("luarTitikOnly", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Luar Titik Lokasi</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={pegawaiFilters.eselon2}
                    onChange={(e) => updatePegawaiFilter("eselon2", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Eselon II</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={pegawaiFilters.eselon3}
                    onChange={(e) => updatePegawaiFilter("eselon3", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Eselon III</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={pegawaiFilters.nonEselon}
                    onChange={(e) => updatePegawaiFilter("nonEselon", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Staf / Non-Eselon</span>
                </label>
              </div>
            </div>

            {/* Tabel Data Pegawai */}
            <div className="flex-1 xl:min-h-0 overflow-x-auto xl:overflow-y-auto max-h-[520px] xl:max-h-none">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-950 text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300 sticky top-0 z-10 border-b border-slate-300 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center w-9">No</th>
                    <th className="py-2.5 px-3">Nama &amp; Jabatan</th>
                    <th className="hidden md:table-cell py-2.5 px-2">OPD</th>
                    <th className="py-2.5 px-1.5 text-center w-14">Eselon</th>
                    <th className="py-2.5 px-2 text-right w-14">Undang</th>
                    <th className="py-2.5 px-2 text-right w-14">Hadir</th>
                    <th className="py-2.5 px-2 text-right w-14">Alpa</th>
                    <th className="hidden sm:table-cell py-2.5 px-2 text-right w-16">Luar Titik</th>
                    <th className="py-2.5 px-3 text-right w-20">Capaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-xs tabular-nums">
                  {filteredPegawaiList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-slate-600 dark:text-zinc-400 font-medium text-xs"
                      >
                        Tidak ada data pejabat/pegawai yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPegawaiList.map((p, idx) => {
                      const hadirTotal = p.hadir + p.mewakili;
                      const highAlpa = (p.tidakHadir || 0) >= 1 && p.persentaseKehadiran < 60;
                      return (
                        <tr
                          key={`${p.nama}_${idx}`}
                          className={`hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 transition-colors ${
                            highAlpa ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                          }`}
                        >
                          <td className="py-2.5 px-2.5 text-center font-semibold text-slate-500 dark:text-zinc-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className="font-bold text-slate-900 dark:text-zinc-100 block sm:truncate max-w-[180px] sm:max-w-[230px]"
                              title={p.nama}
                            >
                              {p.nama}
                            </span>
                            <span
                              className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block sm:truncate max-w-[180px] sm:max-w-[230px] mt-0.5"
                              title={p.jabatan || ""}
                            >
                              {p.jabatan || "-"}
                            </span>
                            <span className="md:hidden text-[10px] font-medium text-slate-500 dark:text-zinc-500 block truncate max-w-[180px] mt-0.5">
                              {p.instansi}
                            </span>
                          </td>
                          <td className="hidden md:table-cell py-2.5 px-2 font-medium text-slate-700 dark:text-zinc-300 text-xs">
                            <span
                              className="block truncate max-w-[140px]"
                              title={p.instansi}
                            >
                              {p.instansi}
                            </span>
                          </td>
                          <td className="py-2.5 px-1.5 text-center">
                            {p.eselon ? (
                              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700">
                                {p.eselon}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300">
                            {p.totalDiundang}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            {hadirTotal}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-extrabold ${
                              (p.tidakHadir || 0) > 0
                                ? "text-rose-700 dark:text-rose-400"
                                : "text-slate-400 dark:text-zinc-600 font-normal"
                            }`}
                          >
                            {p.tidakHadir || 0}
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2 text-right">
                            {p.hadirLuarRadius ? (
                              <span className="text-amber-700 dark:text-amber-400 font-bold">
                                {p.hadirLuarRadius}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-xs ${
                                p.persentaseKehadiran >= 80
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                  : p.persentaseKehadiran >= 60
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              }`}
                            >
                              {p.persentaseKehadiran}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
