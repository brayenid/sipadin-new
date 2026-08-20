import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";

export type RekapPegawaiPdfData = {
  tahun: string;
  periodeLabel?: string;
  totalAgenda: number;
  dataPegawai: {
    nama: string;
    nip?: string | null;
    jabatan: string;
    instansi: string;
    totalDiundang: number;
    hadir: number;
    hadirValid?: number;
    hadirLuarRadius?: number;
    mewakili: number;
    tidakHadir: number;
    izin: number;
    persentaseKehadiran: number;
    persentaseValidLokasi?: number;
    predikatKepatuhan?: string;
    evaluasiSingkat?: string;
  }[];
};

export default function LaporanRekapPegawaiPdf({
  data,
}: {
  data: RekapPegawaiPdfData;
}) {
  // Hitung Agregat Makro
  const totalPegawai = data.dataPegawai.length;
  const totalUndangan = data.dataPegawai.reduce((acc, c) => acc + c.totalDiundang, 0);
  const totalHadirAll = data.dataPegawai.reduce((acc, c) => acc + c.hadir, 0);
  const totalHadirValid = data.dataPegawai.reduce((acc, c) => acc + (c.hadirValid ?? c.hadir), 0);
  const totalHadirLuar = data.dataPegawai.reduce((acc, c) => acc + (c.hadirLuarRadius ?? 0), 0);
  const totalMewakili = data.dataPegawai.reduce((acc, c) => acc + c.mewakili, 0);

  const avgKehadiran = totalUndangan > 0 ? Math.round(((totalHadirAll + totalMewakili) / totalUndangan) * 100) : 0;
  const avgKepatuhanLokasi = totalHadirAll > 0 ? Math.round((totalHadirValid / totalHadirAll) * 100) : 100;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Judul Laporan */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>LAPORAN REKAPITULASI & EVALUASI KEHADIRAN PEGAWAI</Text>
          <Text style={styles.regionText}>PEMERINTAH KABUPATEN KUTAI BARAT</Text>
          <Text style={styles.subtitleText}>
            {data.periodeLabel ? `PERIODE: ${data.periodeLabel.toUpperCase()}` : `TAHUN ANGGARAN: ${data.tahun}`}
          </Text>
          <Text style={styles.descText}>
            Laporan tingkat kehadiran dan validitas lokasi kehadiran pegawai pada seluruh agenda kedinasan (Total: {data.totalAgenda} Agenda)
          </Text>
        </View>

        {/* Ringkasan Eksekutif & Raport Makro */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL PEGAWAI</Text>
            <Text style={styles.summaryValue}>{totalPegawai} Pegawai</Text>
            <Text style={styles.summarySub}>{totalUndangan} Total Penugasan</Text>
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

        {/* Tabel Data Rekap & Raport */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <View style={[styles.th, styles.colNo, styles.borderRight]}><Text style={styles.thText}>No</Text></View>
            <View style={[styles.th, styles.colNama, styles.borderRight]}><Text style={styles.thText}>Nama & Jabatan</Text></View>
            <View style={[styles.th, styles.colOpd, styles.borderRight]}><Text style={styles.thText}>Perangkat Daerah</Text></View>
            <View style={[styles.th, styles.colUndang, styles.borderRight]}><Text style={styles.thText}>Undang</Text></View>
            <View style={[styles.th, styles.colHadirValid, styles.borderRight]}><Text style={styles.thText}>Hadir (Lokasi)</Text></View>
            <View style={[styles.th, styles.colHadirLuar, styles.borderRight]}><Text style={styles.thText}>Luar Rad.</Text></View>
            <View style={[styles.th, styles.colWakili, styles.borderRight]}><Text style={styles.thText}>Wakili</Text></View>
            <View style={[styles.th, styles.colIzin, styles.borderRight]}><Text style={styles.thText}>Izin</Text></View>
            <View style={[styles.th, styles.colAlpa, styles.borderRight]}><Text style={styles.thText}>Alpa</Text></View>
            <View style={[styles.th, styles.colPercent, styles.borderRight]}><Text style={styles.thText}>% Hadir</Text></View>
            <View style={[styles.th, styles.colChart, styles.borderRight]}><Text style={styles.thText}>Komposisi Kehadiran</Text></View>
            <View style={[styles.th, styles.colEvaluasi]}><Text style={styles.thText}>Raport & Catatan Evaluasi</Text></View>
          </View>

          {data.dataPegawai.map((peg, idx) => {
            const rowStyle = [
              styles.tableRow,
              idx % 2 === 1 ? styles.rowAlternate : {},
            ];

            const total = Math.max(1, peg.totalDiundang);
            const validCount = peg.hadirValid ?? peg.hadir;
            const luarCount = peg.hadirLuarRadius ?? 0;
            const wakiliCount = peg.mewakili;
            const izinCount = peg.izin;
            const alpaCount = peg.tidakHadir;

            const pctValid = Math.round((validCount / total) * 100);
            const pctLuar = Math.round((luarCount / total) * 100);
            const pctWakili = Math.round((wakiliCount / total) * 100);
            const pctIzin = Math.round((izinCount / total) * 100);
            const pctAlpa = Math.max(0, 100 - pctValid - pctLuar - pctWakili - pctIzin);

            return (
              <View key={idx} style={rowStyle} wrap={false}>
                <View style={[styles.td, styles.colNo, styles.borderRight]}><Text style={styles.tdText}>{idx + 1}</Text></View>
                <View style={[styles.td, styles.colNama, styles.alignLeft, styles.borderRight]}>
                  <Text style={[styles.tdText, styles.fontBold]}>{peg.nama}</Text>
                  <Text style={styles.subText}>{peg.nip ? `NIP. ${peg.nip}` : peg.jabatan}</Text>
                </View>
                <View style={[styles.td, styles.colOpd, styles.alignLeft, styles.borderRight]}>
                  <Text style={styles.tdText}>{peg.instansi}</Text>
                </View>
                <View style={[styles.td, styles.colUndang, styles.borderRight]}><Text style={styles.tdText}>{peg.totalDiundang}</Text></View>
                <View style={[styles.td, styles.colHadirValid, styles.borderRight]}><Text style={[styles.tdText, styles.fontBold]}>{validCount}</Text></View>
                <View style={[styles.td, styles.colHadirLuar, styles.borderRight]}>
                  <Text style={[styles.tdText, luarCount > 0 ? styles.textAmberBold : {}]}>{luarCount}</Text>
                </View>
                <View style={[styles.td, styles.colWakili, styles.borderRight]}><Text style={styles.tdText}>{wakiliCount}</Text></View>
                <View style={[styles.td, styles.colIzin, styles.borderRight]}><Text style={styles.tdText}>{izinCount}</Text></View>
                <View style={[styles.td, styles.colAlpa, styles.borderRight]}>
                  <Text style={[styles.tdText, alpaCount > 0 ? styles.textRedBold : {}]}>{alpaCount}</Text>
                </View>
                <View style={[styles.td, styles.colPercent, styles.borderRight]}>
                  <Text style={[styles.tdText, styles.fontBold]}>{peg.persentaseKehadiran}%</Text>
                </View>

                {/* Black Monochrome Segmented Bar Chart */}
                <View style={[styles.td, styles.colChart, styles.borderRight]}>
                  <View style={styles.barChartContainer}>
                    {pctValid > 0 && <View style={[styles.barSegment, { width: `${pctValid}%`, backgroundColor: "#0f172a" }]} />}
                    {pctLuar > 0 && <View style={[styles.barSegment, { width: `${pctLuar}%`, backgroundColor: "#d97706" }]} />}
                    {pctWakili > 0 && <View style={[styles.barSegment, { width: `${pctWakili}%`, backgroundColor: "#94a3b8" }]} />}
                    {pctIzin > 0 && <View style={[styles.barSegment, { width: `${pctIzin}%`, backgroundColor: "#cbd5e1" }]} />}
                    {pctAlpa > 0 && <View style={[styles.barSegment, { width: `${pctAlpa}%`, backgroundColor: "#fecdd3" }]} />}
                  </View>
                </View>

                {/* Raport & Evaluasi Singkat */}
                <View style={[styles.td, styles.colEvaluasi, styles.alignLeft]}>
                  <Text style={styles.evalPredikat}>
                    {peg.predikatKepatuhan || (peg.persentaseKehadiran >= 80 ? "Sangat Tertib" : "Cukup Tertib")}
                  </Text>
                  <Text style={styles.evalText}>
                    {peg.evaluasiSingkat || "Kehadiran tertib di lokasi."}
                  </Text>
                </View>
              </View>
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
  subText: {
    fontSize: 6,
    color: "#64748b",
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
  colNo: { width: "3.5%" },
  colNama: { width: "19%" },
  colOpd: { width: "15%" },
  colUndang: { width: "4.5%" },
  colHadirValid: { width: "6%" },
  colHadirLuar: { width: "5.5%" },
  colWakili: { width: "4.5%" },
  colIzin: { width: "4%" },
  colAlpa: { width: "4%" },
  colPercent: { width: "5%" },
  colChart: { width: "13%" },
  colEvaluasi: { width: "16%" },

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
