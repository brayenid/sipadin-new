import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Svg,
  Path,
  Circle,
} from "@react-pdf/renderer";
import "@/pdf/fonts";
import type { GrafisData } from "@/app/dashboard/presensi/rekap/grafis/buildGrafisData";

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  line: "#e2e8f0",
  lineSoft: "#f1f5f9",
  card: "#ffffff",
  bg: "#ffffff",
  brand: "#1e3a8a",
  brandText: "#1e40af",
  hadir: "#16a34a",
  mewakili: "#0284c7",
  izin: "#d97706",
  tidak: "#dc2626",
};

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, Math.max(0, n - 1)).trimEnd() + "…" : s;
}

function barColor(p: number) {
  if (p >= 80) return C.hadir;
  if (p >= 60) return C.izin;
  return C.tidak;
}

function heat(p: number | null): { fill: string; text: string } {
  if (p === null) return { fill: "#f8fafc", text: "#94a3b8" };
  if (p >= 90) return { fill: "#15803d", text: "#ffffff" };
  if (p >= 80) return { fill: "#22c55e", text: "#ffffff" };
  if (p >= 60) return { fill: "#bef264", text: "#365314" };
  if (p >= 40) return { fill: "#fde047", text: "#713f12" };
  if (p >= 20) return { fill: "#fb923c", text: "#ffffff" };
  return { fill: "#ef4444", text: "#ffffff" };
}

/** Membuat path SVG sector untuk potongan pie/donut chart */
function createSectorPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export type LaporanRekapGrafisPdfProps = {
  data: GrafisData;
  periodeLabel: string;
  kategoriLabel: string;
  tanggalCetak: string;
};

function PageHeader({
  periodeLabel,
  kategoriLabel,
  tanggalCetak,
  pageNum,
}: {
  periodeLabel: string;
  kategoriLabel: string;
  tanggalCetak: string;
  pageNum: number;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerAccent} />
        <View>
          <Text style={styles.headerTitle}>LAPORAN GRAFIS REKAPITULASI KEHADIRAN</Text>
          <Text style={styles.headerSub}>
            {`Periode: ${periodeLabel}   |   Kategori Agenda: ${kategoriLabel}`}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.headerBrand}>SIPADIN • Presensi Digital</Text>
        <Text style={styles.headerMeta}>{`Dicetak: ${tanggalCetak}   |   Lembar ${pageNum} / 2`}</Text>
      </View>
    </View>
  );
}

function PageFooter({ pageNum }: { pageNum: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Sumber: data presensi SIPADIN. Kehadiran = hadir fisik + perwakilan terhadap undangan kegiatan resmi.
      </Text>
      <Text style={styles.footerPage}>{`Halaman ${pageNum} dari 2`}</Text>
    </View>
  );
}

