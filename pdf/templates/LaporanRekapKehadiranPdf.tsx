import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";
import { formatWita } from "@/lib/date-utils";

export type RekapKehadiranPdfData = {
  tahun: string;
  periodeLabel?: string;
  judulLaporan?: string;
  totalAgenda: number;
  dataOpd: {
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
    persentaseValidLokasi?: number;
    predikatKepatuhan?: string;
    evaluasiSingkat?: string;
    history?: {
      agendaId?: string;
      namaKegiatan: string;
      tanggal: Date | string;
      totalDiundang: number;
      hadir: number;
      hadirValid?: number;
      hadirLuarRadius?: number;
      hadirTanpaLokasi?: number;
      hadirNonUndangan?: number;
      mewakili: number;
      izin: number;
      tidakHadir: number;
      persentaseKehadiran: number;
      isCancelledSession?: boolean;
      cancelReason?: string | null;
    }[];
  }[];
};

export default function LaporanRekapKehadiranPdf({
  data,
}: {
  data: RekapKehadiranPdfData;
}) {
  // Hitung Agregat Makro
  const totalOpd = data.dataOpd.length;
  const totalPegawaiDiundang = data.dataOpd.reduce(
    (acc, c) => acc + (c.history && c.history.length > 0 ? c.history.reduce((hAcc, h) => hAcc + h.totalDiundang, 0) : c.totalDiundang),
    0
  );
  const totalHadirAll = data.dataOpd.reduce(
    (acc, c) => acc + (c.history && c.history.length > 0 ? c.history.reduce((hAcc, h) => hAcc + h.hadir, 0) : c.hadir),
    0
  );
  const totalHadirValid = data.dataOpd.reduce(
    (acc, c) => acc + (c.history && c.history.length > 0 ? c.history.reduce((hAcc, h) => hAcc + (h.hadirValid ?? h.hadir), 0) : (c.hadirValid ?? c.hadir)),
    0
  );
  const totalHadirLuar = data.dataOpd.reduce(
    (acc, c) => acc + (c.history && c.history.length > 0 ? c.history.reduce((hAcc, h) => hAcc + (h.hadirLuarRadius ?? 0), 0) : (c.hadirLuarRadius ?? 0)),
    0
  );
  const totalMewakili = data.dataOpd.reduce(
    (acc, c) => acc + (c.history && c.history.length > 0 ? c.history.reduce((hAcc, h) => hAcc + h.mewakili, 0) : c.mewakili),
    0
  );

  const avgKehadiran = totalPegawaiDiundang > 0 
    ? Math.round(((totalHadirAll + totalMewakili) / totalPegawaiDiundang) * 100)
    : (data.dataOpd.length > 0 ? Math.round(data.dataOpd.reduce((acc, c) => acc + c.persentaseKehadiran, 0) / data.dataOpd.length) : 0);

  const avgKepatuhanLokasi = totalHadirAll > 0 ? Math.round((totalHadirValid / totalHadirAll) * 100) : 100;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Judul Laporan */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>{data.judulLaporan || "LAPORAN REKAPITULASI & EVALUASI KEHADIRAN PERANGKAT DAERAH"}</Text>
          <Text style={styles.regionText}>PEMERINTAH KABUPATEN KUTAI BARAT</Text>
          <Text style={styles.subtitleText}>
            {data.periodeLabel ? `PERIODE: ${data.periodeLabel.toUpperCase()}` : `TAHUN ANGGARAN: ${data.tahun}`}
          </Text>
          <Text style={styles.descText}>
            Laporan kepatuhan kehadiran aparatur berbasis validasi geospasial & kluster lokasi kegiatan (Total Evaluasi: {data.totalAgenda} Agenda)
          </Text>
        </View>

        {/* Ringkasan Eksekutif & Raport Makro */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL DIEVALUASI</Text>
            <Text style={styles.summaryValue}>{totalOpd} OPD</Text>
            <Text style={styles.summarySub}>{data.totalAgenda} Agenda ({totalPegawaiDiundang} Penugasan)</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>RATA-RATA KEHADIRAN</Text>
            <Text style={styles.summaryValue}>{avgKehadiran}%</Text>
            <Text style={styles.summarySub}>{totalHadirAll} Hadir + {totalMewakili} Wakili</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>VALIDITAS LOKASI (GEOFENCE)</Text>
            <Text style={[styles.summaryValue, { color: avgKepatuhanLokasi >= 85 ? "#0f172a" : "#b45309" }]}>
              {avgKepatuhanLokasi}%
            </Text>
            <Text style={styles.summarySub}>{totalHadirValid} Tertib di Lokasi</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ANOMALI JARAK (LUAR RADIUS)</Text>
            <Text style={[styles.summaryValue, { color: totalHadirLuar > 0 ? "#b45309" : "#0f172a" }]}>
              {totalHadirLuar} Presensi
            </Text>
            <Text style={styles.summarySub}>Absen Di Luar Jangkauan</Text>
          </View>
        </View>

        {/* Legenda Bar Chart Hitam Monokromatik */}
        <View style={styles.legendContainer}>
          <Text style={styles.legendTitle}>Legenda Komposisi:</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#0f172a" }]} />
            <Text style={styles.legendText}>Hadir (Di Lokasi)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#d97706" }]} />
            <Text style={styles.legendText}>Luar Radius</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#94a3b8" }]} />
            <Text style={styles.legendText}>Mewakili</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#cbd5e1" }]} />
            <Text style={styles.legendText}>Izin</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: "#fecdd3" }]} />
            <Text style={styles.legendText}>Alpa</Text>
          </View>
        </View>

        {/* Tabel Data Rekap Kehadiran OPD */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <View style={[styles.th, styles.colNo, styles.borderRight]}><Text style={styles.thText}>No</Text></View>
            <View style={[styles.th, styles.colOpd, styles.borderRight]}><Text style={styles.thText}>Perangkat Daerah & Rincian Agenda</Text></View>
            <View style={[styles.th, styles.colUndang, styles.borderRight]}><Text style={styles.thText}>Undang</Text></View>
            <View style={[styles.th, styles.colHadirValid, styles.borderRight]}><Text style={styles.thText}>Hadir (Lokasi)</Text></View>
            <View style={[styles.th, styles.colHadirLuar, styles.borderRight]}><Text style={styles.thText}>Luar Rad.</Text></View>
            <View style={[styles.th, styles.colWakili, styles.borderRight]}><Text style={styles.thText}>Wakili</Text></View>
            <View style={[styles.th, styles.colIzin, styles.borderRight]}><Text style={styles.thText}>Izin</Text></View>
            <View style={[styles.th, styles.colAlpa, styles.borderRight]}><Text style={styles.thText}>Alpa</Text></View>
            <View style={[styles.th, styles.colPercent, styles.borderRight]}><Text style={styles.thText}>% Hadir</Text></View>
            <View style={[styles.th, styles.colChart]}><Text style={styles.thText}>Komposisi Kehadiran</Text></View>
          </View>

          {data.dataOpd.map((opd, idx) => {
            const rowStyle = [
              styles.tableRow,
              idx % 2 === 1 ? styles.rowAlternate : {},
            ];

            const validCount = opd.hadirValid ?? opd.hadir;
            const luarCount = opd.hadirLuarRadius ?? 0;
            const wakiliCount = opd.mewakili;
            const izinCount = opd.izin;
            const alpaCount = opd.tidakHadir;

            let pctValid = 0;
            let pctLuar = 0;
            let pctWakili = 0;
            let pctIzin = 0;
            let pctAlpa = 0;

            if (opd.history && opd.history.length > 0) {
              const totalSubPeg = opd.history.reduce((acc, h) => acc + Math.max(1, h.totalDiundang), 0);
              const totalValidSub = opd.history.reduce((acc, h) => acc + (h.hadirValid ?? h.hadir), 0);
              const totalLuarSub = opd.history.reduce((acc, h) => acc + (h.hadirLuarRadius ?? 0), 0);
              const totalWakiliSub = opd.history.reduce((acc, h) => acc + h.mewakili, 0);
              const totalIzinSub = opd.history.reduce((acc, h) => acc + h.izin, 0);

              pctValid = Math.round((totalValidSub / totalSubPeg) * 100);
              pctLuar = Math.round((totalLuarSub / totalSubPeg) * 100);
              pctWakili = Math.round((totalWakiliSub / totalSubPeg) * 100);
              pctIzin = Math.round((totalIzinSub / totalSubPeg) * 100);
              pctAlpa = Math.max(0, 100 - pctValid - pctLuar - pctWakili - pctIzin);
            } else {
              const totalPegawaiMaster = Math.max(1, validCount + luarCount + wakiliCount + izinCount + alpaCount);
              pctValid = Math.round((validCount / totalPegawaiMaster) * 100);
              pctLuar = Math.round((luarCount / totalPegawaiMaster) * 100);
              pctWakili = Math.round((wakiliCount / totalPegawaiMaster) * 100);
              pctIzin = Math.round((izinCount / totalPegawaiMaster) * 100);
              pctAlpa = Math.max(0, 100 - pctValid - pctLuar - pctWakili - pctIzin);
            }

            return (
              <React.Fragment key={idx}>
                {/* Baris Utama OPD */}
                <View style={rowStyle} wrap={false}>
                  <View style={[styles.td, styles.colNo, styles.borderRight]}><Text style={styles.tdText}>{idx + 1}</Text></View>
                  <View style={[styles.td, styles.colOpd, styles.alignLeft, styles.borderRight]}>
                    <Text style={[styles.tdText, styles.fontBold]}>{opd.instansi}</Text>
                  </View>
                  <View style={[styles.td, styles.colUndang, styles.borderRight]}><Text style={styles.tdText}>{opd.totalDiundang}</Text></View>
                  <View style={[styles.td, styles.colHadirValid, styles.borderRight]}><Text style={[styles.tdText, styles.fontBold]}>{validCount}</Text></View>
                  <View style={[styles.td, styles.colHadirLuar, styles.borderRight]}>
                    <Text style={[styles.tdText, luarCount > 0 ? styles.textAmberBold : {}]}>{luarCount}</Text>
                  </View>
                  <View style={[styles.td, styles.colWakili, styles.borderRight]}><Text style={styles.tdText}>{wakiliCount}</Text></View>
                  <View style={[styles.td, styles.colIzin, styles.borderRight]}><Text style={styles.tdText}>{izinCount}</Text></View>
                  <View style={[styles.td, styles.colAlpa, styles.borderRight]}><Text style={[styles.tdText, alpaCount > 0 ? styles.textRedBold : {}]}>{alpaCount}</Text></View>
                  <View style={[styles.td, styles.colPercent, styles.borderRight]}>
                    <Text style={[styles.tdText, styles.fontBold]}>{opd.persentaseKehadiran}%</Text>
                  </View>

                  {/* Black Monochrome Segmented Bar Chart */}
                  <View style={[styles.td, styles.colChart]}>
                    <View style={styles.barChartContainer}>
                      {pctValid > 0 && <View style={[styles.barSegment, { width: `${pctValid}%`, backgroundColor: "#0f172a" }]} />}
                      {pctLuar > 0 && <View style={[styles.barSegment, { width: `${pctLuar}%`, backgroundColor: "#d97706" }]} />}
                      {pctWakili > 0 && <View style={[styles.barSegment, { width: `${pctWakili}%`, backgroundColor: "#94a3b8" }]} />}
                      {pctIzin > 0 && <View style={[styles.barSegment, { width: `${pctIzin}%`, backgroundColor: "#cbd5e1" }]} />}
                      {pctAlpa > 0 && <View style={[styles.barSegment, { width: `${pctAlpa}%`, backgroundColor: "#fecdd3" }]} />}
                    </View>
                  </View>
                </View>

                {/* Sub-Baris Kegiatan Terkait OPD */}
                {opd.history && opd.history.length > 0 && opd.history.map((h, hIdx) => {
                  const hTotal = Math.max(1, h.totalDiundang);
                  const hValid = h.hadirValid ?? h.hadir;
                  const hLuar = h.hadirLuarRadius ?? 0;
                  const hWakili = h.mewakili;
                  const hIzin = h.izin;
                  const hAlpa = h.tidakHadir;

                  const hPctValid = Math.round((hValid / hTotal) * 100);
                  const hPctLuar = Math.round((hLuar / hTotal) * 100);
                  const hPctWakili = Math.round((hWakili / hTotal) * 100);
                  const hPctIzin = Math.round((hIzin / hTotal) * 100);
                  const hPctAlpa = Math.max(0, 100 - hPctValid - hPctLuar - hPctWakili - hPctIzin);

                  const tglStr = typeof h.tanggal === "string" ? h.tanggal : formatWita(h.tanggal, "dd/MM/yy");

                  return (
                    <View key={`sub_${idx}_${hIdx}`} style={styles.subRow} wrap={false}>
                      <View style={[styles.td, styles.colNo, styles.borderRight]}>
                        <Text style={styles.subBullet}>•</Text>
                      </View>
                      <View style={[styles.td, styles.colOpd, styles.alignLeft, styles.borderRight, { paddingLeft: 12 }]}>
                        <Text style={styles.subAgendaName}>
                          - {h.namaKegiatan} ({tglStr})
                        </Text>
                      </View>
                      <View style={[styles.td, styles.colUndang, styles.borderRight]}><Text style={styles.subText}>{h.isCancelledSession ? "-" : h.totalDiundang}</Text></View>
                      <View style={[styles.td, styles.colHadirValid, styles.borderRight]}><Text style={styles.subText}>{h.isCancelledSession ? "-" : hValid}</Text></View>
                      <View style={[styles.td, styles.colHadirLuar, styles.borderRight]}><Text style={styles.subText}>{h.isCancelledSession ? "-" : hLuar}</Text></View>
                      <View style={[styles.td, styles.colWakili, styles.borderRight]}><Text style={styles.subText}>{h.isCancelledSession ? "-" : hWakili}</Text></View>
                      <View style={[styles.td, styles.colIzin, styles.borderRight]}><Text style={styles.subText}>{h.isCancelledSession ? "-" : hIzin}</Text></View>
                      <View style={[styles.td, styles.colAlpa, styles.borderRight]}><Text style={styles.subText}>{h.isCancelledSession ? "-" : hAlpa}</Text></View>
                      <View style={[styles.td, styles.colPercent, styles.borderRight]}>
                        <Text style={[styles.subText, styles.fontBold]}>{h.isCancelledSession ? "-" : `${h.persentaseKehadiran}%`}</Text>
                      </View>
                      <View style={[styles.td, styles.colChart]}>
                        {h.isCancelledSession ? (
                          <View style={[styles.barChartContainer, { height: 5, backgroundColor: "#f1f5f9" }]} />
                        ) : (
                          <View style={[styles.barChartContainer, { height: 5 }]}>
                            {hPctValid > 0 && <View style={[styles.barSegment, { width: `${hPctValid}%`, backgroundColor: "#0f172a" }]} />}
                            {hPctLuar > 0 && <View style={[styles.barSegment, { width: `${hPctLuar}%`, backgroundColor: "#d97706" }]} />}
                            {hPctWakili > 0 && <View style={[styles.barSegment, { width: `${hPctWakili}%`, backgroundColor: "#94a3b8" }]} />}
                            {hPctIzin > 0 && <View style={[styles.barSegment, { width: `${hPctIzin}%`, backgroundColor: "#cbd5e1" }]} />}
                            {hPctAlpa > 0 && <View style={[styles.barSegment, { width: `${hPctAlpa}%`, backgroundColor: "#fecdd3" }]} />}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </React.Fragment>
            );
          })}
        </View>

        {/* Footer Catatan Audit */}
        <Text style={styles.footer} fixed>
          Dokumen ini digenerate secara otomatis oleh SIPADIN (Sistem Pengarsipan Dinas oleh Bagian Organisasi). Bukan data deterministik, membutuhkan pembuktian lebih lanjut terhadap beberapa data.
        </Text>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 35,
    paddingHorizontal: 30,
    paddingBottom: 40,
    fontSize: 8,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
    color: "#1e293b",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  titleText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
  },
  regionText: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 1.5,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 2,
  },
  descText: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 3,
    textAlign: "center",
  },
  summaryBox: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  summaryLabel: {
    fontSize: 6.5,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 1,
  },
  summarySub: {
    fontSize: 6.5,
    color: "#94a3b8",
    marginTop: 1,
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  legendTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#475569",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  legendBox: {
    width: 7,
    height: 7,
    borderRadius: 1.5,
  },
  legendText: {
    fontSize: 6.5,
    color: "#475569",
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderBottomWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    height: 22,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    minHeight: 20,
    alignItems: "center",
  },
  rowAlternate: {
    backgroundColor: "#f8fafc",
  },
  th: {
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  thText: {
    fontSize: 6.8,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
  },
  td: {
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingVertical: 3,
  },
  tdText: {
    fontSize: 7,
    color: "#334155",
    textAlign: "center",
  },
  borderRight: {
    borderRightWidth: 0.5,
    borderRightColor: "#cbd5e1",
  },
  alignLeft: {
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 6,
  },
  colNo: { width: "4%" },
  colOpd: { width: "32%" },
  colUndang: { width: "6%" },
  colHadirValid: { width: "8%" },
  colHadirLuar: { width: "7%" },
  colWakili: { width: "6%" },
  colIzin: { width: "5%" },
  colAlpa: { width: "5%" },
  colPercent: { width: "7%" },
  colChart: { width: "20%" },

  fontBold: { fontWeight: "bold" },
  textAmberBold: { fontWeight: "bold", color: "#d97706" },
  textRedBold: { fontWeight: "bold", color: "#e11d48" },

  barChartContainer: {
    width: "90%",
    height: 8,
    borderRadius: 2,
    backgroundColor: "#f1f5f9",
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 0.3,
    borderColor: "#94a3b8",
  },
  barSegment: {
    height: "100%",
  },
  evalPredikat: {
    fontSize: 6.8,
    fontWeight: "bold",
    color: "#0f172a",
  },
  evalText: {
    fontSize: 6,
    color: "#64748b",
    marginTop: 0.5,
  },
  subRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    minHeight: 16,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  subText: {
    fontSize: 6.2,
    color: "#64748b",
    textAlign: "center",
  },
  subAgendaName: {
    fontSize: 6.3,
    color: "#334155",
  },
  subBullet: {
    fontSize: 6.5,
    color: "#94a3b8",
  },
  subEvaluasiText: {
    fontSize: 5.8,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
    fontSize: 6.5,
    color: "#94a3b8",
    textAlign: "center",
  },
});
