/**
 * Bentuk minimal data rekap yang dibutuhkan laporan grafis.
 * Dibuat struktural agar kompatibel dengan tipe di RekapKehadiranView.
 */
export type GrafisOpdHistoryInput = {
  tanggal: Date | string;
  totalDiundang: number;
  hadir: number;
  hadirValid?: number;
  hadirLuarRadius?: number;
  hadirNonUndangan?: number;
  mewakili: number;
  izin?: number;
  tidakHadir?: number;
  isCancelledSession?: boolean;
  pesertaList?: {
    status: string;
    isInsideRadius?: boolean | null;
    isNonUndangan?: boolean;
  }[];
};

export type GrafisOpdInput = {
  instansi: string;
  totalDiundang: number;
  hadir: number;
  hadirValid?: number;
  hadirLuarRadius?: number;
  hadirNonUndangan?: number;
  mewakili: number;
  tidakHadir: number;
  izin: number;
  persentaseKehadiran: number;
  history: GrafisOpdHistoryInput[];
};

export type GrafisPegawaiInput = {
  nama: string;
  instansi: string;
  eselon?: string | null;
  totalDiundang: number;
  hadir: number;
  hadirValid?: number;
  hadirLuarRadius?: number;
  hadirNonUndangan?: number;
  mewakili: number;
  persentaseKehadiran: number;
  history?: {
    status: string;
    isInsideRadius?: boolean | null;
    isNonUndangan?: boolean;
    isCancelledSession?: boolean;
  }[];
};

export type BuildGrafisOptions = {
  /** Jika true (default), mengecualikan kehadiran non-undangan dari seluruh kalkulasi grafis */
  onlyInvited?: boolean;
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

export function buildGrafisData(
  input: GrafisInput,
  options?: BuildGrafisOptions
): GrafisData {
  const onlyInvited = options?.onlyInvited ?? true;
  const rawOpds = input.opdSummary || [];
  const rawPegawais = input.pegawaiSummary || [];

  // Normalisasi data OPD berdasarkan filter onlyInvited
  const opds: GrafisOpdInput[] = [];
  for (let i = 0; i < rawOpds.length; i++) {
    const o = rawOpds[i];
    if (!onlyInvited) {
      opds.push(o);
      continue;
    }

    const hist = o.history || [];
    if (hist.length > 0) {
      let totalDiundang = 0;
      let hadir = 0;
      let hadirValid = 0;
      let hadirLuarRadius = 0;
      let mewakili = 0;
      let izin = 0;
      let tidakHadir = 0;
      const filteredHistory: GrafisOpdHistoryInput[] = [];

      for (let j = 0; j < hist.length; j++) {
        const h = hist[j];
        if (h.isCancelledSession) {
          filteredHistory.push(h);
          continue;
        }

        if (h.pesertaList && h.pesertaList.length > 0) {
          let hDiundang = 0;
          let hHadir = 0;
          let hValid = 0;
          let hLuar = 0;
          let hMewakili = 0;
          let hIzin = 0;
          let hTidakHadir = 0;

          for (let k = 0; k < h.pesertaList.length; k++) {
            const p = h.pesertaList[k];
            if (p.isNonUndangan) continue;
            hDiundang += 1;
            if (p.status === "HADIR") {
              hHadir += 1;
              if (p.isInsideRadius === true) hValid += 1;
              else if (p.isInsideRadius === false) hLuar += 1;
            } else if (p.status === "MEWAKILI") {
              hMewakili += 1;
            } else if (p.status === "IZIN") {
              hIzin += 1;
            } else {
              hTidakHadir += 1;
            }
          }

          if (hDiundang > 0) {
            totalDiundang += hDiundang;
            hadir += hHadir;
            hadirValid += hValid;
            hadirLuarRadius += hLuar;
            mewakili += hMewakili;
            izin += hIzin;
            tidakHadir += hTidakHadir;
            filteredHistory.push({
              ...h,
              totalDiundang: hDiundang,
              hadir: hHadir,
              hadirValid: hValid,
              hadirLuarRadius: hLuar,
              mewakili: hMewakili,
              izin: hIzin,
              tidakHadir: hTidakHadir,
            });
          }
        } else {
          const nonUnd = h.hadirNonUndangan || 0;
          const hDiundang = h.totalDiundang || 0;
          if (hDiundang <= 0) continue;
          const hHadir = Math.max(0, (h.hadir || 0) - nonUnd);
          const hMewakili = h.mewakili || 0;
          totalDiundang += hDiundang;
          hadir += hHadir;
          mewakili += hMewakili;
          izin += h.izin || 0;
          tidakHadir += h.tidakHadir || 0;
          filteredHistory.push({
            ...h,
            totalDiundang: hDiundang,
            hadir: hHadir,
            mewakili: hMewakili,
          });
        }
      }

      if (totalDiundang > 0) {
        // Jika pesertaList tidak ada di history, estimasi hadirValid & hadirLuarRadius proporsional/dikurangi nonUndangan
        if (!hist.some((h) => h.pesertaList && h.pesertaList.length > 0)) {
          const nonUndTotal = o.hadirNonUndangan || 0;
          hadirValid = Math.max(0, (o.hadirValid || 0) - nonUndTotal);
          hadirLuarRadius = o.hadirLuarRadius || 0;
        }
        opds.push({
          ...o,
          totalDiundang,
          hadir,
          hadirValid,
          hadirLuarRadius,
          mewakili,
          izin,
          tidakHadir,
          persentaseKehadiran: Math.min(100, pct(hadir + mewakili, totalDiundang)),
          history: filteredHistory,
        });
      }
    } else {
      const nonUnd = o.hadirNonUndangan || 0;
      const totalDiundang = o.totalDiundang || 0;
      if (totalDiundang <= 0) continue;
      const hadir = Math.max(0, (o.hadir || 0) - nonUnd);
      const mewakili = o.mewakili || 0;
      opds.push({
        ...o,
        totalDiundang,
        hadir,
        hadirValid: Math.max(0, (o.hadirValid || 0) - nonUnd),
        mewakili,
        persentaseKehadiran: Math.min(100, pct(hadir + mewakili, totalDiundang)),
      });
    }
  }

  // Normalisasi data Pegawai berdasarkan filter onlyInvited
  const pegawais: GrafisPegawaiInput[] = [];
  for (let i = 0; i < rawPegawais.length; i++) {
    const p = rawPegawais[i];
    if (!onlyInvited) {
      pegawais.push(p);
      continue;
    }

    if (p.history && p.history.length > 0) {
      let diundang = 0;
      let hadir = 0;
      let mewakili = 0;
      for (let j = 0; j < p.history.length; j++) {
        const h = p.history[j];
        if (h.isCancelledSession || h.isNonUndangan) continue;
        diundang += 1;
        if (h.status === "HADIR") hadir += 1;
        else if (h.status === "MEWAKILI") mewakili += 1;
      }
      if (diundang > 0) {
        pegawais.push({
          ...p,
          totalDiundang: diundang,
          hadir,
          mewakili,
          persentaseKehadiran: pct(hadir + mewakili, diundang),
        });
      }
    } else {
      const nonUnd = p.hadirNonUndangan || 0;
      const diundang = Math.max(0, (p.totalDiundang || 0) - nonUnd);
      if (diundang <= 0) continue;
      const hadir = Math.max(0, (p.hadir || 0) - nonUnd);
      const mewakili = p.mewakili || 0;
      pegawais.push({
        ...p,
        totalDiundang: diundang,
        hadir,
        mewakili,
        persentaseKehadiran: pct(hadir + mewakili, diundang),
      });
    }
  }

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
