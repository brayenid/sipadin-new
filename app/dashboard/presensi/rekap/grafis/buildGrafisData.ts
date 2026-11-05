/**
 * Bentuk minimal data rekap yang dibutuhkan laporan grafis.
 * Dibuat struktural agar kompatibel dengan tipe di RekapKehadiranView.
 */
export type GrafisOpdInput = {
  instansi: string;
  totalDiundang: number;
  hadir: number;
  hadirValid?: number;
  hadirLuarRadius?: number;
  mewakili: number;
  tidakHadir: number;
  izin: number;
  persentaseKehadiran: number;
  history: {
    tanggal: Date | string;
    totalDiundang: number;
    hadir: number;
    mewakili: number;
    isCancelledSession?: boolean;
  }[];
};

export type GrafisPegawaiInput = {
  nama: string;
  instansi: string;
  eselon?: string | null;
  totalDiundang: number;
  hadir: number;
  mewakili: number;
  persentaseKehadiran: number;
};

export type GrafisInput = {
  totalAgenda: number;
  opdSummary: GrafisOpdInput[];
  pegawaiSummary: GrafisPegawaiInput[];
};

export type StatusTotals = {
  hadir: number;
  mewakili: number;
  izin: number;
  tidakHadir: number;
};

export type EselonStat = {
  label: string;
  jumlahPegawai: number;
  hadirTotal: number;
  diundangTotal: number;
  persentase: number;
};

export type TopPegawai = {
  nama: string;
  instansi: string;
  persentase: number;
  hadir: number;
  diundang: number;
};

export type OpdRank = {
  instansi: string;
  persentase: number;
};

export type HeatmapRow = {
  instansi: string;
  /** persentase per bulan, null = tidak ada undangan pada bulan itu */
  cells: (number | null)[];
};

export type MonthlyTrend = {
  bulanKey: string;
  bulanLabel: string;
  persentase: number;
  hadir: number;
  diundang: number;
};

export type GrafisData = {
  kpi: {
    totalAgenda: number;
    jumlahOpd: number;
    rataRataKehadiran: number;
    hadirValid: number;
    hadirLuarRadius: number;
    unitKosong: number;
  };
  status: StatusTotals;
  eselon: EselonStat[];
  topPegawai: TopPegawai[];
  topOpd: OpdRank[];
  bottomOpd: OpdRank[];
  heatmap: {
    bulanLabels: string[];
    rows: HeatmapRow[];
    isTruncated?: boolean;
    totalOpdCount?: number;
  };
  monthlyTrends: MonthlyTrend[];
  unitKosongList: string[];
};

/** Minimal undangan agar pegawai layak masuk Top Pegawai (menghindari 1/1 = 100%). */
export const MIN_UNDANGAN_TOP_PEGAWAI = 3;

/** Maksimal baris Top Pegawai pada Lembar 1 */
export const MAX_TOP_PEGAWAI = 8;

/** Maksimal baris Peringkat OPD per kolom pada Lembar 1 */
export const MAX_OPD_RANK = 15;

/** Maksimal baris OPD pada heatmap infografis Lembar 2 (1 halaman penuh A4 Landscape) */
export const MAX_HEATMAP_OPD_ROWS = 32;

