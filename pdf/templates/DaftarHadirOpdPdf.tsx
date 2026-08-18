import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";

export type DaftarHadirOpdData = {
  namaKegiatan: string;
  hari?: string | null;
  tanggalLabel: string;
  tempat: string;
  targetPeserta?: string | null;
  peserta?: {
    nama: string;
    jabatan: string;
    instansi: string;
    eselon?: string | null;
  }[];
};

export type DaftarHadirOpdPdfProps = {
  data: DaftarHadirOpdData;
  mode?: "blanko" | "terisi";
  jumlahBarisKosong?: number;
  pageSize?: "F4" | "A4";
  tampilkanSpesifikEselon?: boolean;
  tampilkanFooterCatatan?: boolean;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 36,
    fontSize: 9,
    fontFamily: "Arial",
    color: "#000000",
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 11,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 1.3,
  },
  subTitle: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 1.3,
    marginTop: 2,
  },
  metaContainer: {
    marginBottom: 12,
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  metaLabel: {
    width: 75,
    fontFamily: "Arial",
    fontSize: 9,
    textTransform: "uppercase",
  },
  metaColon: {
    width: 12,
    fontSize: 9,
    textAlign: "center",
  },
  metaVal: {
    flex: 1,
    fontSize: 9,
  },

  // ── Tabel ──────────────────────────────────────────────
  table: {
    width: "100%",
    marginBottom: 8,
  },

  // Baris header
  headerRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    minHeight: 22,
    backgroundColor: "#ffffff",
  },

  // Baris data
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#000",
    minHeight: 26,
    backgroundColor: "#ffffff",
  },

  // Sel header
  thCell: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 8.5,
    textAlign: "center",
    textTransform: "uppercase",
    paddingVertical: 4,
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  thText: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 8.5,
    textAlign: "center",
    textTransform: "uppercase",
  },

  // Sel data
  tdCell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  tdText: {
    fontSize: 8.5,
  },

  // Divider vertikal antar kolom
  borderRight: {
    borderRightWidth: 1,
    borderColor: "#000",
  },

  // Lebar kolom
  noCol: { width: "6%" },
  namaCol: { width: "27%" },
  jabatanCol: { width: "27%" },
  opdCol: { width: "27%" },
  ttdCol: { width: "13%" },

  footerNote: {
    marginTop: 6,
    fontSize: 8,
    fontFamily: "Arial",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});

export default function DaftarHadirOpdPdf({
  data,
  mode = "blanko",
  jumlahBarisKosong = 31,
  pageSize = "F4",
  tampilkanSpesifikEselon = false,
  tampilkanFooterCatatan = false,
}: DaftarHadirOpdPdfProps) {
  const pageDimensions = pageSize === "F4" ? [595.28, 935.43] : "A4";

  const rows =
    mode === "terisi" && data.peserta && data.peserta.length > 0
      ? data.peserta
      : Array.from({ length: jumlahBarisKosong }, () => ({
          nama: "",
          jabatan: "",
          instansi: "",
        }));

  return (
    <Document>
      <Page size={pageDimensions as any} style={styles.page}>
        {/* Judul */}
        <View style={styles.headerWrap}>
          {tampilkanSpesifikEselon ? (
            <>
              <Text style={styles.title}>
                DAFTAR HADIR {data.targetPeserta?.toUpperCase() || "ESELON II.B DAN III.A"}
              </Text>
              <Text style={styles.subTitle}>
                PADA KEGIATAN YANG MENGUNDANG SELURUH PERANGKAT DAERAH
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>DAFTAR HADIR</Text>
              <Text style={styles.subTitle}>
                PADA KEGIATAN YANG MENGUNDANG PERANGKAT DAERAH
              </Text>
            </>
          )}
        </View>

        {/* Informasi Acara */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>HARI</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaVal}>
              {data.hari || ".................................................................................................................................................."}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TANGGAL</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaVal}>
              {data.tanggalLabel || ".................................................................................................................................................."}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>KEGIATAN</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaVal}>
              {data.namaKegiatan || ".................................................................................................................................................."}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>TEMPAT</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaVal}>
              {data.tempat || ".................................................................................................................................................."}
            </Text>
          </View>
        </View>

        {/* Tabel Daftar Hadir */}
        <View style={styles.table}>
          {/* Header Row (Repeats automatically on page breaks) */}
          <View style={styles.headerRow} fixed>
            <View style={[styles.thCell, styles.borderRight, styles.noCol]}>
              <Text style={styles.thText}>NO</Text>
            </View>
            <View style={[styles.thCell, styles.borderRight, styles.namaCol]}>
              <Text style={styles.thText}>NAMA</Text>
            </View>
            <View style={[styles.thCell, styles.borderRight, styles.jabatanCol]}>
              <Text style={styles.thText}>JABATAN</Text>
            </View>
            <View style={[styles.thCell, styles.borderRight, styles.opdCol]}>
              <Text style={styles.thText}>PERANGKAT DAERAH</Text>
            </View>
            <View style={[styles.thCell, styles.ttdCol]}>
              <Text style={styles.thText}>TANDA TANGAN</Text>
            </View>
          </View>

          {/* Data Rows (Each row wrapped with wrap={false} to prevent cut-off) */}
          {rows.map((row, idx) => (
            <View key={idx} wrap={false} style={styles.dataRow}>
              <View style={[styles.tdCell, styles.borderRight, styles.noCol]}>
                <Text style={[styles.tdText, { textAlign: "center" }]}>{idx + 1}</Text>
              </View>
              <View style={[styles.tdCell, styles.borderRight, styles.namaCol]}>
                <Text style={styles.tdText}>{row.nama || ""}</Text>
              </View>
              <View style={[styles.tdCell, styles.borderRight, styles.jabatanCol]}>
                <Text style={styles.tdText}>{row.jabatan || ""}</Text>
              </View>
              <View style={[styles.tdCell, styles.borderRight, styles.opdCol]}>
                <Text style={styles.tdText}>{row.instansi || ""}</Text>
              </View>
              <View style={[styles.tdCell, styles.ttdCol]}>
                <Text style={styles.tdText}>{""}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer Note (Opsional via Checkbox) */}
        {tampilkanFooterCatatan && (
          <Text style={styles.footerNote} wrap={false}>
            *SELAIN ESELON II.B DAN III.A TIDAK PERLU MENGISI ABSEN
          </Text>
        )}
      </Page>
    </Document>
  );
}
