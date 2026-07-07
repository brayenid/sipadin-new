import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import '@/pdf/fonts';

export type NarasumberItem = {
  nama: string;
  jabatanSebagai: string;
  kegiatan: string;
};

export type DaftarHadirNarasumberSpj = {
  perihal: string;
  tanggalLabel: string; // e.g. "21 Maret 2024"
  pejabatKiri: {
    jabatanLabel: string; // e.g. "Kuasa Pengguna Anggaran,\nKepala Bagian Organisasi"
    nama: string;
    nip: string | null;
  } | null;
  pejabatKanan: {
    jabatanLabel: string; // e.g. "Pejabat Pelaksana Teknis Kegiatan"
    nama: string;
    nip: string | null;
  } | null;
};

export default function DaftarHadirNarasumberPdf({
  spj,
  narasumber,
  layout,
}: {
  spj: DaftarHadirNarasumberSpj;
  narasumber: NarasumberItem[];
  layout?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
  };
}) {
  const judul = `DAFTAR HADIR NARASUMBER DALAM RANGKA`;
  const subJudul = (spj.perihal || '').toUpperCase();
  const tanggalLine = `TANGGAL ${(spj.tanggalLabel || '').toUpperCase()}`;

  return (
    <Document>
      <Page
        size="A4"
        style={[
          styles.page,
          layout
            ? {
                paddingTop: layout.marginTop ?? styles.page.paddingTop,
                paddingBottom: layout.marginBottom ?? styles.page.paddingBottom,
                paddingHorizontal: layout.marginHorizontal ?? styles.page.paddingHorizontal,
                fontSize: layout.fontSize ?? styles.page.fontSize,
                lineHeight: layout.lineHeight ?? styles.page.lineHeight,
              }
            : {},
        ]}
      >
        {/* JUDUL */}
        <View style={styles.titleWrap}>
          <Text style={styles.titleLine}>{judul}</Text>
          <Text style={styles.titleLine}>{subJudul}</Text>
          <Text style={styles.titleLine}>{tanggalLine}</Text>
        </View>

        {/* TABEL */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.cellNo, styles.headerCell]}>
              <Text>NO</Text>
            </View>
            <View style={[styles.cellNama, styles.headerCell]}>
              <Text>NAMA</Text>
            </View>
            <View style={[styles.cellJabatan, styles.headerCell]}>
              <Text>JABATAN SEBAGAI</Text>
            </View>
            <View style={[styles.cellKegiatan, styles.headerCell]}>
              <Text>KEGIATAN</Text>
            </View>
            <View style={[styles.cellTtd, styles.headerCell, { borderRightWidth: 0 }]}>
              <Text>TANDA TANGAN</Text>
            </View>
          </View>

          {/* Data rows */}
          {narasumber.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={[styles.cellNo, styles.dataCell, idx === narasumber.length - 1 ? styles.noBorderBottom : {}]}>
                <Text>{idx + 1}</Text>
              </View>
              <View style={[styles.cellNama, styles.dataCell, idx === narasumber.length - 1 ? styles.noBorderBottom : {}]}>
                <Text>{item.nama}</Text>
              </View>
              <View style={[styles.cellJabatan, styles.dataCell, idx === narasumber.length - 1 ? styles.noBorderBottom : {}]}>
                <Text>{item.jabatanSebagai}</Text>
              </View>
              <View style={[styles.cellKegiatan, styles.dataCell, idx === narasumber.length - 1 ? styles.noBorderBottom : {}]}>
                <Text>{item.kegiatan || subJudul + (spj.tanggalLabel ? ' TANGGAL ' + spj.tanggalLabel.toUpperCase() : '')}</Text>
              </View>
              <View style={[styles.cellTtd, styles.dataCell, idx === narasumber.length - 1 ? styles.noBorderBottom : {}]}>
                <Text> </Text>
              </View>
            </View>
          ))}

          {/* Jika kosong, tampilkan 3 baris kosong */}
          {narasumber.length === 0 &&
            [1, 2, 3].map((n) => (
              <View key={n} style={styles.tableRow}>
                <View style={[styles.cellNo, styles.dataCell, n === 3 ? styles.noBorderBottom : {}]}><Text>{n}</Text></View>
                <View style={[styles.cellNama, styles.dataCell, n === 3 ? styles.noBorderBottom : {}]}><Text> </Text></View>
                <View style={[styles.cellJabatan, styles.dataCell, n === 3 ? styles.noBorderBottom : {}]}><Text> </Text></View>
                <View style={[styles.cellKegiatan, styles.dataCell, n === 3 ? styles.noBorderBottom : {}]}><Text> </Text></View>
                <View style={[styles.cellTtd, styles.dataCell, n === 3 ? styles.noBorderBottom : {}]}><Text> </Text></View>
              </View>
            ))}
        </View>

        {/* FOOTER PENANDATANGAN */}
        <View style={styles.footer}>
          {/* Kiri */}
          <View style={styles.footerCol}>
            <Text style={styles.footerJabatanLabel}>
              {spj.pejabatKiri ? spj.pejabatKiri.jabatanLabel : 'Mengetahui :'}
            </Text>
            <View style={styles.footerNamaBlock}>
              <Text style={styles.footerNama}>
                {spj.pejabatKiri ? spj.pejabatKiri.nama : '...........................'}
              </Text>
              {spj.pejabatKiri?.nip && (
                <Text style={styles.footerNip}>NIP. {spj.pejabatKiri.nip}</Text>
              )}
            </View>
          </View>

          {/* Kanan */}
          <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.footerJabatanLabel}>
              {spj.pejabatKanan ? spj.pejabatKanan.jabatanLabel : 'Pejabat Pelaksana Teknis Kegiatan'}
            </Text>
            <View style={[styles.footerNamaBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.footerNama}>
                {spj.pejabatKanan ? spj.pejabatKanan.nama : '...........................'}
              </Text>
              {spj.pejabatKanan?.nip && (
                <Text style={styles.footerNip}>NIP. {spj.pejabatKanan.nip}</Text>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingHorizontal: 50,
    paddingBottom: 50,
    fontSize: 10,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleLine: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 1.5,
  },

  // TABLE
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {},
  rowAlt: {},

  headerCell: {
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 5,
    fontSize: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  dataCell: {
    padding: 6,
    fontSize: 10,
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },

  cellNo: {
    width: '6%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNama: {
    width: '20%',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  cellJabatan: {
    width: '26%',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  cellKegiatan: {
    width: '30%',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  cellTtd: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBorderBottom: {
    borderBottomWidth: 0,
  },

  // FOOTER
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',  // anchor both columns' bottom edges together
    marginTop: 28,
    minHeight: 110,           // fixed height so both sides share same vertical space
  },
  footerCol: {
    width: '45%',
    justifyContent: 'space-between', // jabatan label at top, nama at bottom
  },
  footerJabatanLabel: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  footerNamaBlock: {
    marginTop: 48,  // signature space
  },
  footerSpaceSign: {
    height: 48,
  },
  footerNama: {
    fontSize: 10,
    fontWeight: 'bold',
    textDecoration: 'underline',
    textTransform: 'uppercase',
  },
  footerNip: {
    fontSize: 9,
    marginTop: 1,
  },
});
