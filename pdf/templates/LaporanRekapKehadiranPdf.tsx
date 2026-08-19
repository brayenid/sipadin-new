import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";

export type RekapKehadiranPdfData = {
  tahun: string;
  periodeLabel?: string;
  totalAgenda: number;
  dataOpd: {
    instansi: string;
    totalDiundang: number;
    hadir: number;
    mewakili: number;
    tidakHadir: number;
    izin: number;
    persentaseKehadiran: number;
  }[];
};

export default function LaporanRekapKehadiranPdf({
  data,
}: {
  data: RekapKehadiranPdfData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Judul Laporan */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>LAPORAN REKAPITULASI KEHADIRAN PERANGKAT DAERAH</Text>
          <Text style={styles.subtitleText}>{data.periodeLabel ? `PERIODE: ${data.periodeLabel.toUpperCase()}` : `TAHUN ANGGARAN: ${data.tahun}`}</Text>
          <Text style={styles.descText}>
            Akumulasi tingkat kehadiran pegawai pada seluruh agenda kegiatan resmi daerah (Total Evaluasi: {data.totalAgenda} Agenda)
          </Text>
        </View>

        {/* Tabel Data Rekap */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.th, styles.colNo, styles.borderRight]}><Text style={styles.thText}>No</Text></View>
            <View style={[styles.th, styles.colOpd, styles.borderRight]}><Text style={styles.thText}>Perangkat Daerah</Text></View>
            <View style={[styles.th, styles.colUndang, styles.borderRight]}><Text style={styles.thText}>Undang</Text></View>
            <View style={[styles.th, styles.colHadir, styles.borderRight]}><Text style={styles.thText}>Hadir</Text></View>
            <View style={[styles.th, styles.colWakili, styles.borderRight]}><Text style={styles.thText}>Wakili</Text></View>
            <View style={[styles.th, styles.colAbsen, styles.borderRight]}><Text style={styles.thText}>Absen/Izin</Text></View>
            <View style={[styles.th, styles.colPercent]}><Text style={styles.thText}>% Hadir</Text></View>
          </View>

          {data.dataOpd.map((opd, idx) => {
            const isLastRow = idx === data.dataOpd.length - 1;
            const rowStyle = [
              styles.tableRow,
              idx % 2 === 1 ? styles.rowAlternate : {},
            ];

            return (
              <View key={idx} style={rowStyle} wrap={false}>
                <View style={[styles.td, styles.colNo, styles.borderRight]}><Text style={styles.tdText}>{idx + 1}</Text></View>
                <View style={[styles.td, styles.colOpd, styles.alignLeft, styles.borderRight]}><Text style={[styles.tdText, styles.fontBold]}>{opd.instansi}</Text></View>
                <View style={[styles.td, styles.colUndang, styles.borderRight]}><Text style={styles.tdText}>{opd.totalDiundang}</Text></View>
                <View style={[styles.td, styles.colHadir, styles.textGreen, styles.borderRight]}><Text style={[styles.tdText, styles.fontBold]}>{opd.hadir}</Text></View>
                <View style={[styles.td, styles.colWakili, styles.textOrange, styles.borderRight]}><Text style={styles.tdText}>{opd.mewakili}</Text></View>
                <View style={[styles.td, styles.colAbsen, styles.textRed, styles.borderRight]}><Text style={styles.tdText}>{opd.tidakHadir + opd.izin}</Text></View>
                <View style={[styles.td, styles.colPercent]}><Text style={[styles.tdText, styles.fontBold]}>{opd.persentaseKehadiran}%</Text></View>
              </View>
            );
          })}
        </View>

      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingHorizontal: 40,
    paddingBottom: 50,
    fontSize: 9,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
    color: "#1e293b",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  titleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 3,
  },
  descText: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 5,
    textAlign: "center",
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderBottomWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    height: 25,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    minHeight: 24,
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
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
  },
  td: {
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  tdText: {
    fontSize: 8,
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
    paddingLeft: 8,
  },
  colNo: {
    width: "5%",
  },
  colOpd: {
    width: "43%",
  },
  colUndang: {
    width: "10%",
  },
  colHadir: {
    width: "10%",
  },
  colWakili: {
    width: "10%",
  },
  colAbsen: {
    width: "11%",
  },
  colPercent: {
    width: "11%",
  },
  fontBold: {
    fontWeight: "bold",
  },
  textGreen: {
    color: "#16a34a",
  },
  textOrange: {
    color: "#ea580c",
  },
  textRed: {
    color: "#dc2626",
  },
  signatureContainer: {
    marginTop: 30,
    alignItems: "flex-end",
    paddingRight: 10,
  },
  sigDate: {
    fontSize: 8.5,
    marginBottom: 4,
  },
  sigJob: {
    fontSize: 8.5,
    fontWeight: "medium",
  },
  sigSpacer: {
    height: 45,
  },
  sigName: {
    fontSize: 9,
    fontWeight: "bold",
    textDecoration: "underline",
  },
  sigNip: {
    fontSize: 8,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 5,
    fontSize: 7.5,
    color: "#94a3b8",
    textAlign: "center",
  },
});