const ESELON_ORDER = ["Eselon I", "Eselon II", "Eselon III", "Eselon IV", "Non-Eselon"];

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** Normalisasi nilai eselon mentah ("II.b", "III.a", "NON_ESELON", null, ...) ke label tingkat. */
export function normalizeEselon(raw?: string | null): string {
  const v = (raw || "").trim();
  if (!v) return "Non-Eselon";
  const m = /^(IV|III|II|I)\b/i.exec(v);
  if (!m) return "Non-Eselon";
  return `Eselon ${m[1].toUpperCase()}`;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Ekstraksi cepat "yyyy-MM" dalam WITA (UTC+8) tanpa alokasi berat date-fns-tz */
function getFastYearMonthKey(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") {
    if (d.length >= 7 && d[4] === "-") return d.slice(0, 7);
  }
  const dateObj = typeof d === "string" ? new Date(d) : d;
  const time = dateObj.getTime();
  if (isNaN(time)) return null;
  // Geser ke zona WITA (+8 jam)
  const witaDate = new Date(time + 8 * 3600 * 1000);
  const y = witaDate.getUTCFullYear();
  const m = String(witaDate.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function bulanLabelFromKey(key: string): string {
  const parts = key.split("-");
  if (parts.length < 2) return key;
  const [y, m] = parts;
  const idx = parseInt(m, 10) - 1;
  return `${BULAN_SINGKAT[idx] ?? m} ${y.slice(2)}`;
}

export function buildGrafisData(input: GrafisInput): GrafisData {
  const opds = input.opdSummary || [];
  const pegawais = input.pegawaiSummary || [];

  // --- Status & KPI ---
  const status: StatusTotals = { hadir: 0, mewakili: 0, izin: 0, tidakHadir: 0 };
  let hadirValid = 0;
  let hadirLuarRadius = 0;
  let totalDiundangMacro = 0;
  let totalHadirMacro = 0;
  let unitKosong = 0;

  const monthKeys = new Set<string>();

  for (let i = 0; i < opds.length; i++) {
    const o = opds[i];
    status.hadir += o.hadir || 0;
    status.mewakili += o.mewakili || 0;
    status.izin += o.izin || 0;
    status.tidakHadir += o.tidakHadir || 0;
    hadirValid += o.hadirValid || 0;
    hadirLuarRadius += o.hadirLuarRadius || 0;

    const hist = o.history;
    let opdDiundang = 0;
    let opdHadir = 0;

    if (hist && hist.length > 0) {
      for (let j = 0; j < hist.length; j++) {
        const h = hist[j];
        if (h.isCancelledSession) continue;
        opdDiundang += h.totalDiundang || 0;
        opdHadir += (h.hadir || 0) + (h.mewakili || 0);

        const mKey = getFastYearMonthKey(h.tanggal);
        if (mKey) monthKeys.add(mKey);
      }
    } else {
      opdDiundang = o.totalDiundang || 0;
      opdHadir = (o.hadir || 0) + (o.mewakili || 0);
    }

    totalDiundangMacro += opdDiundang;
    totalHadirMacro += opdHadir;

    if ((o.hadir || 0) + (o.mewakili || 0) === 0) {
      unitKosong += 1;
    }
  }

  const rataRataKehadiran =
    totalDiundangMacro > 0
      ? pct(totalHadirMacro, totalDiundangMacro)
      : opds.length > 0
        ? Math.round(opds.reduce((a, o) => a + o.persentaseKehadiran, 0) / opds.length)
        : 0;

  // --- Per eselon (1 loop linear O(N)) ---
  const eselonMap = new Map<string, { n: number; hadir: number; diundang: number }>();
  for (let i = 0; i < pegawais.length; i++) {
    const p = pegawais[i];
    const key = normalizeEselon(p.eselon);
    const cur = eselonMap.get(key) || { n: 0, hadir: 0, diundang: 0 };
    cur.n += 1;
    cur.hadir += (p.hadir || 0) + (p.mewakili || 0);
    cur.diundang += p.totalDiundang || 0;
    eselonMap.set(key, cur);
  }

  const eselon: EselonStat[] = [];
  for (let i = 0; i < ESELON_ORDER.length; i++) {
    const k = ESELON_ORDER[i];
    const v = eselonMap.get(k);
    if (v) {
      eselon.push({
        label: k,
        jumlahPegawai: v.n,
        hadirTotal: v.hadir,
        diundangTotal: v.diundang,
        persentase: pct(v.hadir, v.diundang),
      });
    }
  }

  // --- Top 5 pegawai (komparator cepat tanpa localeCompare berulang) ---
  const sortPegawaiFast = (a: GrafisPegawaiInput, b: GrafisPegawaiInput) => {
    const dPct = b.persentaseKehadiran - a.persentaseKehadiran;
    if (dPct !== 0) return dPct;
    const dTotal = (b.totalDiundang || 0) - (a.totalDiundang || 0);
    if (dTotal !== 0) return dTotal;
    return a.nama < b.nama ? -1 : a.nama > b.nama ? 1 : 0;
  };

  const eligible = pegawais
    .filter((p) => (p.totalDiundang || 0) >= MIN_UNDANGAN_TOP_PEGAWAI && p.persentaseKehadiran > 0)
    .sort(sortPegawaiFast);

  let topSource = eligible.slice(0, MAX_TOP_PEGAWAI);
  if (topSource.length < MAX_TOP_PEGAWAI) {
    const picked = new Set(topSource);
    const rest = pegawais
      .filter((p) => !picked.has(p) && ((p.hadir || 0) + (p.mewakili || 0) > 0))
      .sort(sortPegawaiFast);
    topSource = [...topSource, ...rest].slice(0, MAX_TOP_PEGAWAI);
  }

  // Jika tetap kurang dari MAX_TOP_PEGAWAI, lengkapi dengan pegawai terundang lainnya
  if (topSource.length < MAX_TOP_PEGAWAI) {
    const picked = new Set(topSource);
    const restAll = pegawais
      .filter((p) => !picked.has(p) && (p.totalDiundang || 0) > 0)
      .sort(sortPegawaiFast);
    topSource = [...topSource, ...restAll].slice(0, MAX_TOP_PEGAWAI);
  }

  const topPegawai: TopPegawai[] = topSource.map((p) => ({
    nama: p.nama,
    instansi: p.instansi,
    persentase: p.persentaseKehadiran,
    hadir: (p.hadir || 0) + (p.mewakili || 0),
    diundang: p.totalDiundang || 0,
  }));

  // --- Peringkat OPD ---
  const opdSorted = [...opds].sort((a, b) => {
    const dPct = b.persentaseKehadiran - a.persentaseKehadiran;
    if (dPct !== 0) return dPct;
    return a.instansi < b.instansi ? -1 : a.instansi > b.instansi ? 1 : 0;
  });

  const topN = Math.min(MAX_OPD_RANK, opdSorted.length);
  const topOpd: OpdRank[] = opdSorted
    .slice(0, topN)
    .map((o) => ({ instansi: o.instansi, persentase: o.persentaseKehadiran }));

  // Kolom Perlu Perhatian (Terendah): urutkan dari kehadiran terendah ke atas
  const bottomN = opdSorted.length > MAX_OPD_RANK
    ? Math.min(MAX_OPD_RANK, opdSorted.length - topN)
    : opdSorted.length;
  const bottomOpd: OpdRank[] = opdSorted
    .slice(opdSorted.length - bottomN)
    .reverse()
    .map((o) => ({ instansi: o.instansi, persentase: o.persentaseKehadiran }));

  // --- Heatmap OPD x Bulan (dibatasi maksimal 30 baris untuk Lembar 2) ---
  const isTruncated = opdSorted.length > MAX_HEATMAP_OPD_ROWS;
  const targetHeatmapOpds = isTruncated ? opdSorted.slice(0, MAX_HEATMAP_OPD_ROWS) : opdSorted;
  const sortedMonths = Array.from(monthKeys).sort();

  // Akumulasi tren kehadiran agregat per bulan (seluruh OPD)
  const monthlyAgg = new Map<string, { hadir: number; diundang: number }>();

  const heatmapRows: HeatmapRow[] = targetHeatmapOpds.map((o) => {
    const m = new Map<string, { hadir: number; diundang: number }>();
    const hist = o.history;
    if (hist && hist.length > 0) {
      for (let j = 0; j < hist.length; j++) {
        const h = hist[j];
        if (h.isCancelledSession) continue;
        const key = getFastYearMonthKey(h.tanggal);
        if (!key) continue;
        const cur = m.get(key) || { hadir: 0, diundang: 0 };
        const hCount = (h.hadir || 0) + (h.mewakili || 0);
        const dCount = h.totalDiundang || 0;
        cur.hadir += hCount;
        cur.diundang += dCount;
        m.set(key, cur);
      }
    }
    return {
      instansi: o.instansi,
      cells: sortedMonths.map((k) => {
        const v = m.get(k);
        return v && v.diundang > 0 ? pct(v.hadir, v.diundang) : null;
      }),
    };
  });

  // Hitung tren seluruh OPD per bulan
  for (let i = 0; i < opds.length; i++) {
    const hist = opds[i].history;
    if (hist && hist.length > 0) {
      for (let j = 0; j < hist.length; j++) {
        const h = hist[j];
        if (h.isCancelledSession) continue;
        const key = getFastYearMonthKey(h.tanggal);
        if (!key) continue;
        const cur = monthlyAgg.get(key) || { hadir: 0, diundang: 0 };
        cur.hadir += (h.hadir || 0) + (h.mewakili || 0);
        cur.diundang += h.totalDiundang || 0;
        monthlyAgg.set(key, cur);
      }
    }
  }

  const monthlyTrends: MonthlyTrend[] = sortedMonths.map((k) => {
    const agg = monthlyAgg.get(k) || { hadir: 0, diundang: 0 };
    return {
      bulanKey: k,
      bulanLabel: bulanLabelFromKey(k),
      persentase: pct(agg.hadir, agg.diundang),
      hadir: agg.hadir,
      diundang: agg.diundang,
    };
  });

  const unitKosongList: string[] = opds
    .filter((o) => (o.hadir || 0) + (o.mewakili || 0) === 0)
    .map((o) => o.instansi);

  return {
    kpi: {
      totalAgenda: input.totalAgenda || 0,
      jumlahOpd: opds.length,
      rataRataKehadiran,
      hadirValid,
      hadirLuarRadius,
      unitKosong,
    },
    status,
    eselon,
    topPegawai,
    topOpd,
    bottomOpd,
    heatmap: {
      bulanLabels: sortedMonths.map(bulanLabelFromKey),
      rows: heatmapRows,
      isTruncated,
      totalOpdCount: opds.length,
    },
    monthlyTrends,
    unitKosongList,
  };
}
