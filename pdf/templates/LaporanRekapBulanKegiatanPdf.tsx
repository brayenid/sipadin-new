import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";
import { formatWita } from "@/lib/date-utils";

export type KegiatanHadirPeserta = {
  nama: string;
  nip?: string | null;
  jabatan: string;
  instansi: string;
  status: string;
  namaPerwakilan?: string | null;
  jabatanPerwakilan?: string | null;
  keterangan?: string | null;
  isInsideRadius?: boolean | null;
};

export type KegiatanBulanItem = {
  agendaId: string;
  namaKegiatan: string;
  tanggal: Date | string;
  pesertaHadir: KegiatanHadirPeserta[];
};

export type BulanGroupItem = {
  bulanKey: string; // e.g. "2026-09"
  bulanLabel: string; // e.g. "September 2026"
  kegiatanList: KegiatanBulanItem[];
};

export type PegawaiRekapStat = {
  nama: string;
  nip?: string | null;
  jabatan: string;
  instansi: string;
  totalHadir: number;
  totalDiundang: number;
  persentaseKehadiran: number;
};

export type LaporanRekapBulanKegiatanPdfProps = {
  tahun: string;
  periodeLabel: string;
  rekapPegawai: PegawaiRekapStat[];
  bulanGroups: BulanGroupItem[];
  pageSize?: "F4" | "A4";
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 32,
    fontSize: 8.5,
    fontFamily: "Arial",
    color: "#0f172a",
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
  regionText: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 9.5,
    textAlign: "center",
    marginTop: 2,
    color: "#334155",
  },
  subTitle: {
    fontFamily: "Arial",
    fontSize: 9,
    textAlign: "center",
    marginTop: 3,
    color: "#475569",
  },
  sectionTitleWrap: {
    backgroundColor: "#1e293b",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 8,
    marginTop: 10,
  },
  sectionTitleText: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 9,
    color: "#ffffff",
    textTransform: "uppercase",
  },
  bulanHeaderWrap: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#2563eb",
  },
  bulanHeaderText: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 9,
    color: "#0f172a",
    textTransform: "uppercase",
  },
  kegiatanCard: {
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    overflow: "hidden",
  },
  kegiatanCardHeader: {
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
  },
  kegiatanTitle: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 8,
    color: "#0f172a",
    flex: 1,
  },
  kegiatanMeta: {
    fontFamily: "Arial",
    fontSize: 7.5,
    color: "#475569",
    marginLeft: 8,
  },
  // Tables
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.5,
    borderColor: "#94a3b8",
    minHeight: 18,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
    minHeight: 18,
    alignItems: "center",
  },
  thCell: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 7.5,
    paddingVertical: 3,
    paddingHorizontal: 4,
    color: "#1e293b",
  },
  tdCell: {
    fontSize: 7.5,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    color: "#334155",
  },
  thCenter: {
    textAlign: "center",
  },
  tdCenter: {
    textAlign: "center",
  },
  badgeHadir: {
    fontSize: 7,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#047857",
  },
  badgeWakili: {
    fontSize: 7,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "#b45309",
  },
  emptyText: {
    padding: 6,
    fontSize: 7.5,
    color: "#64748b",
    fontStyle: "italic",
    textAlign: "center",
  },
  footerPageNum: {
    position: "absolute",
    bottom: 16,
    right: 32,
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

export default function LaporanRekapBulanKegiatanPdf({
  tahun,
  periodeLabel,
  rekapPegawai,
  bulanGroups,
  pageSize = "F4",
}: LaporanRekapBulanKegiatanPdfProps) {
  const pageFormat = pageSize === "F4" ? ([612, 936] as [number, number]) : "A4";

  return (
    <Document>
      {/* ============================================================== */}
      {/* HALAMAN 1 (AWAL): REKAP KEHADIRAN MASING-MASING PEGAWAI       */}
      {/* ============================================================== */}
      <Page size={pageFormat} style={styles.page}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>
            REKAPITULASI KEHADIRAN PEGAWAI MENURUT KEGIATAN
          </Text>
          <Text style={styles.regionText}>PEMERINTAH KABUPATEN KUTAI BARAT</Text>
          <Text style={styles.subTitle}>
            PERIODE: {periodeLabel ? periodeLabel.toUpperCase() : `TAHUN ${tahun}`}
          </Text>
        </View>

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitleText}>
            RINGKASAN TOTAL KEHADIRAN PEGAWAI (PERIODE {periodeLabel ? periodeLabel.toUpperCase() : tahun})
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thCell, styles.thCenter, { width: "6%" }]}>NO</Text>
            <Text style={[styles.thCell, { width: "34%" }]}>NAMA PEGAWAI / NIP</Text>
            <Text style={[styles.thCell, { width: "30%" }]}>JABATAN & OPD</Text>
            <Text style={[styles.thCell, styles.thCenter, { width: "15%" }]}>JUMLAH HADIR</Text>
            <Text style={[styles.thCell, styles.thCenter, { width: "15%" }]}>PERSENTASE</Text>
          </View>

          {rekapPegawai.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada data pegawai pada periode ini.</Text>
          ) : (
            rekapPegawai.map((peg, idx) => (
              <View key={idx} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tdCell, styles.tdCenter, { width: "6%" }]}>
                  {idx + 1}
                </Text>
                <View style={{ width: "34%", paddingHorizontal: 4 }}>
                  <Text style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: 7.5 }}>
                    {peg.nama}
                  </Text>
                  {peg.nip && (
                    <Text style={{ fontSize: 6.5, color: "#64748b" }}>NIP. {peg.nip}</Text>
                  )}
                </View>
                <View style={{ width: "30%", paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 7.5 }}>{peg.jabatan || "-"}</Text>
                  <Text style={{ fontSize: 6.5, color: "#64748b" }}>{peg.instansi || "-"}</Text>
                </View>
                <Text style={[styles.tdCell, styles.tdCenter, { width: "15%", fontFamily: "Arial", fontWeight: "bold", color: "#047857" }]}>
                  {peg.totalHadir} Kali
                </Text>
                <Text style={[styles.tdCell, styles.tdCenter, { width: "15%", fontFamily: "Arial", fontWeight: "bold" }]}>
                  {peg.persentaseKehadiran}%
                </Text>
              </View>
            ))
          )}
        </View>

        <Text
          style={styles.footerPageNum}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>

      {/* ============================================================== */}
      {/* HALAMAN RINCIAN HIERARKI: BULAN > NAMA KEGIATAN > YANG HADIR   */}
      {/* ============================================================== */}
      <Page size={pageFormat} style={styles.page}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>
            RINCIAN KEHADIRAN MENURUT BULAN DAN KEGIATAN
          </Text>
          <Text style={styles.subTitle}>
            DAFTAR PEGAWAI HADIR PADA SETIAP AGENDA KEGIATAN
          </Text>
        </View>

        {bulanGroups.length === 0 ? (
          <Text style={styles.emptyText}>Tidak ada agenda kegiatan pada periode ini.</Text>
        ) : (
          bulanGroups.map((bGroup) => (
            <View key={bGroup.bulanKey}>
              {/* Header Bulan */}
              <View style={styles.bulanHeaderWrap} wrap={false}>
                <Text style={styles.bulanHeaderText}>
                  BULAN: {bGroup.bulanLabel.toUpperCase()} ({bGroup.kegiatanList.length} Kegiatan)
                </Text>
              </View>

              {/* Daftar Kegiatan dalam Bulan Ini */}
              {bGroup.kegiatanList.map((keg, kIdx) => (
                <View key={keg.agendaId || kIdx} style={styles.kegiatanCard} wrap={false}>
                  <View style={styles.kegiatanCardHeader}>
                    <Text style={styles.kegiatanTitle}>
                      {kIdx + 1}. {keg.namaKegiatan}
                    </Text>
                    <Text style={styles.kegiatanMeta}>
                      {formatWita(keg.tanggal, "EEEE, dd MMMM yyyy")} • {keg.pesertaHadir.length} Hadir
                    </Text>
                  </View>

                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thCell, styles.thCenter, { width: "6%" }]}>NO</Text>
                      <Text style={[styles.thCell, { width: "36%" }]}>NAMA PEGAWAI HADIR</Text>
                      <Text style={[styles.thCell, { width: "34%" }]}>JABATAN & OPD</Text>
                      <Text style={[styles.thCell, styles.thCenter, { width: "12%" }]}>STATUS</Text>
                      <Text style={[styles.thCell, { width: "12%" }]}>KETERANGAN</Text>
                    </View>

                    {keg.pesertaHadir.length === 0 ? (
                      <Text style={styles.emptyText}>Tidak ada data peserta hadir pada kegiatan ini.</Text>
                    ) : (
                      keg.pesertaHadir.map((p, pIdx) => (
                        <View key={pIdx} style={styles.tableRow} wrap={false}>
                          <Text style={[styles.tdCell, styles.tdCenter, { width: "6%" }]}>
                            {pIdx + 1}
                          </Text>
                          <View style={{ width: "36%", paddingHorizontal: 4 }}>
                            <Text style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: 7.5 }}>
                              {p.nama}
                            </Text>
                            {p.nip && (
                              <Text style={{ fontSize: 6.5, color: "#64748b" }}>NIP. {p.nip}</Text>
                            )}
                          </View>
                          <View style={{ width: "34%", paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 7.5 }}>{p.jabatan || "-"}</Text>
                            <Text style={{ fontSize: 6.5, color: "#64748b" }}>{p.instansi || "-"}</Text>
                          </View>
                          <Text
                            style={[
                              styles.tdCell,
                              styles.tdCenter,
                              { width: "12%" },
                              p.status === "HADIR" ? styles.badgeHadir : styles.badgeWakili,
                            ]}
                          >
                            {p.status === "HADIR" ? "Hadir" : "Mewakili"}
                          </Text>
                          <Text style={[styles.tdCell, { width: "12%", fontSize: 6.5, color: "#64748b" }]}>
                            {p.namaPerwakilan ? `Wkl: ${p.namaPerwakilan}` : p.keterangan || "-"}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        <Text
          style={styles.footerPageNum}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
