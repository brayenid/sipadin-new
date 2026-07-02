import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: 'Helvetica' },
  header: { fontSize: 12, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' },
  timestamp: { fontSize: 7, marginBottom: 10, textAlign: 'right', color: '#666' },
  table: { display: 'flex', flexDirection: 'column', width: 'auto' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4, paddingTop: 4 },
  headerRow: { backgroundColor: '#f3f4f6', fontWeight: 'bold' },
  colKode: { width: '15%' },
  colUraian: { width: '40%' },
  colPagu: { width: '15%', textAlign: 'right' },
  colTerpakai: { width: '15%', textAlign: 'right' },
  colSisa: { width: '15%', textAlign: 'right' },
  indentSub: { paddingLeft: 10 },
  indentRek: { paddingLeft: 20 },
});

export const ReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <Text style={styles.header}>Laporan Rincian Anggaran Tahun {data.tahun}</Text>
      <Text style={styles.timestamp}>Dicetak pada: {new Date().toLocaleString('id-ID')}</Text>

      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <Text style={styles.colKode}>Kode</Text>
          <Text style={styles.colUraian}>Uraian</Text>
          <Text style={styles.colPagu}>Pagu (Rp)</Text>
          <Text style={styles.colTerpakai}>Terpakai (Rp)</Text>
          <Text style={styles.colSisa}>Sisa (Rp)</Text>
        </View>

        {data.kegiatan.map((keg: any) => {
          let kegPagu = BigInt(0);
          let kegSisa = BigInt(0);
          keg.subKegiatan.forEach((sub: any) => {
            sub.rekening.forEach((rek: any) => {
              kegPagu += BigInt(rek.saldoAwal);
              kegSisa += BigInt(rek.sisaSaldo);
            });
          });
          const kegTerpakai = kegPagu - kegSisa;

          return (
            <React.Fragment key={keg.id}>
              <View style={[styles.row, { backgroundColor: '#f9fafb' }]}>
                <Text style={styles.colKode}>{keg.kodeKegiatan}</Text>
                <Text style={styles.colUraian}>{keg.judulKegiatan}</Text>
                <Text style={styles.colPagu}>{Number(kegPagu).toLocaleString("id-ID")}</Text>
                <Text style={styles.colTerpakai}>{Number(kegTerpakai).toLocaleString("id-ID")}</Text>
                <Text style={styles.colSisa}>{Number(kegSisa).toLocaleString("id-ID")}</Text>
              </View>

              {keg.subKegiatan.map((sub: any) => {
                let subPagu = BigInt(0);
                let subSisa = BigInt(0);
                sub.rekening.forEach((rek: any) => {
                  subPagu += BigInt(rek.saldoAwal);
                  subSisa += BigInt(rek.sisaSaldo);
                });
                const subTerpakai = subPagu - subSisa;

                return (
                  <React.Fragment key={sub.id}>
                    <View style={styles.row}>
                      <Text style={[styles.colKode, styles.indentSub]}>{sub.kodeSub}</Text>
                      <Text style={styles.colUraian}>{sub.judulSub}</Text>
                      <Text style={styles.colPagu}>{Number(subPagu).toLocaleString("id-ID")}</Text>
                      <Text style={styles.colTerpakai}>{Number(subTerpakai).toLocaleString("id-ID")}</Text>
                      <Text style={styles.colSisa}>{Number(subSisa).toLocaleString("id-ID")}</Text>
                    </View>

                    {sub.rekening.map((rek: any) => {
                      const pagu = BigInt(rek.saldoAwal);
                      const sisa = BigInt(rek.sisaSaldo);
                      const terpakai = pagu - sisa;

                      return (
                        <View style={styles.row} key={rek.id}>
                          <Text style={[styles.colKode, styles.indentRek]}>{rek.kodeRekening}</Text>
                          <Text style={styles.colUraian}>{rek.judulRekening}</Text>
                          <Text style={styles.colPagu}>{Number(pagu).toLocaleString("id-ID")}</Text>
                          <Text style={styles.colTerpakai}>{Number(terpakai).toLocaleString("id-ID")}</Text>
                          <Text style={styles.colSisa}>{Number(sisa).toLocaleString("id-ID")}</Text>
                        </View>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </View>
    </Page>
  </Document>
);
