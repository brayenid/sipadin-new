import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";

export type RekapPegawaiPdfData = {
  tahun: string;
  periodeLabel?: string;
  totalAgenda: number;
  dataPegawai: {
    nama: string;
    jabatan: string;
    instansi: string;
    totalDiundang: number;
    hadir: number;
    mewakili: number;
    tidakHadir: number;
    izin: number;
    persentaseKehadiran: number;
  }[];
};

export default function LaporanRekapPegawaiPdf({
  data,
}: {
  data: RekapPegawaiPdfData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Judul Laporan */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>LAPORAN REKAPITULASI KEHADIRAN PEGAWAI</Text>
          <Text style={styles.subtitleText}>{data.periodeLabel ? `PERIODE: ${data.periodeLabel.toUpperCase()}` : `TAHUN ANGGARAN: ${data.tahun}`}</Text>
          <Text style={styles.descText}>
            Akumulasi tingkat kehadiran pegawai pada seluruh agenda kegiatan resmi daerah
          </Text>
        </View>

        {/* Tabel Data Rekap */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.th, styles.colNo, styles.borderRight]}><Text style={styles.thText}>No</Text></View>
            <View style={[styles.th, styles.colNama, styles.borderRight]}><Text style={styles.thText}>Nama & Jabatan</Text></View>
            <View style={[styles.th, styles.colOpd, styles.borderRight]}><Text style={styles.thText}>Perangkat Daerah</Text></View>
            <View style={[styles.th, styles.colUndang, styles.borderRight]}><Text style={styles.thText}>Undang</Text></View>
            <View style={[styles.th, styles.colHadir, styles.borderRight]}><Text style={styles.thText}>Hadir</Text></View>
            <View style={[styles.th, styles.colWakili, styles.borderRight]}><Text style={styles.thText}>Wakili</Text></View>
            <View style={[styles.th, styles.colAbsen, styles.borderRight]}><Text style={styles.thText}>Absen/Izin</Text></View>
            <View style={[styles.th, styles.colPercent]}><Text style={styles.thText}>% Hadir</Text></View>
          </View>

          {data.dataPegawai.map((peg, idx) => {
            const isLastRow = idx === data.dataPegawai.length - 1;
            const rowStyle = [
              styles.tableRow,
              idx % 2 === 1 ? styles.rowAlternate : {},
            ];

            return (
              <View key={idx} style={rowStyle} wrap={false}>
                <View style={[styles.td, styles.colNo, styles.borderRight]}><Text style={styles.tdText}>{idx + 1}</Text></View>
                <View style={[styles.td, styles.colNama, styles.alignLeft, styles.borderRight]}>
                  <Text style={[styles.tdText, styles.fontBold]}>{peg.nama}</Text>
                  <Text style={styles.subText}>{peg.jabatan}</Text>
                </View>
                <View style={[styles.td, styles.colOpd, styles.alignLeft, styles.borderRight]}><Text style={styles.tdText}>{peg.instansi}</Text></View>
                <View style={[styles.td, styles.colUndang, styles.borderRight]}><Text style={styles.tdText}>{peg.totalDiundang}</Text></View>
                <View style={[styles.td, styles.colHadir, styles.textGreen, styles.borderRight]}><Text style={[styles.tdText, styles.fontBold]}>{peg.hadir}</Text></View>
                <View style={[styles.td, styles.colWakili, styles.textOrange, styles.borderRight]}><Text style={styles.tdText}>{peg.mewakili}</Text></View>
                <View style={[styles.td, styles.colAbsen, styles.textRed, styles.borderRight]}><Text style={styles.tdText}>{peg.tidakHadir + peg.izin}</Text></View>
                <View style={[styles.td, styles.colPercent]}><Text style={[styles.tdText, styles.fontBold]}>{peg.persentaseKehadiran}%</Text></View>
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
    marginBottom: 22,
  },
  titleText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitleText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 4,
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
    minHeight: 28,
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
    fontSize: 7.2,
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
    fontSize: 7.5,
    color: "#334155",
    textAlign: "center",
  },
  subText: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 1,
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
  colNo: {
    width: "4.5%",
  },
  colNama: {
    width: "27.5%",
  },
  colOpd: {
    width: "26%",
  },
  colUndang: {
    width: "8%",
  },
  colHadir: {
    width: "8%",
  },
  colWakili: {
    width: "8%",
  },
  colAbsen: {
    width: "10%",
  },
  colPercent: {
    width: "8%",
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
});
