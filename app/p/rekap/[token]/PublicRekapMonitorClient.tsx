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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";

export interface KegiatanPesertaItem {
  id: string;
  nama: string;
  nip?: string | null;
  jabatan: string;
  instansi: string;
  eselon?: string | null;
  status: string;
  keterangan?: string | null;
  namaPerwakilan?: string | null;
  jabatanPerwakilan?: string | null;
  waktuInput?: Date | string | null;
  lokasiText?: string | null;
  isInsideRadius?: boolean | null;
  isNonUndangan: boolean;
}

export interface KegiatanSessionItem {
  id: string;
  agendaId: string;
  namaKegiatan: string;
  tanggal: Date | string;
  waktu?: string | null;
  tempat?: string | null;
  kategori?: string | null;
  isRecurring: boolean;
  isCancelledSession?: boolean;
  cancelReason?: string | null;
  peserta: KegiatanPesertaItem[];
}

export type MonitorRekapData = GrafisInput & {
  kegiatanList?: KegiatanSessionItem[];
};

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
  initialRekapData: MonitorRekapData;
}

type ThemeMode = "light" | "dark" | "system";
type SortDir = "asc" | "desc";

type OpdSortKey =
  | "instansi"
  | "totalDiundang"
  | "hadir"
  | "mewakili"
  | "izin"
  | "tidakHadir"
  | "hadirLuarRadius"
  | "persentaseKehadiran";

type PegawaiSortKey =
  | "nama"
  | "instansi"
  | "eselon"
  | "totalDiundang"
  | "hadirTotal"
  | "tidakHadir"
  | "hadirLuarRadius"
  | "persentaseKehadiran";

type KegiatanSortKey =
  | "tanggal"
  | "namaKegiatan"
  | "diundang"
  | "hadir"
  | "mewakili"
  | "izin"
  | "tidakHadir"
  | "luarTitik"
  | "persentase";

type PesertaSortKey = "nama" | "instansi" | "eselon" | "status" | "waktuInput";

