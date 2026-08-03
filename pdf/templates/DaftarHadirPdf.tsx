import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import '@/pdf/fonts';

export type DaftarHadirSpj = {
  hari: string;
  tanggalLabel: string;
  waktu: string;
  tempat: string;
  acara: string;
};

export default function DaftarHadirPdf({
  spj,
  jumlahPeserta,
  layout
}: {
  spj: DaftarHadirSpj;
  jumlahPeserta: number;
  layout?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
  };
}) {
  const participants = Array.from({ length: jumlahPeserta }, (_, i) => i + 1);

  return (
    <Document>
      <Page size="A4" style={[styles.page, layout ? { 
        paddingTop: layout.marginTop ?? styles.page.paddingTop,
        paddingBottom: layout.marginBottom ?? styles.page.paddingBottom,
        paddingHorizontal: layout.marginHorizontal ?? styles.page.paddingHorizontal,
        fontSize: layout.fontSize ?? styles.page.fontSize,
        lineHeight: layout.lineHeight ?? styles.page.lineHeight 
      } : {}]}>
        
        <View style={styles.titleWrap}>
          <Text style={styles.title}>DAFTAR HADIR</Text>
        </View>

        <View style={styles.headerContainer}>
          <View style={styles.hRow}>
            <Text style={styles.hLabel}>HARI</Text>
            <Text style={styles.hColon}>:</Text>
            <Text style={styles.hVal}>{spj.hari || "......................................"}</Text>
          </View>
          <View style={styles.hRow}>
            <Text style={styles.hLabel}>TANGGAL</Text>
            <Text style={styles.hColon}>:</Text>
            <Text style={styles.hVal}>{spj.tanggalLabel || "......................................"}</Text>
          </View>
          <View style={styles.hRow}>
            <Text style={styles.hLabel}>WAKTU</Text>
            <Text style={styles.hColon}>:</Text>
            <Text style={styles.hVal}>{spj.waktu || "......................................"}</Text>
          </View>
          <View style={styles.hRow}>
            <Text style={styles.hLabel}>TEMPAT</Text>
            <Text style={styles.hColon}>:</Text>
            <Text style={styles.hVal}>{spj.tempat || "......................................"}</Text>
          </View>
          <View style={styles.hRow}>
            <Text style={styles.hLabel}>ACARA</Text>
            <Text style={styles.hColon}>:</Text>
            <Text style={styles.hVal}>{spj.acara || "......................................"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {participants.map((no, idx) => (
            <View key={idx} wrap={false} style={[styles.participantWrap, idx > 0 ? { marginTop: -1 } : {}]}>
              {/* Row 1 */}
              <View style={styles.row1}>
                <View style={styles.col1Top}><Text>No.{no}</Text></View>
                <View style={styles.col2Top}><Text>Peserta</Text></View>
                <View style={styles.col3Top}><Text>Tanda Tangan</Text></View>
              </View>
              {/* Row 2 */}
              <View style={styles.row2}>
                <View style={styles.col1Bot}></View>
                <View style={styles.col2Bot}>
                  <View style={styles.dRow}>
                    <Text style={styles.dLabel}>Nama</Text>
                    <Text style={styles.dColon}>:</Text>
                    <Text style={styles.dVal}></Text>
                  </View>
                  <View style={styles.dRow}>
                    <Text style={styles.dLabel}>Jabatan</Text>
                    <Text style={styles.dColon}>:</Text>
                    <Text style={styles.dVal}></Text>
                  </View>
                  <View style={styles.dRow}>
                    <Text style={styles.dLabel}>Instansi</Text>
                    <Text style={styles.dColon}>:</Text>
                    <Text style={styles.dVal}></Text>
                  </View>
                  <View style={styles.dRow}>
                    <Text style={styles.dLabel}>No HP</Text>
                    <Text style={styles.dColon}>:</Text>
                    <Text style={styles.dVal}></Text>
                  </View>
                </View>
                <View style={styles.col3Bot}></View>
              </View>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 50,
    paddingBottom: 40,
    fontSize: 11,
    lineHeight: 1.35
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 12,
    fontWeight: 700,
    textDecoration: 'underline'
  },
  headerContainer: {
    marginBottom: 20
  },
  hRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  hLabel: {
    width: 80
  },
  hColon: {
    width: 15
  },
  hVal: {
    flex: 1
  },
  
  // Table
  table: {
    width: '100%',
  },
  participantWrap: {
    borderWidth: 1,
    borderColor: '#000',
  },
  row1: {
    flexDirection: 'row'
  },
  row2: {
    flexDirection: 'row'
  },
  col1Top: {
    width: '10%',
    borderRightWidth: 1,
    borderColor: '#000',
    padding: 4,
  },
  col1Bot: {
    width: '10%',
    borderRightWidth: 1,
    borderColor: '#000',
  },
  col2Top: {
    width: '55%',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000',
    padding: 4,
  },
  col2Bot: {
    width: '55%',
    borderRightWidth: 1,
    borderColor: '#000',
    padding: 4,
    paddingBottom: 8
  },
  col3Top: {
    width: '35%',
    borderBottomWidth: 1,
    borderColor: '#000',
    padding: 4,
    alignItems: 'center',
  },
  col3Bot: {
    width: '35%',
  },
  dRow: {
    flexDirection: 'row',
    marginBottom: 6
  },
  dLabel: {
    width: 50
  },
  dColon: {
    width: 10
  },
  dVal: {
    flex: 1
  }
});
