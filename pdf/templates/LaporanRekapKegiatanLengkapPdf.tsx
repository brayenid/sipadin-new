import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "@/pdf/fonts";
import { formatWita } from "@/lib/date-utils";

export type SingleAgendaData = {
  id: string;
  namaKegiatan: string;
  hari?: string | null;
  tanggal: Date | string;
  tanggalLabel: string;
  waktu?: string | null;
  tempat: string;
  targetPeserta?: string | null;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  radiusMeter?: number | null;
  enableCheckOut?: boolean;
  pic?: {
    nama?: string | null;
    nip?: string | null;
    jabatan?: string | null;
  } | null;
  peserta: {
    nama: string;
    nip?: string | null;
    jabatan: string;
    instansi: string;
    status: string;
    namaPerwakilan?: string | null;
    jabatanPerwakilan?: string | null;
    keterangan?: string | null;
    isSelfInput?: boolean;
    isNonUndangan?: boolean;
    waktuInput?: string | null;
    waktuPulang?: string | null;
    lokasiText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    distanceMeters?: number | null;
    isInsideRadius?: boolean | null;
  }[];
};

export type LaporanRekapKegiatanLengkapPdfProps = {
  agendas: SingleAgendaData[];
  filterFilledOnly?: boolean;
  pageSize?: "F4" | "A4";
};

// Helper Geodesic Distance
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
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
    fontSize: 9.5,
    textAlign: "center",
    textTransform: "uppercase",
    lineHeight: 1.3,
    marginTop: 2,
  },
  metaContainer: {
    marginBottom: 10,
    width: "100%",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "flex-start",
  },
  metaLabel: {
    width: 75,
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 8.5,
    textTransform: "uppercase",
  },
  metaColon: {
    width: 12,
    fontSize: 8.5,
    textAlign: "center",
  },
  metaVal: {
    flex: 1,
    fontSize: 8.5,
  },

  // Kotak Analisis Geolokasi Kedinasan
  analysisBox: {
    marginBottom: 8,
    padding: 5,
    borderWidth: 0.25,
    borderColor: "#000000",
    backgroundColor: "#ffffff",
  },
  analysisHeader: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 7,
    textTransform: "uppercase",
    marginBottom: 3.5,
    borderBottomWidth: 0.25,
    borderBottomColor: "#000000",
    paddingBottom: 1.5,
  },
  analysisItem: {
    flexDirection: "row",
    marginBottom: 1.8,
    alignItems: "flex-start",
  },
  analysisNumber: {
    width: 11,
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 6.5,
  },
  analysisContent: {
    flex: 1,
    fontSize: 6.5,
    lineHeight: 1.25,
  },
  analysisBold: {
    fontFamily: "Arial",
    fontWeight: "bold",
  },

  // Tabel
  table: {
    width: "100%",
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    borderTopWidth: 0.25,
    borderBottomWidth: 0.25,
    borderLeftWidth: 0.25,
    borderRightWidth: 0.25,
    borderColor: "#000000",
    minHeight: 18,
    backgroundColor: "#ffffff",
  },
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 0.25,
    borderLeftWidth: 0.25,
    borderRightWidth: 0.25,
    borderColor: "#000000",
    minHeight: 20,
    backgroundColor: "#ffffff",
  },
  thCell: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 7,
    textAlign: "center",
    textTransform: "uppercase",
    paddingVertical: 3,
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  thText: {
    fontFamily: "Arial",
    fontWeight: "bold",
    fontSize: 7,
    textAlign: "center",
    textTransform: "uppercase",
  },
  tdCell: {
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    justifyContent: "center",
  },
  tdText: {
    fontSize: 6.5,
    color: "#000000",
  },
  tdBold: {
    fontFamily: "Arial",
    fontWeight: "bold",
  },
  borderRight: {
    borderRightWidth: 0.25,
    borderColor: "#000000",
  },

  // Lebar kolom
  colNo: { width: "5%" },
  colNama: { width: "26%" },
  colJabatan: { width: "27%" },
  colStatus: { width: "12%" },
  colKeterangan: { width: "20%" },
  colWaktu: { width: "10%" },

  // Kolom Tanda Tangan PIC
  signatureContainer: {
    marginTop: 20,
    alignItems: "flex-end",
    paddingRight: 10,
  },
  sigDate: {
    fontSize: 8.5,
    marginBottom: 3,
  },
  sigJob: {
    fontSize: 8.5,
    fontWeight: "bold",
    textAlign: "right",
  },
  sigSpacer: {
    height: 48,
  },
  sigName: {
    fontSize: 8.5,
    fontWeight: "bold",
    textDecoration: "underline",
    textAlign: "right",
  },
  sigNip: {
    fontSize: 8.5,
    textAlign: "right",
    marginTop: 2,
  },
});