function SortHeaderButton({
  label,
  active,
  dir,
  align = "left",
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  align?: "left" | "center" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider hover:text-slate-950 dark:hover:text-white transition-colors select-none ${
        align === "right"
          ? "justify-end w-full"
          : align === "center"
          ? "justify-center w-full"
          : "justify-start"
      } ${active ? "text-slate-950 dark:text-white" : "text-slate-700 dark:text-zinc-300"}`}
    >
      <span>{label}</span>
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="w-3 h-3 shrink-0" />
        ) : (
          <ArrowDown className="w-3 h-3 shrink-0" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 shrink-0 opacity-45" />
      )}
    </button>
  );
}

const ALL_MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default function PublicRekapMonitorClient({
  token,
  initialConfig,
  initialRekapData,
}: PublicRekapMonitorClientProps) {
  const [rekapData, setRekapData] = useState<MonitorRekapData>(initialRekapData);
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

  // Filter Checkbox Daftar Kegiatan
  const [kegiatanFilters, setKegiatanFilters] = useState({
    adaAlpa: false,
    lowAttendance: false,
    adaLuarTitik: false,
    expandAll: false,
  });

  // Filter Status Peserta di dalam rincian kegiatan
  const [pesertaStatusFilter, setPesertaStatusFilter] = useState<
    "ALL" | "HADIR" | "MEWAKILI" | "IZIN" | "TIDAK_HADIR"
  >("ALL");

  // Sort States untuk setiap tabel data
  const [opdSort, setOpdSort] = useState<{ key: OpdSortKey; dir: SortDir }>({
    key: "hadir",
    dir: "desc",
  });
  const [pegawaiSort, setPegawaiSort] = useState<{ key: PegawaiSortKey; dir: SortDir }>({
    key: "hadirTotal",
    dir: "desc",
  });
  const [kegiatanSort, setKegiatanSort] = useState<{ key: KegiatanSortKey; dir: SortDir }>({
    key: "tanggal",
    dir: "desc",
  });
  const [pesertaSort, setPesertaSort] = useState<{ key: PesertaSortKey; dir: SortDir }>({
    key: "status",
    dir: "asc",
  });

  const [opdSearch, setOpdSearch] = useState("");
  const [pegawaiSearch, setPegawaiSearch] = useState("");
  const [kegiatanSearch, setKegiatanSearch] = useState("");
  const [expandedKegiatanIds, setExpandedKegiatanIds] = useState<Record<string, boolean>>({});

  const persistPreferences = useCallback(
    (patch: Record<string, any>) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const prev = raw ? JSON.parse(raw) : {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...patch }));
      } catch {}
    },
    [STORAGE_KEY]
  );

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
        if (parsed.kegiatanFilters) setKegiatanFilters(parsed.kegiatanFilters);
        if (parsed.opdSort) setOpdSort(parsed.opdSort);
        if (parsed.pegawaiSort) setPegawaiSort(parsed.pegawaiSort);
        if (parsed.kegiatanSort) setKegiatanSort(parsed.kegiatanSort);
        if (parsed.pesertaSort) setPesertaSort(parsed.pesertaSort);
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
      persistPreferences({ autoRefresh: next });
      return next;
    });
  };

  const updateOpdFilter = (key: keyof typeof opdFilters, val: boolean) => {
    setOpdFilters((prev) => {
      const next = { ...prev, [key]: val };
      persistPreferences({ opdFilters: next });
      return next;
    });
  };

  const updatePegawaiFilter = (key: keyof typeof pegawaiFilters, val: boolean) => {
    setPegawaiFilters((prev) => {
      const next = { ...prev, [key]: val };
      persistPreferences({ pegawaiFilters: next });
      return next;
    });
  };

  const updateKegiatanFilter = (key: keyof typeof kegiatanFilters, val: boolean) => {
    setKegiatanFilters((prev) => {
      const next = { ...prev, [key]: val };
      persistPreferences({ kegiatanFilters: next });
      return next;
    });
  };

  const handleToggleOpdSort = (key: OpdSortKey) => {
    setOpdSort((prev) => {
      const next: { key: OpdSortKey; dir: SortDir } =
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: key === "instansi" ? "asc" : "desc" };
      persistPreferences({ opdSort: next });
      return next;
    });
  };

  const handleTogglePegawaiSort = (key: PegawaiSortKey) => {
    setPegawaiSort((prev) => {
      const next: { key: PegawaiSortKey; dir: SortDir } =
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: key === "nama" || key === "instansi" || key === "eselon" ? "asc" : "desc" };
      persistPreferences({ pegawaiSort: next });
      return next;
    });
  };

  const handleToggleKegiatanSort = (key: KegiatanSortKey) => {
    setKegiatanSort((prev) => {
      const next: { key: KegiatanSortKey; dir: SortDir } =
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: key === "namaKegiatan" ? "asc" : "desc" };
      persistPreferences({ kegiatanSort: next });
      return next;
    });
  };

  const handleTogglePesertaSort = (key: PesertaSortKey) => {
    setPesertaSort((prev) => {
      const next: { key: PesertaSortKey; dir: SortDir } =
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: key === "waktuInput" ? "desc" : "asc" };
      persistPreferences({ pesertaSort: next });
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
    const defaultKeg = {
      adaAlpa: false,
      lowAttendance: false,
      adaLuarTitik: false,
      expandAll: false,
    };
    setOpdFilters(defaultOpd);
    setPegawaiFilters(defaultPeg);
    setKegiatanFilters(defaultKeg);
    setPesertaStatusFilter("ALL");
    setOpdSearch("");
    setPegawaiSearch("");
    setKegiatanSearch("");
    persistPreferences({
      opdFilters: defaultOpd,
      pegawaiFilters: defaultPeg,
      kegiatanFilters: defaultKeg,
    });
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

  // Daftar 10 OPD & Pejabat Terajin
  const topDiligentData = useMemo(() => {
    const unitSet =
      config.selectedUnits && config.selectedUnits.length > 0
        ? new Set(config.selectedUnits)
        : null;

    const opds = (rekapData.opdSummary || []).filter(
      (o) => o.totalDiundang > 0 && (!unitSet || unitSet.has(o.instansi))
    );
    const pegawais = (rekapData.pegawaiSummary || []).filter(
      (p) => p.totalDiundang >= 1 && (!unitSet || unitSet.has(p.instansi))
    );

    const opdTerajin = [...opds].sort(
      (a, b) =>
        b.hadir + b.mewakili - (a.hadir + a.mewakili) ||
        b.persentaseKehadiran - a.persentaseKehadiran ||
        a.tidakHadir - b.tidakHadir
    );

    const pegawaiTerajin = [...pegawais].sort(
      (a, b) =>
        b.hadir + b.mewakili - (a.hadir + a.mewakili) ||
        b.persentaseKehadiran - a.persentaseKehadiran ||
        (a.tidakHadir || 0) - (b.tidakHadir || 0)
    );

    const opdKritisCount = opds.filter(
      (o) => o.persentaseKehadiran < 60 || o.tidakHadir >= 1
    ).length;

    const opdZeroCount = opds.filter((o) => o.hadir + o.mewakili === 0).length;

    return {
      opdTerajin,
      pegawaiTerajin,
      opdKritisCount,
      opdZeroCount,
    };
  }, [rekapData, config.selectedUnits]);

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

    list.sort((a, b) => {
      const m = opdSort.dir === "asc" ? 1 : -1;
      switch (opdSort.key) {
        case "instansi":
          return m * a.instansi.localeCompare(b.instansi, "id");
        case "totalDiundang":
          return m * (a.totalDiundang - b.totalDiundang);
        case "hadir":
          return m * (a.hadir - b.hadir);
        case "mewakili":
          return m * (a.mewakili - b.mewakili);
        case "izin":
          return m * (a.izin - b.izin);
        case "tidakHadir":
          return m * (a.tidakHadir - b.tidakHadir);
        case "hadirLuarRadius":
          return m * ((a.hadirLuarRadius || 0) - (b.hadirLuarRadius || 0));
        case "persentaseKehadiran":
        default:
          return m * (a.persentaseKehadiran - b.persentaseKehadiran) || b.tidakHadir - a.tidakHadir;
      }
    });
    return list;
  }, [rekapData.opdSummary, config.selectedUnits, opdSearch, opdFilters, opdSort]);

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

    list.sort((a, b) => {
      const m = pegawaiSort.dir === "asc" ? 1 : -1;
      const aHadir = a.hadir + a.mewakili;
      const bHadir = b.hadir + b.mewakili;
      switch (pegawaiSort.key) {
        case "nama":
          return m * a.nama.localeCompare(b.nama, "id");
        case "instansi":
          return m * a.instansi.localeCompare(b.instansi, "id");
        case "eselon":
          return m * (a.eselon || "ZZZ").localeCompare(b.eselon || "ZZZ", "id");
        case "totalDiundang":
          return m * (a.totalDiundang - b.totalDiundang);
        case "hadirTotal":
          return m * (aHadir - bHadir);
        case "hadirLuarRadius":
          return m * ((a.hadirLuarRadius || 0) - (b.hadirLuarRadius || 0));
        case "persentaseKehadiran":
          return m * (a.persentaseKehadiran - b.persentaseKehadiran);
        case "tidakHadir":
        default:
          return (
            m * ((a.tidakHadir || 0) - (b.tidakHadir || 0)) ||
            a.persentaseKehadiran - b.persentaseKehadiran
          );
      }
    });
    return list;
  }, [rekapData.pegawaiSummary, config.selectedUnits, pegawaiSearch, pegawaiFilters, pegawaiSort]);

  // Pengolahan & Filter Daftar Kegiatan Beserta Undangan dan Kehadiran Lengkap
  const filteredKegiatanList = useMemo(() => {
    const rawList = rekapData.kegiatanList || [];
    const unitSet =
      config.selectedUnits && config.selectedUnits.length > 0
        ? new Set(config.selectedUnits)
        : null;

    let enriched = rawList
      .map((keg) => {
        let peserta = keg.peserta || [];
        if (unitSet) {
          peserta = peserta.filter((p) => unitSet.has(p.instansi));
        }
        if (config.onlyInvited) {
          peserta = peserta.filter((p) => !p.isNonUndangan);
        }

        const diundangList = peserta.filter((p) => !p.isNonUndangan);
        const totalDiundang = diundangList.length > 0 ? diundangList.length : peserta.length;
        let hadir = 0;
        let mewakili = 0;
        let izin = 0;
        let tidakHadir = 0;
        let luarTitik = 0;

        for (const p of peserta) {
          if (p.status === "HADIR") {
            hadir += 1;
            if (p.isInsideRadius === false) luarTitik += 1;
          } else if (p.status === "MEWAKILI") {
            mewakili += 1;
          } else if (p.status === "IZIN") {
            izin += 1;
          } else {
            tidakHadir += 1;
          }
        }

        const persentase =
          totalDiundang > 0 ? Math.round(((hadir + mewakili) / totalDiundang) * 100) : 0;

        return {
          ...keg,
          peserta,
          totalDiundang,
          hadir,
          mewakili,
          izin,
          tidakHadir,
          luarTitik,
          persentase,
        };
      })
      .filter((keg) => !unitSet || keg.peserta.length > 0);

    if (kegiatanSearch.trim()) {
      const q = kegiatanSearch.toLowerCase();
      enriched = enriched.filter(
        (k) =>
          k.namaKegiatan.toLowerCase().includes(q) ||
          (k.tempat && k.tempat.toLowerCase().includes(q)) ||
          k.peserta.some(
            (p) =>
              p.nama.toLowerCase().includes(q) ||
              p.instansi.toLowerCase().includes(q) ||
              p.jabatan.toLowerCase().includes(q)
          )
      );
    }

    if (kegiatanFilters.adaAlpa) {
      enriched = enriched.filter((k) => k.tidakHadir > 0);
    }
    if (kegiatanFilters.lowAttendance) {
      enriched = enriched.filter((k) => k.totalDiundang > 0 && k.persentase < 80);
    }
    if (kegiatanFilters.adaLuarTitik) {
      enriched = enriched.filter((k) => k.luarTitik > 0);
    }

    enriched.sort((a, b) => {
      const m = kegiatanSort.dir === "asc" ? 1 : -1;
      switch (kegiatanSort.key) {
        case "namaKegiatan":
          return m * a.namaKegiatan.localeCompare(b.namaKegiatan, "id");
        case "diundang":
          return m * (a.totalDiundang - b.totalDiundang);
        case "hadir":
          return m * (a.hadir - b.hadir);
        case "mewakili":
          return m * (a.mewakili - b.mewakili);
        case "izin":
          return m * (a.izin - b.izin);
        case "tidakHadir":
          return m * (a.tidakHadir - b.tidakHadir);
        case "luarTitik":
          return m * (a.luarTitik - b.luarTitik);
        case "persentase":
          return m * (a.persentase - b.persentase);
        case "tanggal":
        default:
          return m * (new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
      }
    });

    return enriched;
  }, [
    rekapData.kegiatanList,
    config.selectedUnits,
    config.onlyInvited,
    kegiatanSearch,
    kegiatanFilters,
    kegiatanSort,
  ]);

  const sortPesertaList = useCallback(
    (list: KegiatanPesertaItem[]) => {
      const statusRank: Record<string, number> = {
        TIDAK_HADIR: 0,
        IZIN: 1,
        MEWAKILI: 2,
        HADIR: 3,
      };
      let filtered =
        pesertaStatusFilter === "ALL"
          ? [...list]
          : list.filter((p) => p.status === pesertaStatusFilter);

      if (kegiatanSearch.trim()) {
        const q = kegiatanSearch.toLowerCase();
        // Jika query cocok nama/OPD peserta, prioritaskan tampilkan yang relevan atau tampilkan semua jika query hanya cocok nama kegiatan
        const anyParticipantMatch = filtered.some(
          (p) =>
            p.nama.toLowerCase().includes(q) ||
            p.instansi.toLowerCase().includes(q) ||
            p.jabatan.toLowerCase().includes(q)
        );
        if (anyParticipantMatch) {
          filtered = filtered.filter(
            (p) =>
              p.nama.toLowerCase().includes(q) ||
              p.instansi.toLowerCase().includes(q) ||
              p.jabatan.toLowerCase().includes(q)
          );
        }
      }

      filtered.sort((a, b) => {
        const m = pesertaSort.dir === "asc" ? 1 : -1;
        switch (pesertaSort.key) {
          case "nama":
            return m * a.nama.localeCompare(b.nama, "id");
          case "instansi":
            return m * a.instansi.localeCompare(b.instansi, "id");
          case "eselon":
            return m * (a.eselon || "ZZZ").localeCompare(b.eselon || "ZZZ", "id");
          case "waktuInput": {
            const ta = a.waktuInput ? new Date(a.waktuInput).getTime() : 0;
            const tb = b.waktuInput ? new Date(b.waktuInput).getTime() : 0;
            return m * (ta - tb);
          }
          case "status":
          default:
            return (
              m * ((statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)) ||
              a.instansi.localeCompare(b.instansi, "id") ||
              a.nama.localeCompare(b.nama, "id")
            );
        }
      });
      return filtered;
    },
    [pesertaSort, pesertaStatusFilter, kegiatanSearch]
  );

  const toggleKegiatanExpand = (id: string) => {
    setExpandedKegiatanIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    kegiatanFilters.adaAlpa ||
    kegiatanFilters.lowAttendance ||
    kegiatanFilters.adaLuarTitik ||
    pesertaStatusFilter !== "ALL" ||
    Boolean(opdSearch) ||
    Boolean(pegawaiSearch) ||
    Boolean(kegiatanSearch);

  return (
    <div className={resolvedDark ? "dark" : ""}>
      <div className="min-h-screen w-full bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
        {/* 1. TOP COMMAND BAR */}
        <header className="sticky top-0 z-30 shrink-0 bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span
              className={`hidden sm:block w-2.5 h-2.5 rounded-full shrink-0 ${
                autoRefresh ? "bg-emerald-600" : "bg-slate-400 dark:bg-zinc-600"
              }`}
            />
            <div className="min-w-0">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-2.5 gap-y-0.5">
                <h1 className="text-xs sm:text-base font-bold text-slate-950 dark:text-zinc-50 tracking-tight truncate">
                  {config.title || "Rekapitulasi Kehadiran Perangkat Daerah"}
                </h1>
                <span className="w-fit text-[11px] sm:text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-300 sm:bg-slate-100 sm:dark:bg-zinc-800 sm:px-2 sm:py-0.5 sm:rounded sm:border sm:border-slate-300 sm:dark:border-zinc-700">
                  {config.startDate} s/d {config.endDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isAnyFilterActive && (
              <button
                onClick={resetAllFilters}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded text-[11px] sm:text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1"
                title="Reset semua filter"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Filter</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}

            <span className="hidden lg:inline-block text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400 mr-1.5">
              {formatWita(lastRefreshed, "HH:mm:ss")} WITA
            </span>

            {/* Auto Refresh Toggle */}
            <button
              onClick={toggleAutoRefresh}
              className={`h-7 sm:h-8 px-2 sm:px-3 rounded text-[11px] sm:text-xs font-bold border transition-colors flex items-center gap-1.5 ${
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
              <span className="hidden sm:inline">Auto Update</span>
              <span className="sm:hidden">Auto</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded flex items-center justify-center bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 transition-colors"
              title="Muat ulang data"
            >
              <RotateCcw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            {/* Mobile Single Cycle Theme Button */}
            <button
              type="button"
              onClick={() =>
                handleSetTheme(
                  themeMode === "light" ? "dark" : themeMode === "dark" ? "system" : "light"
                )
              }
              className="sm:hidden h-7 w-7 rounded flex items-center justify-center bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700"
              title={`Tema: ${themeMode === "light" ? "Terang" : themeMode === "dark" ? "Gelap" : "Sistem"}`}
            >
              {themeMode === "light" ? (
                <Sun className="w-3.5 h-3.5" />
              ) : themeMode === "dark" ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Monitor className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Desktop Theme Switcher Segmented (Terang / Gelap / Sistem) */}
            <div className="hidden sm:flex items-center p-0.5 rounded bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700">
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
                <span>Terang</span>
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
                <span>Gelap</span>
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
                <span>Sistem</span>
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
                {topDiligentData.opdKritisCount}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                Nol Hadir: {topDiligentData.opdZeroCount}
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
          {/* Kolom 1: Sorotan OPD & Pejabat Terajin Lengkap (5 Col) */}
          <div className="lg:col-span-5 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  OPD Terajin ({topDiligentData.opdTerajin.length})
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Hadir / Capaian
                </span>
              </div>
              {topDiligentData.opdTerajin.length === 0 ? (
                <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 py-1.5">
                  Belum ada data kehadiran OPD.
                </p>
              ) : (
                <div className="max-h-[190px] overflow-y-auto pr-1 space-y-1">
                  {topDiligentData.opdTerajin.map((o, idx) => (
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
                      <span className="text-xs shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">
                        {o.hadir + o.mewakili} Hadir · {o.persentaseKehadiran}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 dark:border-zinc-800 pb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Pejabat / Individu Terajin ({topDiligentData.pegawaiTerajin.length})
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  Hadir / Capaian
                </span>
              </div>
              {topDiligentData.pegawaiTerajin.length === 0 ? (
                <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 py-1.5">
                  Belum ada data kehadiran individu.
                </p>
              ) : (
                <div className="max-h-[190px] overflow-y-auto pr-1 space-y-1">
                  {topDiligentData.pegawaiTerajin.map((p, idx) => (
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
                      <span className="text-xs shrink-0 tabular-nums text-emerald-700 dark:text-emerald-400 font-bold">
                        {p.hadir + p.mewakili} Hadir · {p.persentaseKehadiran}%
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
        <main className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-300 dark:divide-zinc-800 bg-white dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800">
          {/* PANE KIRI: TABEL PERANGKAT DAERAH (OPD) */}
          <section className="xl:col-span-6 flex flex-col min-w-0">
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
            <div className="overflow-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-950 text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300 sticky top-0 z-10 border-b border-slate-300 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center w-9">No</th>
                    <th className="py-2.5 px-3">
                      <SortHeaderButton
                        label="Perangkat Daerah (OPD)"
                        active={opdSort.key === "instansi"}
                        dir={opdSort.dir}
                        onClick={() => handleToggleOpdSort("instansi")}
                      />
                    </th>
                    <th className="py-2.5 px-2 text-right w-16">
                      <SortHeaderButton
                        label="Undang"
                        active={opdSort.key === "totalDiundang"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("totalDiundang")}
                      />
                    </th>
                    <th className="py-2.5 px-2 text-right w-16">
                      <SortHeaderButton
                        label="Hadir"
                        active={opdSort.key === "hadir"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("hadir")}
                      />
                    </th>
                    <th className="hidden sm:table-cell py-2.5 px-2 text-right w-16">
                      <SortHeaderButton
                        label="Wakil"
                        active={opdSort.key === "mewakili"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("mewakili")}
                      />
                    </th>
                    <th className="hidden sm:table-cell py-2.5 px-2 text-right w-14">
                      <SortHeaderButton
                        label="Izin"
                        active={opdSort.key === "izin"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("izin")}
                      />
                    </th>
                    <th className="py-2.5 px-2 text-right w-14">
                      <SortHeaderButton
                        label="Alpa"
                        active={opdSort.key === "tidakHadir"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("tidakHadir")}
                      />
                    </th>
                    <th className="hidden md:table-cell py-2.5 px-2 text-right w-20">
                      <SortHeaderButton
                        label="Luar Titik"
                        active={opdSort.key === "hadirLuarRadius"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("hadirLuarRadius")}
                      />
                    </th>
                    <th className="py-2.5 px-3 text-right w-20">
                      <SortHeaderButton
                        label="Capaian"
                        active={opdSort.key === "persentaseKehadiran"}
                        dir={opdSort.dir}
                        align="right"
                        onClick={() => handleToggleOpdSort("persentaseKehadiran")}
                      />
                    </th>
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
          <section className="xl:col-span-6 flex flex-col min-w-0">
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
            <div className="overflow-auto max-h-[460px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-950 text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300 sticky top-0 z-10 border-b border-slate-300 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-2.5 text-center w-9">No</th>
                    <th className="py-2.5 px-3">
                      <SortHeaderButton
                        label="Nama & Jabatan"
                        active={pegawaiSort.key === "nama"}
                        dir={pegawaiSort.dir}
                        onClick={() => handleTogglePegawaiSort("nama")}
                      />
                    </th>
                    <th className="hidden md:table-cell py-2.5 px-2">
                      <SortHeaderButton
                        label="OPD"
                        active={pegawaiSort.key === "instansi"}
                        dir={pegawaiSort.dir}
                        onClick={() => handleTogglePegawaiSort("instansi")}
                      />
                    </th>
                    <th className="py-2.5 px-1.5 text-center w-16">
                      <SortHeaderButton
                        label="Eselon"
                        active={pegawaiSort.key === "eselon"}
                        dir={pegawaiSort.dir}
                        align="center"
                        onClick={() => handleTogglePegawaiSort("eselon")}
                      />
                    </th>
                    <th className="py-2.5 px-2 text-right w-16">
                      <SortHeaderButton
                        label="Undang"
                        active={pegawaiSort.key === "totalDiundang"}
                        dir={pegawaiSort.dir}
                        align="right"
                        onClick={() => handleTogglePegawaiSort("totalDiundang")}
                      />
                    </th>
                    <th className="py-2.5 px-2 text-right w-16">
                      <SortHeaderButton
                        label="Hadir"
                        active={pegawaiSort.key === "hadirTotal"}
                        dir={pegawaiSort.dir}
                        align="right"
                        onClick={() => handleTogglePegawaiSort("hadirTotal")}
                      />
                    </th>
                    <th className="py-2.5 px-2 text-right w-14">
                      <SortHeaderButton
                        label="Alpa"
                        active={pegawaiSort.key === "tidakHadir"}
                        dir={pegawaiSort.dir}
                        align="right"
                        onClick={() => handleTogglePegawaiSort("tidakHadir")}
                      />
                    </th>
                    <th className="hidden sm:table-cell py-2.5 px-2 text-right w-20">
                      <SortHeaderButton
                        label="Luar Titik"
                        active={pegawaiSort.key === "hadirLuarRadius"}
                        dir={pegawaiSort.dir}
                        align="right"
                        onClick={() => handleTogglePegawaiSort("hadirLuarRadius")}
                      />
                    </th>
                    <th className="py-2.5 px-3 text-right w-20">
                      <SortHeaderButton
                        label="Capaian"
                        active={pegawaiSort.key === "persentaseKehadiran"}
                        dir={pegawaiSort.dir}
                        align="right"
                        onClick={() => handleTogglePegawaiSort("persentaseKehadiran")}
                      />
                    </th>
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

        {/* 5. DAFTAR KEGIATAN, UNDANGAN & KEHADIRAN LENGKAP */}
        <section className="bg-white dark:bg-zinc-900">
          {/* Toolbar Filter Kegiatan */}
          <div className="p-3 sm:px-5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                  Daftar Kegiatan, Undangan &amp; Kehadiran Lengkap
                </h2>
                <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-zinc-200 bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {filteredKegiatanList.length}
                </span>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kegiatan, tempat, atau nama peserta..."
                  value={kegiatanSearch}
                  onChange={(e) => setKegiatanSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-7 text-xs font-medium bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500"
                />
                {kegiatanSearch && (
                  <button
                    onClick={() => setKegiatanSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Checkbox Filter Bar Kegiatan (Persisted in localStorage) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={kegiatanFilters.adaAlpa}
                    onChange={(e) => updateKegiatanFilter("adaAlpa", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Ada Alpa</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={kegiatanFilters.lowAttendance}
                    onChange={(e) => updateKegiatanFilter("lowAttendance", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Capaian &lt; 80%</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={kegiatanFilters.adaLuarTitik}
                    onChange={(e) => updateKegiatanFilter("adaLuarTitik", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Ada Luar Titik</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-zinc-800/90 border border-slate-300 dark:border-zinc-700 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={kegiatanFilters.expandAll}
                    onChange={(e) => updateKegiatanFilter("expandAll", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-400 accent-slate-900 dark:accent-zinc-200"
                  />
                  <span>Buka Semua Rincian</span>
                </label>
              </div>

              {/* Filter Status Peserta (Global untuk rincian undangan) */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold">
                {(
                  [
                    { id: "ALL", label: "Semua Status" },
                    { id: "HADIR", label: "Hadir" },
                    { id: "MEWAKILI", label: "Mewakili" },
                    { id: "IZIN", label: "Izin" },
                    { id: "TIDAK_HADIR", label: "Alpa" },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setPesertaStatusFilter(st.id)}
                    className={`px-2 py-1 rounded border transition-colors ${
                      pesertaStatusFilter === st.id
                        ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-slate-900 dark:border-zinc-100"
                        : "bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabel Daftar Kegiatan */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-950 text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300 border-b border-slate-300 dark:border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3 w-36">
                    <SortHeaderButton
                      label="Tanggal"
                      active={kegiatanSort.key === "tanggal"}
                      dir={kegiatanSort.dir}
                      onClick={() => handleToggleKegiatanSort("tanggal")}
                    />
                  </th>
                  <th className="py-2.5 px-3">
                    <SortHeaderButton
                      label="Nama Kegiatan & Lokasi"
                      active={kegiatanSort.key === "namaKegiatan"}
                      dir={kegiatanSort.dir}
                      onClick={() => handleToggleKegiatanSort("namaKegiatan")}
                    />
                  </th>
                  <th className="py-2.5 px-2 text-right w-20">
                    <SortHeaderButton
                      label="Diundang"
                      active={kegiatanSort.key === "diundang"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("diundang")}
                    />
                  </th>
                  <th className="py-2.5 px-2 text-right w-16">
                    <SortHeaderButton
                      label="Hadir"
                      active={kegiatanSort.key === "hadir"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("hadir")}
                    />
                  </th>
                  <th className="hidden sm:table-cell py-2.5 px-2 text-right w-16">
                    <SortHeaderButton
                      label="Wakil"
                      active={kegiatanSort.key === "mewakili"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("mewakili")}
                    />
                  </th>
                  <th className="hidden sm:table-cell py-2.5 px-2 text-right w-14">
                    <SortHeaderButton
                      label="Izin"
                      active={kegiatanSort.key === "izin"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("izin")}
                    />
                  </th>
                  <th className="py-2.5 px-2 text-right w-16">
                    <SortHeaderButton
                      label="Alpa"
                      active={kegiatanSort.key === "tidakHadir"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("tidakHadir")}
                    />
                  </th>
                  <th className="hidden md:table-cell py-2.5 px-2 text-right w-20">
                    <SortHeaderButton
                      label="Luar Titik"
                      active={kegiatanSort.key === "luarTitik"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("luarTitik")}
                    />
                  </th>
                  <th className="py-2.5 px-3 text-right w-20">
                    <SortHeaderButton
                      label="Capaian"
                      active={kegiatanSort.key === "persentase"}
                      dir={kegiatanSort.dir}
                      align="right"
                      onClick={() => handleToggleKegiatanSort("persentase")}
                    />
                  </th>
                  <th className="py-2.5 px-3 text-center w-12">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-xs tabular-nums">
                {filteredKegiatanList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-12 text-center text-slate-600 dark:text-zinc-400 font-medium text-xs"
                    >
                      Tidak ada kegiatan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredKegiatanList.map((keg, idx) => {
                    const isExpanded =
                      kegiatanFilters.expandAll || Boolean(expandedKegiatanIds[keg.id]);
                    const sortedPeserta = isExpanded ? sortPesertaList(keg.peserta) : [];
                    return (
                      <React.Fragment key={keg.id}>
                        <tr
                          onClick={() => toggleKegiatanExpand(keg.id)}
                          className={`cursor-pointer transition-colors hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 ${
                            isExpanded ? "bg-slate-50 dark:bg-zinc-800/40" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-500 dark:text-zinc-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-zinc-100 block">
                              {formatWita(keg.tanggal, "dd MMM yyyy")}
                            </span>
                            {keg.waktu && (
                              <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 block mt-0.5">
                                {keg.waktu}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-zinc-100 block leading-snug">
                              {keg.namaKegiatan}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-600 dark:text-zinc-400">
                              {keg.tempat && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span>{keg.tempat}</span>
                                </span>
                              )}
                              {keg.kategori && (
                                <span className="font-semibold text-slate-500 dark:text-zinc-400">
                                  • {keg.kategori}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300">
                            {keg.totalDiundang}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            {keg.hadir}
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2 text-right font-semibold text-amber-700 dark:text-amber-400">
                            {keg.mewakili}
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2 text-right font-semibold text-slate-700 dark:text-zinc-300">
                            {keg.izin}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right font-extrabold ${
                              keg.tidakHadir > 0
                                ? "text-rose-700 dark:text-rose-400"
                                : "text-slate-400 dark:text-zinc-600 font-normal"
                            }`}
                          >
                            {keg.tidakHadir}
                          </td>
                          <td className="hidden md:table-cell py-2.5 px-2 text-right">
                            {keg.luarTitik > 0 ? (
                              <span className="text-amber-700 dark:text-amber-400 font-bold">
                                {keg.luarTitik}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-xs ${
                                keg.persentase >= 80
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                  : keg.persentase >= 60
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              }`}
                            >
                              {keg.persentase}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleKegiatanExpand(keg.id);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                              title={isExpanded ? "Tutup rincian" : "Lihat rincian undangan & kehadiran"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* SUB-TABEL UNDANGAN & KEHADIRAN LENGKAP */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80 dark:bg-zinc-950/60">
                            <td colSpan={11} className="p-3 sm:px-6 sm:py-4">
                              <div className="border border-slate-300 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 overflow-hidden">
                                <div className="px-3 py-2 bg-slate-100 dark:bg-zinc-950 border-b border-slate-300 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                                  <span>
                                    Daftar Undangan &amp; Kehadiran ({sortedPeserta.length} dari{" "}
                                    {keg.peserta.length} Peserta)
                                  </span>
                                  <div className="flex flex-wrap items-center gap-3 tabular-nums">
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                      Hadir: {keg.hadir}
                                    </span>
                                    <span className="text-amber-700 dark:text-amber-400">
                                      Wakil: {keg.mewakili}
                                    </span>
                                    <span className="text-slate-700 dark:text-zinc-300">
                                      Izin: {keg.izin}
                                    </span>
                                    <span className="text-rose-700 dark:text-rose-400">
                                      Alpa: {keg.tidakHadir}
                                    </span>
                                  </div>
                                </div>

                                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 dark:bg-zinc-900 text-[11px] uppercase font-bold tracking-wider text-slate-700 dark:text-zinc-300 sticky top-0 z-10 border-b border-slate-200 dark:border-zinc-800">
                                      <tr>
                                        <th className="py-2 px-2.5 text-center w-9">No</th>
                                        <th className="py-2 px-3">
                                          <SortHeaderButton
                                            label="Nama & Jabatan"
                                            active={pesertaSort.key === "nama"}
                                            dir={pesertaSort.dir}
                                            onClick={() => handleTogglePesertaSort("nama")}
                                          />
                                        </th>
                                        <th className="hidden md:table-cell py-2 px-2.5">
                                          <SortHeaderButton
                                            label="Perangkat Daerah (OPD)"
                                            active={pesertaSort.key === "instansi"}
                                            dir={pesertaSort.dir}
                                            onClick={() => handleTogglePesertaSort("instansi")}
                                          />
                                        </th>
                                        <th className="py-2 px-2 text-center w-16">
                                          <SortHeaderButton
                                            label="Eselon"
                                            active={pesertaSort.key === "eselon"}
                                            dir={pesertaSort.dir}
                                            align="center"
                                            onClick={() => handleTogglePesertaSort("eselon")}
                                          />
                                        </th>
                                        <th className="py-2 px-2.5 text-center w-28">
                                          <SortHeaderButton
                                            label="Status"
                                            active={pesertaSort.key === "status"}
                                            dir={pesertaSort.dir}
                                            align="center"
                                            onClick={() => handleTogglePesertaSort("status")}
                                          />
                                        </th>
                                        <th className="hidden sm:table-cell py-2 px-3 text-right w-40">
                                          <SortHeaderButton
                                            label="Waktu & Lokasi"
                                            active={pesertaSort.key === "waktuInput"}
                                            dir={pesertaSort.dir}
                                            align="right"
                                            onClick={() => handleTogglePesertaSort("waktuInput")}
                                          />
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-xs tabular-nums">
                                      {sortedPeserta.length === 0 ? (
                                        <tr>
                                          <td
                                            colSpan={6}
                                            className="py-6 text-center text-slate-500 dark:text-zinc-400"
                                          >
                                            Tidak ada peserta dengan status yang dipilih.
                                          </td>
                                        </tr>
                                      ) : (
                                        sortedPeserta.map((ps, pIdx) => {
                                          const stLabel =
                                            ps.status === "HADIR"
                                              ? "Hadir"
                                              : ps.status === "MEWAKILI"
                                              ? "Mewakili"
                                              : ps.status === "IZIN"
                                              ? "Izin"
                                              : "Alpa";
                                          const stClass =
                                            ps.status === "HADIR"
                                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                              : ps.status === "MEWAKILI"
                                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                              : ps.status === "IZIN"
                                              ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700"
                                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800";

                                          return (
                                            <tr
                                              key={`${ps.id}_${pIdx}`}
                                              className="hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                                            >
                                              <td className="py-2 px-2.5 text-center font-semibold text-slate-500 dark:text-zinc-400">
                                                {pIdx + 1}
                                              </td>
                                              <td className="py-2 px-3">
                                                <span className="font-bold text-slate-900 dark:text-zinc-100 block leading-snug">
                                                  {ps.nama}
                                                  {ps.isNonUndangan && (
                                                    <span className="ml-1.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                                                      (Non-Undangan)
                                                    </span>
                                                  )}
                                                </span>
                                                <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 block mt-0.5">
                                                  {ps.jabatan || "-"}
                                                </span>
                                                <span className="md:hidden text-[10px] font-medium text-slate-500 dark:text-zinc-500 block mt-0.5">
                                                  {ps.instansi}
                                                </span>
                                                {ps.status === "MEWAKILI" && ps.namaPerwakilan && (
                                                  <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block mt-0.5">
                                                    Diwakili: {ps.namaPerwakilan}
                                                    {ps.jabatanPerwakilan
                                                      ? ` (${ps.jabatanPerwakilan})`
                                                      : ""}
                                                  </span>
                                                )}
                                                {ps.keterangan && (
                                                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5 italic">
                                                    Ket: {ps.keterangan}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="hidden md:table-cell py-2 px-2.5 font-medium text-slate-700 dark:text-zinc-300">
                                                {ps.instansi}
                                              </td>
                                              <td className="py-2 px-2 text-center">
                                                {ps.eselon ? (
                                                  <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-zinc-700">
                                                    {ps.eselon}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400 dark:text-zinc-600">
                                                    -
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-2.5 text-center">
                                                <span
                                                  className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${stClass}`}
                                                >
                                                  {stLabel}
                                                </span>
                                              </td>
                                              <td className="hidden sm:table-cell py-2 px-3 text-right">
                                                {ps.waktuInput ? (
                                                  <div className="inline-flex flex-col items-end">
                                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                                                      <Clock className="w-3 h-3 text-slate-400" />
                                                      {formatWita(ps.waktuInput, "HH:mm")} WITA
                                                    </span>
                                                    {ps.isInsideRadius === false ? (
                                                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                        Luar Titik
                                                      </span>
                                                    ) : ps.isInsideRadius === true ? (
                                                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                                        Di Lokasi
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-400 dark:text-zinc-600">
                                                    -
                                                  </span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
