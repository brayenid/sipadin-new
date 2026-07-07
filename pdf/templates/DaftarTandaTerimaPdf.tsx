import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import '@/pdf/fonts';

export type TandaTerimaItem = {
  id: string;
  nama: string;
  jabatanSebagai: string;
  kegiatan: string;
  hargaSatuan: number;
  kuantitas: number;
  satuan: string;
  persenPph: number;
  jumlah: number;
  pph: number;
  bersih: number;
};

export type DaftarTandaTerimaSpj = {
  perihal: string;
  tanggalLabel: string;
  tanggalTandaTerima?: string;
  kpa: {
    jabatanLabel: string;
    nama: string;
    nip: string | null;
  } | null;
  pptk: {
    jabatanLabel: string;
    nama: string;
    nip: string | null;
  } | null;
  bpp: {
    jabatanLabel: string;
    nama: string;
    nip: string | null;
  } | null;
};

const fmtRp = (num: number) => {
  return new Intl.NumberFormat('id-ID').format(num);
};

export default function DaftarTandaTerimaPdf({
  spj,
  narasumber,
  layout,
}: {
  spj: DaftarTandaTerimaSpj;
  narasumber: TandaTerimaItem[];
  layout?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
  };
}) {
  const judul = `DAFTAR TANDA TERIMA`;
  const subJudul = (spj.perihal || '').toUpperCase();
  const tanggalLine = `TANGGAL ${(spj.tanggalLabel || '').toUpperCase()}`;

  const totalJumlah = narasumber.reduce((sum, item) => sum + item.jumlah, 0);
  const totalPph = narasumber.reduce((sum, item) => sum + item.pph, 0);
  const totalBersih = narasumber.reduce((sum, item) => sum + item.bersih, 0);

  let monthYearStr = "Maret 2024";
  if (spj.tanggalTandaTerima) {
    const dateObj = new Date(spj.tanggalTandaTerima);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (!isNaN(dateObj.getTime())) {
      monthYearStr = `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }
  } else {
    // Fallback: Parse month and year from tanggalLabel if possible
    const monthYearMatch = spj.tanggalLabel.match(/[a-zA-Z]+\s+\d{4}/);
    if (monthYearMatch) {
      monthYearStr = monthYearMatch[0];
    }
  }
  
  // Use a wide space before the month string for handwritten date
  const bppDateLine = `Sendawar,           ${monthYearStr}`;

  return (
    <Document>
      <Page
        size="A4"
        orientation="landscape"
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
            <View style={[styles.cellHarga, styles.headerCell]}>
              <Text>BESARNYA HONORARIUM</Text>
            </View>
            <View style={[styles.cellJumlah, styles.headerCell]}>
              <Text>JUMLAH</Text>
            </View>
            <View style={[styles.cellPph, styles.headerCell]}>
              <Text>PPh Pasal 21</Text>
            </View>
            <View style={[styles.cellBersih, styles.headerCell]}>
              <Text>JUMLAH BERSIH{'\n'}DITERIMA</Text>
            </View>
            <View style={[styles.cellTtd, styles.headerCell, { borderRightWidth: 0 }]}>
              <Text>TANDA TERIMA</Text>
            </View>
          </View>

          {/* Data rows */}
          {narasumber.map((item, idx) => {
            return (
              <View key={item.id} style={styles.tableRow}>
                {/* NO */}
                <View style={[styles.cellNo, styles.dataCell]}>
                  <Text>{idx + 1}</Text>
                </View>
                {/* NAMA */}
                <View style={[styles.cellNama, styles.dataCell]}>
                  <Text>{item.nama}</Text>
                </View>
                {/* JABATAN SEBAGAI */}
                <View style={[styles.cellJabatan, styles.dataCell]}>
                  <Text>{item.jabatanSebagai}</Text>
                </View>
                {/* KEGIATAN */}
                <View style={[styles.cellKegiatan, styles.dataCell]}>
                  <Text>{item.kegiatan}</Text>
                </View>

                {/* BESARNYA HONORARIUM */}
                <View style={[styles.cellHarga, styles.flexRow]}>
                  <View style={[styles.hColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
                  <View style={[styles.hColVal, styles.br, styles.tr]}><Text style={styles.p2}>{fmtRp(item.hargaSatuan)}</Text></View>
                  <View style={[styles.hColX, styles.br, styles.tc]}><Text style={styles.p2}>x</Text></View>
                  <View style={[styles.hColQty, styles.br, styles.tc]}><Text style={styles.p2}>{item.kuantitas}</Text></View>
                  <View style={[styles.hColUnit, styles.tc]}><Text style={styles.p2}>{item.satuan}</Text></View>
                </View>

                {/* JUMLAH */}
                <View style={[styles.cellJumlah, styles.flexRow]}>
                  <View style={[styles.jColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
                  <View style={[styles.jColVal, styles.tr]}><Text style={styles.p2}>{fmtRp(item.jumlah)}</Text></View>
                </View>

                {/* PPh */}
                <View style={[styles.cellPph, styles.flexRow]}>
                  <View style={[styles.pColPct, styles.br, styles.tc]}><Text style={styles.p2}>{item.persenPph}%</Text></View>
                  <View style={[styles.pColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
                  <View style={[styles.pColVal, styles.tr]}><Text style={styles.p2}>{fmtRp(item.pph)}</Text></View>
                </View>

                {/* BERSIH */}
                <View style={[styles.cellBersih, styles.flexRow]}>
                  <View style={[styles.bColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
                  <View style={[styles.bColVal, styles.tr]}><Text style={styles.p2}>{fmtRp(item.bersih)}</Text></View>
                </View>

                {/* TANDA TERIMA */}
                <View style={[styles.cellTtd, { borderRightWidth: 0 }]}>
                  <Text> </Text>
                </View>
              </View>
            );
          })}

          {/* TOTAL ROW */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.cellTotalLabel, styles.headerCell, { justifyContent: 'center', borderBottomWidth: 0 }]}>
              <Text>TOTAL</Text>
            </View>
            <View style={[styles.cellJumlah, styles.flexRow, styles.headerCell, { padding: 0, borderBottomWidth: 0 }]}>
              <View style={[styles.jColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
              <View style={[styles.jColVal, styles.tr]}><Text style={styles.p2}>{fmtRp(totalJumlah)}</Text></View>
            </View>
            <View style={[styles.cellPph, styles.flexRow, styles.headerCell, { padding: 0, borderBottomWidth: 0 }]}>
              <View style={[styles.pColPct, styles.br, styles.tc]}><Text style={styles.p2}></Text></View>
              <View style={[styles.pColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
              <View style={[styles.pColVal, styles.tr]}><Text style={styles.p2}>{fmtRp(totalPph)}</Text></View>
            </View>
            <View style={[styles.cellBersih, styles.flexRow, styles.headerCell, { padding: 0, borderBottomWidth: 0 }]}>
              <View style={[styles.bColRp, styles.br]}><Text style={styles.p2}>Rp</Text></View>
              <View style={[styles.bColVal, styles.tr]}><Text style={styles.p2}>{fmtRp(totalBersih)}</Text></View>
            </View>
            <View style={[styles.cellTtd, styles.headerCell, { borderRightWidth: 0, borderBottomWidth: 0 }]}>
              <Text> </Text>
            </View>
          </View>
        </View>

        {/* FOOTER PENANDATANGAN */}
        <View style={styles.footer}>
          {/* Kiri */}
          <View style={styles.footerCol}>
            <Text style={styles.footerJabatanLabel}>
              {spj.kpa ? spj.kpa.jabatanLabel : 'Mengetahui :\nKuasa Pengguna Anggaran,\nKepala Bagian Organisasi'}
            </Text>
            <View style={styles.footerNamaBlock}>
              <Text style={styles.footerNama}>
                {spj.kpa ? spj.kpa.nama : '...........................'}
              </Text>
              {spj.kpa?.nip && (
                <Text style={styles.footerNip}>NIP. {spj.kpa.nip}</Text>
              )}
            </View>
          </View>

          {/* Tengah */}
          <View style={[styles.footerCol, { alignItems: 'center' }]}>
            <Text style={[styles.footerJabatanLabel, { textAlign: 'center' }]}>
              {spj.pptk ? spj.pptk.jabatanLabel : 'Pejabat Pelaksana Teknis Kegiatan'}
            </Text>
            <View style={[styles.footerNamaBlock, { alignItems: 'center' }]}>
              <Text style={styles.footerNama}>
                {spj.pptk ? spj.pptk.nama : '...........................'}
              </Text>
              {spj.pptk?.nip && (
                <Text style={styles.footerNip}>NIP. {spj.pptk.nip}</Text>
              )}
            </View>
          </View>

          {/* Kanan */}
          <View style={[styles.footerCol, { alignItems: 'center' }]}>
            <Text style={[styles.footerJabatanLabel, { textAlign: 'center' }]}>
              {bppDateLine}{'\n'}
              {spj.bpp ? spj.bpp.jabatanLabel : 'Bendahara Pengeluaran Pembantu'}
            </Text>
            <View style={[styles.footerNamaBlock, { alignItems: 'center' }]}>
              <Text style={styles.footerNama}>
                {spj.bpp ? spj.bpp.nama : '...........................'}
              </Text>
              {spj.bpp?.nip && (
                <Text style={styles.footerNip}>NIP. {spj.bpp.nip}</Text>
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
    paddingTop: 30,
    paddingHorizontal: 30,
    paddingBottom: 30,
    fontSize: 8,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleLine: {
    fontSize: 9,
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

  headerCell: {
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 3,
    fontSize: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    justifyContent: 'center',
  },
  dataCell: {
    padding: 4,
    fontSize: 8,
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  noBorderBottom: {
    borderBottomWidth: 0,
  },

  // COLUMN WIDTHS
  cellNo: { width: '3%', borderRightWidth: 1, borderRightColor: '#000', alignItems: 'center', justifyContent: 'center' },
  cellNama: { width: '13%', borderRightWidth: 1, borderRightColor: '#000' },
  cellJabatan: { width: '13%', borderRightWidth: 1, borderRightColor: '#000' },
  cellKegiatan: { width: '13%', borderRightWidth: 1, borderRightColor: '#000' },
  cellHarga: { width: '18%', borderRightWidth: 1, borderRightColor: '#000' },
  cellJumlah: { width: '10%', borderRightWidth: 1, borderRightColor: '#000' },
  cellPph: { width: '10%', borderRightWidth: 1, borderRightColor: '#000' },
  cellBersih: { width: '10%', borderRightWidth: 1, borderRightColor: '#000' },
  cellTtd: { width: '10%', borderBottomWidth: 1, borderBottomColor: '#000', position: 'relative' },
  
  cellTotalLabel: { width: '60%', borderRightWidth: 1, borderRightColor: '#000', fontWeight: 'bold' },

  // FLEX HELPERS
  flexRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  br: { borderRightWidth: 1, borderRightColor: '#000' },
  p2: { paddingVertical: 2, paddingHorizontal: 3 },
  tc: { textAlign: 'center' },
  tr: { textAlign: 'right' },

  // SUB COLUMNS (Harga)
  hColRp: { width: '15%' },
  hColVal: { width: '45%' },
  hColX: { width: '10%' },
  hColQty: { width: '10%' },
  hColUnit: { width: '20%' },

  // SUB COLUMNS (Jumlah & Bersih)
  jColRp: { width: '30%' },
  jColVal: { width: '70%' },
  bColRp: { width: '30%' },
  bColVal: { width: '70%' },

  // SUB COLUMNS (PPh)
  pColPct: { width: '25%' },
  pColRp: { width: '25%' },
  pColVal: { width: '50%' },

  // FOOTER
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 24,
    minHeight: 110,
    paddingHorizontal: 20,
  },
  footerCol: {
    width: '30%',
    justifyContent: 'space-between',
  },
  footerJabatanLabel: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  footerNamaBlock: {
    marginTop: 48,
  },
  footerNama: {
    fontSize: 9,
    fontWeight: 'bold',
    textDecoration: 'underline',
    textTransform: 'uppercase',
  },
  footerNip: {
    fontSize: 8,
    marginTop: 1,
  },
});