export default function LaporanRekapKegiatanLengkapPdf({
  agendas,
  filterFilledOnly = false,
  pageSize = "F4",
}: LaporanRekapKegiatanLengkapPdfProps) {
  const pageFormat = pageSize === "F4" ? ([612, 936] as [number, number]) : "A4";

  if (!agendas || agendas.length === 0) {
    return (
      <Document>
        <Page size={pageFormat} style={styles.page}>
          <View style={styles.headerWrap}>
            <Text style={styles.title}>LAPORAN HASIL PRESENSI KEGIATAN</Text>
            <Text style={styles.subTitle}>PEMERINTAH KABUPATEN KUTAI BARAT</Text>
          </View>
          <Text style={{ textAlign: "center", marginTop: 40, fontSize: 10, color: "#666" }}>
            Tidak ada data kegiatan pada periode yang dipilih.
          </Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {agendas.map((agenda, agendaIdx) => {
        const rawPeserta = agenda.peserta || [];
        const pesertaList = filterFilledOnly
          ? rawPeserta.filter(
              (p) => p.status === "HADIR" || p.status === "MEWAKILI" || p.status === "IZIN"
            )
          : rawPeserta;

        const totalPeserta = rawPeserta.length;

        // Analisis Geolokasi Kedinasan per agenda
        const pWithGps = rawPeserta.filter(
          (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
        );
        const totalGps = pWithGps.length;
        const pctGps = totalPeserta > 0 ? Math.round((totalGps / totalPeserta) * 100) : 0;

        const hasVenue =
          typeof agenda.targetLatitude === "number" &&
          typeof agenda.targetLongitude === "number";
        const venueRadius = agenda.radiusMeter ?? 100;

        let centroidLat: number | null = null;
        let centroidLng: number | null = null;
        let stdDevMeters = 0;
        let effectiveRadius = venueRadius;

        if (hasVenue) {
          centroidLat = agenda.targetLatitude!;
          centroidLng = agenda.targetLongitude!;
        } else if (totalGps >= 4) {
          const sumLat = pWithGps.reduce((acc, cur) => acc + cur.latitude!, 0);
          const sumLng = pWithGps.reduce((acc, cur) => acc + cur.longitude!, 0);
          centroidLat = sumLat / totalGps;
          centroidLng = sumLng / totalGps;

          const distances = pWithGps.map((p) =>
            calculateDistanceMeters(centroidLat!, centroidLng!, p.latitude!, p.longitude!)
          );
          const meanDist = distances.reduce((a, b) => a + b, 0) / totalGps;
          const variance =
            distances.reduce((acc, d) => acc + Math.pow(d - meanDist, 2), 0) / totalGps;
          stdDevMeters = Math.sqrt(variance);
          effectiveRadius = Math.max(50, Math.min(500, Math.round(meanDist + 2 * stdDevMeters)));
        } else if (totalGps > 0) {
          centroidLat = pWithGps[0].latitude!;
          centroidLng = pWithGps[0].longitude!;
          effectiveRadius = 100;
        }

        const centerLat = centroidLat;
        const centerLng = centroidLng;

        let countInside = 0;
        let countOutside = 0;

        if (centerLat !== null && centerLng !== null) {
          pWithGps.forEach((p) => {
            const dist = calculateDistanceMeters(
              centerLat,
              centerLng,
              p.latitude!,
              p.longitude!
            );
            if (dist <= effectiveRadius) {
              countInside++;
            } else {
              countOutside++;
            }
          });
        }

        const pctInside = totalGps > 0 ? Math.round((countInside / totalGps) * 100) : 0;

        return (
          <Page key={agenda.id || agendaIdx} size={pageFormat} style={styles.page}>
            {/* Header Laporan */}
            <View style={styles.headerWrap}>
              <Text style={styles.title}>LAPORAN HASIL PRESENSI KEGIATAN</Text>
              <Text style={styles.subTitle}>PEMERINTAH KABUPATEN KUTAI BARAT</Text>
            </View>

            {/* Metadata Kegiatan */}
            <View style={styles.metaContainer}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>KEGIATAN</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={[styles.metaVal, { fontFamily: "Arial", fontWeight: "bold" }]}>
                  {agenda.namaKegiatan}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>HARI / TGL</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>
                  {agenda.hari ? `${agenda.hari}, ` : ""}{agenda.tanggalLabel}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>WAKTU</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>
                  {agenda.waktu ? `${agenda.waktu} WITA` : "-"}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>TEMPAT</Text>
                <Text style={styles.metaColon}>:</Text>
                <Text style={styles.metaVal}>{agenda.tempat || "-"}</Text>
              </View>
              {agenda.targetPeserta && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>PESERTA</Text>
                  <Text style={styles.metaColon}>:</Text>
                  <Text style={styles.metaVal}>{agenda.targetPeserta}</Text>
                </View>
              )}
            </View>

            {/* Kotak Analisis Geolokasi Presensi Kedinasan */}
            <View style={styles.analysisBox}>
              <Text style={styles.analysisHeader}>
                RINGKASAN ANALISIS GEOLOKASI PRESENSI
              </Text>

              <View style={styles.analysisItem}>
                <Text style={styles.analysisNumber}>1.</Text>
                <Text style={styles.analysisContent}>
                  <Text style={styles.analysisBold}>Perekaman Koordinat GPS: </Text>
                  {totalGps > 0 ? (
                    <>
                      Tercatat sebanyak <Text style={styles.analysisBold}>{totalGps} dari {totalPeserta} peserta ({pctGps}%)</Text> melakukan presensi mandiri dengan data geolokasi GPS yang valid.
                    </>
                  ) : (
                    "Belum ada data geolokasi GPS yang terekam pada presensi agenda ini."
                  )}
                </Text>
              </View>

              <View style={styles.analysisItem}>
                <Text style={styles.analysisNumber}>2.</Text>
                <Text style={styles.analysisContent}>
                  <Text style={styles.analysisBold}>Titik Acuan Lokasi: </Text>
                  {hasVenue ? (
                    <>
                      Titik lokasi kegiatan ditetapkan secara resmi pada koordinat <Text style={styles.analysisBold}>{agenda.targetLatitude?.toFixed(5)}, {agenda.targetLongitude?.toFixed(5)}</Text> ({agenda.tempat}) dengan batas toleransi radius <Text style={styles.analysisBold}>±{venueRadius} meter</Text>.
                    </>
                  ) : totalGps >= 4 ? (
                    <>
                      Pusat kegiatan diestimasi secara statistik berbasis rata-rata kluster presensi peserta pada koordinat <Text style={styles.analysisBold}>{centroidLat?.toFixed(5)}, {centroidLng?.toFixed(5)}</Text> dengan toleransi standar deviasi (2σ) sebesar <Text style={styles.analysisBold}>±{effectiveRadius} meter</Text> (Deviasi: ±{Math.round(stdDevMeters)}m, N={totalGps}).
                    </>
                  ) : totalGps > 0 ? (
                    <>
                      Pusat kegiatan diestimasi berdasarkan rata-rata koordinat peserta pada <Text style={styles.analysisBold}>{centroidLat?.toFixed(5)}, {centroidLng?.toFixed(5)}</Text> dengan radius batas aman awal <Text style={styles.analysisBold}>±100 meter</Text> (Sampel awal N &lt; 4).
                    </>
                  ) : (
                    "Titik acuan kegiatan belum ditetapkan."
                  )}
                </Text>
              </View>

              <View style={styles.analysisItem}>
                <Text style={styles.analysisNumber}>3.</Text>
                <Text style={styles.analysisContent}>
                  <Text style={styles.analysisBold}>Kesesuaian Geofence: </Text>
                  {totalGps > 0 ? (
                    <>
                      Sebanyak <Text style={styles.analysisBold}>{countInside} peserta ({pctInside}%)</Text> terverifikasi berada di dalam zona radius lokasi kegiatan.
                    </>
                  ) : (
                    "-"
                  )}
                </Text>
              </View>

              <View style={styles.analysisItem}>
                <Text style={styles.analysisNumber}>4.</Text>
                <Text style={styles.analysisContent}>
                  <Text style={styles.analysisBold}>Catatan Evaluasi / Rekomendasi: </Text>
                  {totalGps === 0 ? (
                    "Seluruh data kehadiran dicatat secara manual oleh admin / operator presensi."
                  ) : countOutside > 0 ? (
                    <>
                      Terdapat <Text style={styles.analysisBold}>{countOutside} peserta</Text> di luar radius lokasi. Disarankan konfirmasi klarifikasi kedinasan terkait penugasan/posisi yang bersangkutan.
                    </>
                  ) : (
                    "Seluruh peserta yang hadir terverifikasi tertib berada di dalam batas jangkauan lokasi kegiatan."
                  )}
                </Text>
              </View>
            </View>

            {/* Tabel Data Kehadiran */}
            <View style={styles.table}>
              {/* Header Row */}
              <View style={styles.headerRow} fixed>
                <View style={[styles.thCell, styles.borderRight, styles.colNo]}>
                  <Text style={styles.thText}>NO</Text>
                </View>
                <View style={[styles.thCell, styles.borderRight, styles.colNama]}>
                  <Text style={styles.thText}>NAMA PEGAWAI / NIP</Text>
                </View>
                <View style={[styles.thCell, styles.borderRight, styles.colJabatan]}>
                  <Text style={styles.thText}>JABATAN & INSTANSI</Text>
                </View>
                <View style={[styles.thCell, styles.borderRight, styles.colStatus]}>
                  <Text style={styles.thText}>STATUS</Text>
                </View>
                <View style={[styles.thCell, styles.borderRight, styles.colKeterangan]}>
                  <Text style={styles.thText}>PERWAKILAN / KET</Text>
                </View>
                <View style={[styles.thCell, styles.colWaktu]}>
                  <Text style={styles.thText}>METODE / WAKTU</Text>
                </View>
              </View>

              {/* Data Rows */}
              {pesertaList.length === 0 ? (
                <View style={styles.dataRow}>
                  <View style={[styles.tdCell, { width: "100%", textAlign: "center", paddingVertical: 10 }]}>
                    <Text style={[styles.tdText, { textAlign: "center", color: "#666" }]}>
                      Tidak ada data peserta yang memenuhi kriteria filter.
                    </Text>
                  </View>
                </View>
              ) : (
                pesertaList.map((row, idx) => {
                  const statusLabel =
                    row.status === "HADIR"
                      ? "HADIR"
                      : row.status === "MEWAKILI"
                      ? "MEWAKILI"
                      : row.status === "IZIN"
                      ? "IZIN"
                      : "TIDAK HADIR";

                  const hasGpsRow = typeof row.latitude === "number" && typeof row.longitude === "number";
                  const dist = hasGpsRow && centerLat !== null && centerLng !== null
                    ? calculateDistanceMeters(centerLat, centerLng, row.latitude!, row.longitude!)
                    : null;
                  const isOutside = dist !== null && dist > effectiveRadius;

                  return (
                    <View key={idx} wrap={false} style={styles.dataRow}>
                      <View style={[styles.tdCell, styles.borderRight, styles.colNo]}>
                        <Text style={[styles.tdText, { textAlign: "center", fontSize: 6.5 }]}>{idx + 1}</Text>
                      </View>
                      <View style={[styles.tdCell, styles.borderRight, styles.colNama]}>
                        <Text style={[styles.tdText, styles.tdBold, { fontSize: 7 }]}>
                          {row.nama}{Boolean(row.isNonUndangan) ? " [Non-Undangan]" : ""}
                        </Text>
                        {row.nip && <Text style={[styles.tdText, { fontSize: 6, marginTop: 1 }]}>NIP: {row.nip}</Text>}
                      </View>
                      <View style={[styles.tdCell, styles.borderRight, styles.colJabatan]}>
                        <Text style={[styles.tdText, { fontSize: 6.5 }]}>{row.jabatan}</Text>
                        <Text style={[styles.tdText, { fontSize: 6, marginTop: 1 }]}>{row.instansi}</Text>
                      </View>
                      <View style={[styles.tdCell, styles.borderRight, styles.colStatus]}>
                        <Text style={[styles.tdText, { textAlign: "center", fontSize: 6.5 }]}>
                          {statusLabel}
                        </Text>
                      </View>
                      <View style={[styles.tdCell, styles.borderRight, styles.colKeterangan]}>
                        {row.status === "MEWAKILI" && row.namaPerwakilan ? (
                          <Text style={[styles.tdText, { fontSize: 6 }]}>
                            Wkl: {row.namaPerwakilan} {row.jabatanPerwakilan ? `(${row.jabatanPerwakilan})` : ""}
                          </Text>
                        ) : null}
                        {row.keterangan ? (
                          <Text style={[styles.tdText, { fontSize: 6 }]}>
                            Ket: {row.keterangan}
                          </Text>
                        ) : null}
                        {isOutside && (
                          <Text style={[styles.tdText, { fontSize: 5.5, color: "#b91c1c", marginTop: 1 }]}>
                            Luar Radius: {formatDistanceMeters(dist!)}
                          </Text>
                        )}
                        {!row.namaPerwakilan && !row.keterangan && !isOutside && (
                          <Text style={[styles.tdText, { fontSize: 6.5 }]}>-</Text>
                        )}
                      </View>
                      <View style={[styles.tdCell, styles.colWaktu]}>
                        <Text style={[styles.tdText, { textAlign: "center", fontSize: 6 }]}>
                          {row.isSelfInput ? "Online" : "Manual"}
                        </Text>
                        {row.waktuInput && (
                          <Text style={[styles.tdText, { textAlign: "center", fontSize: 5.5, marginTop: 1 }]}>
                            {agenda.enableCheckOut ? `Dtg: ${row.waktuInput}` : row.waktuInput}
                          </Text>
                        )}
                        {row.waktuPulang ? (
                          <Text style={[styles.tdText, { textAlign: "center", fontSize: 5.5, marginTop: 1, color: "#3730a3" }]}>
                            Plg: {row.waktuPulang}
                          </Text>
                        ) : agenda.enableCheckOut && row.waktuInput ? (
                          <Text style={[styles.tdText, { textAlign: "center", fontSize: 5, marginTop: 1, color: "#64748b" }]}>
                            Plg: -
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Kolom Tanda Tangan PIC (Opsional) */}
            {agenda.pic?.nama && (
              <View style={styles.signatureContainer} wrap={false}>
                <Text style={styles.sigDate}>
                  Sendawar, {agenda.tanggalLabel}
                </Text>
                <Text style={styles.sigJob}>
                  {agenda.pic.jabatan || "Pejabat Penanggung Jawab"}
                </Text>
                <View style={styles.sigSpacer} />
                <Text style={styles.sigName}>
                  {agenda.pic.nama}
                </Text>
                {agenda.pic.nip && (
                  <Text style={styles.sigNip}>NIP. {agenda.pic.nip}</Text>
                )}
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}