export default function LaporanRekapGrafisPdf({
  data,
  periodeLabel,
  kategoriLabel,
  tanggalCetak,
}: LaporanRekapGrafisPdfProps) {
  const { kpi, status, eselon, topPegawai, topOpd, bottomOpd, heatmap } = data;

  const kpiItems: { label: string; value: string; tone?: string }[] = [
    { label: "Total Kegiatan", value: String(kpi.totalAgenda) },
    { label: "Jumlah OPD", value: String(kpi.jumlahOpd) },
    { label: "Rata-rata Hadir", value: `${kpi.rataRataKehadiran}%`, tone: barColor(kpi.rataRataKehadiran) },
    { label: "Hadir Valid Lokasi", value: String(kpi.hadirValid), tone: C.hadir },
    { label: "Hadir Luar Radius", value: String(kpi.hadirLuarRadius), tone: kpi.hadirLuarRadius > 0 ? C.izin : C.ink },
    { label: "OPD Tanpa Hadir", value: String(kpi.unitKosong), tone: kpi.unitKosong > 0 ? C.tidak : C.hadir },
  ];

  const statusItems = [
    { label: "Hadir Fisik", value: status.hadir, color: C.hadir },
    { label: "Mewakili", value: status.mewakili, color: C.mewakili },
    { label: "Izin / Dinas Luar", value: status.izin, color: C.izin },
  ];
  const statusTotal = statusItems.reduce((a, s) => a + s.value, 0);
  const nonZeroStatus = statusItems.filter((s) => s.value > 0);

  // Hitung sudut sektor donut
  let currentAngle = -Math.PI / 2;
  const donutSegments = nonZeroStatus.map((s) => {
    const angle = (s.value / Math.max(1, statusTotal)) * 2 * Math.PI;
    const start = currentAngle;
    const end = currentAngle + angle;
    currentAngle = end;
    return { ...s, start, end };
  });

  const hmRows = heatmap.rows;
  const hmMonths = heatmap.bulanLabels;

  return (
    <Document title={`Laporan Grafis Presensi - ${periodeLabel}`}>
      {/* ==================== LEMBAR 1 ==================== */}
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <PageHeader
          periodeLabel={periodeLabel}
          kategoriLabel={kategoriLabel}
          tanggalCetak={tanggalCetak}
          pageNum={1}
        />

        {/* Row 1: 6 KPI Cards */}
        <View style={styles.kpiRow}>
          {kpiItems.map((k) => (
            <View key={k.label} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{k.label.toUpperCase()}</Text>
              <Text style={[styles.kpiValue, { color: k.tone || C.ink }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Row 2: Tri-Card (Donut + Eselon + Top Pegawai) */}
        <View style={styles.triRow}>
          {/* Kolom 1: Donut Komposisi Partisipasi */}
          <View style={[styles.card, { width: "26%" }]}>
            <Text style={styles.cardTitle}>Komposisi Partisipasi</Text>
            <Text style={styles.cardSub}>Rasio Hadir, Mewakili, &amp; Izin</Text>

            {statusTotal === 0 ? (
              <View style={styles.emptyCenter}>
                <Text style={styles.emptyText}>Belum ada data</Text>
              </View>
            ) : (
              <View style={styles.donutContainer}>
                <View style={styles.donutChartWrap}>
                  <Svg width={84} height={84} viewBox="0 0 84 84">
                    <Circle cx="42" cy="42" r="36" fill={C.line} />
                    {donutSegments.length === 1 ? (
                      <Circle cx="42" cy="42" r="36" fill={donutSegments[0].color} />
                    ) : (
                      donutSegments.map((seg) => (
                        <Path
                          key={seg.label}
                          d={createSectorPath(42, 42, 36, seg.start, seg.end)}
                          fill={seg.color}
                        />
                      ))
                    )}
                    <Circle cx="42" cy="42" r="22" fill="#ffffff" />
                  </Svg>
                  <View style={styles.donutCenterLabel}>
                    <Text style={styles.donutTotalNum}>{statusTotal}</Text>
                    <Text style={styles.donutTotalSub}>partisipasi</Text>
                  </View>
                </View>

                <View style={styles.donutLegend}>
                  {statusItems.map((s) => {
                    const p = statusTotal > 0 ? Math.round((s.value / statusTotal) * 100) : 0;
                    return (
                      <View key={s.label} style={styles.donutLegendItem}>
                        <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                        <View>
                          <Text style={styles.legendLabel}>{s.label}</Text>
                          <Text style={styles.legendSub}>{`${s.value} catatan (${p}%)`}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Kolom 2: Kehadiran per Eselon */}
          <View style={[styles.card, { width: "33%" }]}>
            <Text style={styles.cardTitle}>Kehadiran per Eselon</Text>
            <Text style={styles.cardSub}>Persentase kehadiran fisik &amp; perwakilan</Text>

            {eselon.length === 0 ? (
              <View style={styles.emptyCenter}>
                <Text style={styles.emptyText}>Data eselon belum tersedia</Text>
              </View>
            ) : (
              <View style={styles.listBody}>
                {eselon.map((e) => (
                  <View key={e.label} style={styles.eselonRow}>
                    <Text style={styles.eselonLabel}>{e.label}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min(100, Math.max(e.persentase > 0 ? 2 : 0, e.persentase))}%`,
                            backgroundColor: barColor(e.persentase),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.eselonPct}>{`${e.persentase}%`}</Text>
                    <Text style={styles.eselonMeta}>{`${e.jumlahPegawai} org • ${e.hadirTotal}/${e.diundangTotal}`}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Kolom 3: Top Pegawai Terajin (Hingga 8 Pegawai) */}
          <View style={[styles.card, { width: "41%" }]}>
            <Text style={styles.cardTitle}>{`Top ${topPegawai.length || 8} Pegawai Terajin`}</Text>
            <Text style={styles.cardSub}>Kehadiran tertinggi (min. 3 undangan)</Text>

            {topPegawai.length === 0 ? (
              <View style={styles.emptyCenter}>
                <Text style={styles.emptyText}>Belum ada data pegawai</Text>
              </View>
            ) : (
              <View style={styles.listBodyCompact}>
                {topPegawai.map((p, i) => {
                  const rankBg =
                    i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : C.brand;
                  return (
                    <View key={`${p.nama}-${i}`} style={styles.pegawaiRow}>
                      <View style={[styles.rankBadge, { backgroundColor: rankBg }]}>
                        <Text style={styles.rankBadgeText}>{i + 1}</Text>
                      </View>
                      <View style={styles.pegawaiInfo}>
                        <Text style={styles.pegawaiName}>{trunc(p.nama, 28)}</Text>
                        <Text style={styles.pegawaiInstansi}>{trunc(p.instansi, 34)}</Text>
                      </View>
                      <View style={styles.pegawaiBarTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.min(100, Math.max(p.persentase > 0 ? 3 : 0, p.persentase))}%`,
                              backgroundColor: barColor(p.persentase),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.pegawaiPct}>{`${p.persentase}%`}</Text>
                      <Text style={styles.pegawaiRatio}>{`${p.hadir}/${p.diundang}`}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Row 3: Peringkat OPD (Top 15 vs Bottom 15) */}
        <View style={styles.opdRankRow}>
          {[
            {
              title: "Peringkat Teratas OPD",
              subtitle: `Tingkat kehadiran tertinggi (maks. ${topOpd.length || 15} OPD)`,
              rows: topOpd,
            },
            {
              title: "Perlu Perhatian (Terendah)",
              subtitle: `Tingkat kehadiran terendah (maks. ${bottomOpd.length || 15} OPD)`,
              rows: bottomOpd,
            },
          ].map((col) => (
            <View key={col.title} style={[styles.card, { flex: 1 }]}>
              <Text style={styles.cardTitle}>{col.title}</Text>
              <Text style={styles.cardSub}>{col.subtitle}</Text>

              {col.rows.length === 0 ? (
                <View style={styles.emptyCenter}>
                  <Text style={styles.emptyText}>Tidak ada data</Text>
                </View>
              ) : (
                <View style={styles.opdListBody}>
                  {col.rows.map((r, i) => (
                    <View key={`${r.instansi}-${i}`} style={styles.opdRankItem}>
                      <Text style={styles.opdRankNum}>{`${i + 1}.`}</Text>
                      <Text style={styles.opdRankName}>{trunc(r.instansi, 48)}</Text>
                      <View style={styles.opdBarTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.min(100, Math.max(r.persentase > 0 ? 2 : 0, r.persentase))}%`,
                              backgroundColor: barColor(r.persentase),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.opdRankPct}>{`${r.persentase}%`}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <PageFooter pageNum={1} />
      </Page>

      {/* ==================== LEMBAR 2 ==================== */}
      <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
        <PageHeader
          periodeLabel={periodeLabel}
          kategoriLabel={kategoriLabel}
          tanggalCetak={tanggalCetak}
          pageNum={2}
        />

        {/* Full-Page Card: Peta Kehadiran OPD x Bulan */}
        <View style={[styles.card, { flex: 1, justifyContent: "space-between" }]}>
          <View>
            <View style={styles.hmHeaderTop}>
              <View>
                <Text style={styles.cardTitle}>Peta Kehadiran OPD × Bulan</Text>
                <Text style={styles.cardSub}>
                  {heatmap.isTruncated
                    ? `Persentase kehadiran per bulan (menampilkan ${hmRows.length} OPD teratas dari total ${heatmap.totalOpdCount || hmRows.length} OPD)`
                    : `Persentase kehadiran per bulan seluruh ${hmRows.length} OPD (diurutkan dari kehadiran tertinggi)`}
                </Text>
              </View>
            </View>

            {hmMonths.length === 0 || hmRows.length === 0 ? (
              <View style={[styles.emptyCenter, { height: 360 }]}>
                <Text style={styles.emptyText}>Belum ada data bulanan pada periode ini</Text>
              </View>
            ) : (
              <View style={styles.hmTable}>
                {/* Header Bulan */}
                <View style={styles.hmTableHeader}>
                  <Text style={styles.hmColNoHeader}>#</Text>
                  <Text style={styles.hmColOpdHeader}>Perangkat Daerah (OPD)</Text>
                  <View style={styles.hmCellsWrap}>
                    {hmMonths.map((b) => (
                      <View key={b} style={styles.hmMonthHeaderCell}>
                        <Text style={styles.hmMonthHeaderText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Baris OPD */}
                {hmRows.map((row, ri) => (
                  <View
                    key={`${row.instansi}-${ri}`}
                    style={[
                      styles.hmRow,
                      ri % 2 === 1 ? { backgroundColor: "#f8fafc" } : {},
                    ]}
                  >
                    <Text style={styles.hmColNo}>{`${ri + 1}.`}</Text>
                    <Text style={styles.hmColOpd}>{trunc(row.instansi, 46)}</Text>
                    <View style={styles.hmCellsWrap}>
                      {row.cells.map((cell, ci) => {
                        const h = heat(cell);
                        return (
                          <View
                            key={ci}
                            style={[styles.hmCell, { backgroundColor: h.fill }]}
                          >
                            <Text style={[styles.hmCellText, { color: h.text }]}>
                              {cell === null ? "–" : `${cell}%`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Legenda Warna Inline di Bawah */}
          <View style={styles.hmLegendRow}>
            {[
              { l: "≥90%", p: 95 },
              { l: "80–89%", p: 85 },
              { l: "60–79%", p: 70 },
              { l: "40–59%", p: 50 },
              { l: "20–39%", p: 30 },
              { l: "<20%", p: 10 },
              { l: "Tanpa agenda", p: null as number | null },
            ].map((it) => (
              <View key={it.l} style={styles.hmLegendItem}>
                <View style={[styles.hmLegendBox, { backgroundColor: heat(it.p).fill }]} />
                <Text style={styles.hmLegendLabel}>{it.l}</Text>
              </View>
            ))}
          </View>
        </View>

        <PageFooter pageNum={2} />
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 22,
    fontFamily: "Helvetica",
    backgroundColor: C.bg,
    color: C.ink,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 6,
    borderBottomWidth: 0.8,
    borderBottomColor: C.line,
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerAccent: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    backgroundColor: "#3b82f6",
  },
  headerTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: C.ink,
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 6.8,
    color: C.muted,
    marginTop: 1.5,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerBrand: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: C.brandText,
  },
  headerMeta: {
    fontSize: 6.5,
    color: C.muted,
    marginTop: 1.5,
  },

  // Row 1: KPI
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 7,
    borderRadius: 4,
    borderWidth: 0.6,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  kpiLabel: {
    fontSize: 5.8,
    fontWeight: "bold",
    color: C.muted,
  },
  kpiValue: {
    fontSize: 12.5,
    fontWeight: "bold",
    marginTop: 1.5,
  },

  // Generic Card
  card: {
    borderRadius: 5,
    borderWidth: 0.6,
    borderColor: C.line,
    backgroundColor: C.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: C.ink,
  },
  cardSub: {
    fontSize: 6.2,
    color: C.muted,
    marginTop: 1,
    marginBottom: 4,
  },
  emptyCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 7,
    color: C.muted,
  },

  // Row 2: Tri-Card
  triRow: {
    flexDirection: "row",
    gap: 6,
    height: 168,
    marginBottom: 6,
  },

  // Donut
  donutContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  donutChartWrap: {
    width: 84,
    height: 84,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenterLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  donutTotalNum: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.ink,
  },
  donutTotalSub: {
    fontSize: 5.5,
    color: C.muted,
  },
  donutLegend: {
    flex: 1,
    paddingLeft: 8,
    gap: 7,
  },
  donutLegendItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    marginTop: 1,
  },
  legendLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: C.ink,
  },
  legendSub: {
    fontSize: 6,
    color: C.muted,
    marginTop: 0.5,
  },

  // Eselon
  listBody: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 6,
    marginTop: 2,
  },
  eselonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eselonLabel: {
    width: 48,
    fontSize: 6.8,
    fontWeight: "bold",
    color: C.ink,
  },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 2,
    backgroundColor: C.line,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
  },
  eselonPct: {
    width: 22,
    fontSize: 6.8,
    fontWeight: "bold",
    color: C.ink,
    textAlign: "right",
  },
  eselonMeta: {
    width: 68,
    fontSize: 5.8,
    color: C.muted,
    textAlign: "right",
  },

  // Top Pegawai
  listBodyCompact: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 3,
    marginTop: 1,
  },
  pegawaiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rankBadge: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 5.8,
    fontWeight: "bold",
    color: "#ffffff",
  },
  pegawaiInfo: {
    flex: 1,
  },
  pegawaiName: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: C.ink,
  },
  pegawaiInstansi: {
    fontSize: 5.5,
    color: C.muted,
  },
  pegawaiBarTrack: {
    width: 52,
    height: 5.5,
    borderRadius: 1.5,
    backgroundColor: C.line,
    overflow: "hidden",
  },
  pegawaiPct: {
    width: 22,
    fontSize: 6.5,
    fontWeight: "bold",
    color: C.ink,
    textAlign: "right",
  },
  pegawaiRatio: {
    width: 26,
    fontSize: 5.8,
    color: C.muted,
    textAlign: "right",
  },

  // Row 3: Peringkat OPD
  opdRankRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  opdListBody: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 2.8,
    marginTop: 1,
  },
  opdRankItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  opdRankNum: {
    width: 14,
    fontSize: 6.3,
    fontWeight: "bold",
    color: C.subtle,
  },
  opdRankName: {
    flex: 1,
    fontSize: 6.6,
    color: C.ink,
  },
  opdBarTrack: {
    width: 95,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: C.line,
    overflow: "hidden",
  },
  opdRankPct: {
    width: 24,
    fontSize: 6.6,
    fontWeight: "bold",
    color: C.ink,
    textAlign: "right",
  },

  // Page 2: Heatmap
  hmHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hmTable: {
    marginTop: 2,
  },
  hmTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 3,
    borderBottomWidth: 0.6,
    borderBottomColor: C.line,
    marginBottom: 2,
  },
  hmColNoHeader: {
    width: 16,
    fontSize: 6.2,
    fontWeight: "bold",
    color: C.muted,
  },
  hmColOpdHeader: {
    width: 185,
    fontSize: 6.5,
    fontWeight: "bold",
    color: C.muted,
  },
  hmCellsWrap: {
    flex: 1,
    flexDirection: "row",
    gap: 2,
  },
  hmMonthHeaderCell: {
    flex: 1,
    alignItems: "center",
  },
  hmMonthHeaderText: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: C.muted,
  },
  hmRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 1.2,
    borderRadius: 2,
  },
  hmColNo: {
    width: 16,
    fontSize: 6,
    color: C.subtle,
  },
  hmColOpd: {
    width: 185,
    fontSize: 6.4,
    color: C.ink,
    paddingRight: 4,
  },
  hmCell: {
    flex: 1,
    height: 10.5,
    borderRadius: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  hmCellText: {
    fontSize: 5.8,
    fontWeight: "bold",
  },
  hmLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: C.lineSoft,
  },
  hmLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
  },
  hmLegendBox: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
    borderWidth: 0.3,
    borderColor: C.line,
  },
  hmLegendLabel: {
    fontSize: 6.2,
    color: C.muted,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 5,
    marginTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: C.line,
  },
  footerText: {
    fontSize: 6.2,
    color: C.muted,
  },
  footerPage: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: C.brandText,
  },
});
