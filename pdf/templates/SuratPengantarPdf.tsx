import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import KopSurat from '@/pdf/components/kop-surat';
import '@/pdf/fonts';

export type SuratPengantarSpj = {
  nomorSurat: string;
  tanggalSurat: string | null; // e.g. "13 Mei 2026"
  tanggalPenerima: string | null;
  vendorNama: string;
  vendorPemilik: string;
  bagianOrganisasiLabel: string;
};

export type SuratPengantarItem = {
  no: number;
  jenisBarang: string;
  qty: number;
  satuan: string;
  keterangan: string;
};

export type KuitansiSigner = {
  nama: string;
  nip: string | null;
};

export default function SuratPengantarPdf({
  spj,
  items,
  pptk,
  layout
}: {
  spj: SuratPengantarSpj;
  items: SuratPengantarItem[];
  pptk: KuitansiSigner | null;
  layout?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
  };
}) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, layout ? { 
        paddingTop: layout.marginTop ?? styles.page.paddingTop,
        paddingBottom: layout.marginBottom ?? styles.page.paddingBottom,
        paddingHorizontal: layout.marginHorizontal ?? styles.page.paddingHorizontal,
        fontSize: layout.fontSize ?? styles.page.fontSize,
        lineHeight: layout.lineHeight ?? styles.page.lineHeight 
      } : {}]}>
        {/* Kop */}
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine={"Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"}
        />

        {/* Tujuan (Kanan Atas) */}
        <View style={styles.tujuanWrap}>
          <Text>Sendawar, {spj.tanggalSurat ? spj.tanggalSurat : '................................'}</Text>
          <Text style={{ marginTop: 2 }}>Kepada</Text>
          <View style={styles.ythWrap}>
            <Text style={styles.ythLabel}>Yth</Text>
            <View style={styles.ythValue}>
              <Text>{spj.vendorNama}</Text>
              <Text>Di -</Text>
              <Text style={{ marginLeft: 20 }}>Sendawar</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>SURAT PENGANTAR PERMINTAAN BARANG</Text>
          <Text style={styles.title}>{spj.bagianOrganisasiLabel.toUpperCase()}</Text>
          <Text style={styles.nomor}>Nomor: {spj.nomorSurat}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.intro}>Bersama ini kami sampaikan daftar pesanan barang antara lain:</Text>
          
          <View style={styles.table}>
            {/* Left Section: No, Jenis Barang, Jumlah Unit */}
            <View style={styles.tableLeftCol}>
              <View style={styles.tableHeaderRow}>
                <View style={[styles.colNoSub, styles.thCell]}><Text>No</Text></View>
                <View style={[styles.colJenisSub, styles.thCell]}><Text>Jenis Barang</Text></View>
                <View style={[styles.colJumlahSub, styles.thCell]}><Text>Jumlah Unit</Text></View>
              </View>
              
              <View style={{ flexGrow: 1, flexDirection: 'column' }}>
                {items.map((item, idx) => (
                  <View style={[styles.tableRow, { flexGrow: 1 }]} key={idx}>
                    <View style={[styles.colNoSub, styles.tdCell]}><Text>{item.no}.</Text></View>
                    <View style={[styles.colJenisSub, styles.tdCell]}><Text>{item.jenisBarang}</Text></View>
                    <View style={[styles.colJumlahSub, styles.tdCell]}>
                      <Text>{item.qty}   {item.satuan}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Right Section: Keterangan (vertical merge) */}
            <View style={styles.tableRightCol}>
              <View style={styles.thCell}><Text>Keterangan</Text></View>
              <View style={[styles.tdCell, { flexGrow: 1 }]}>
                <Text>{Array.from(new Set(items.map((i) => i.keterangan).filter(Boolean))).join('\n') || items[0]?.keterangan || ''}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.outro}>Demikian kami sampaikan, atas kerja samanya di ucapkan terimakasih</Text>
        </View>

        {/* Signers bottom */}
        <View style={styles.signers2col}>
          {/* Penerima (Kiri) */}
          <View style={styles.signerColLeft}>
            <Text style={[styles.bold, { marginBottom: 2 }]}>Penerima</Text>
            <View style={styles.penerimaRow}>
              <Text style={styles.penerimaLabel}>Nama</Text>
              <Text style={styles.penerimaColon}>:</Text>
              <Text>{spj.vendorPemilik}</Text>
            </View>
            <View style={styles.penerimaRow}>
              <Text style={styles.penerimaLabel}>Tanggal</Text>
              <Text style={styles.penerimaColon}>:</Text>
              <Text>{spj.tanggalPenerima ? spj.tanggalPenerima : '................................'}</Text>
            </View>
            <View style={styles.penerimaRow}>
              <Text style={styles.penerimaLabel}>Tandatangan</Text>
              <Text style={styles.penerimaColon}>:</Text>
              <Text>................................</Text>
            </View>
          </View>

          {/* PPTK (Kanan) */}
          <View style={styles.signerColRight}>
            <Text style={[styles.signerTitle, styles.bold]}>Pejabat Pelaksana Teknis Kegiatan</Text>
            
            <View style={styles.signerSpace} />

            <Text style={styles.signerNameUnderline}>{pptk?.nama ?? ''}</Text>
            <Text style={styles.signerNip}>NIP. {pptk?.nip ?? ''}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingHorizontal: 40,
    paddingBottom: 36,
    fontSize: 11,
    lineHeight: 1.35
  },
  tujuanWrap: {
    alignSelf: 'flex-end',
    width: 175,
    marginTop: 10,
    marginBottom: 15
  },
  ythWrap: {
    flexDirection: 'row',
  },
  ythLabel: {
    width: 25
  },
  ythValue: {
    flex: 1
  },
  titleWrap: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
  title: { 
    fontSize: 12, 
    fontWeight: 700, 
    textDecoration: 'underline',
    marginBottom: 2
  },
  nomor: {
    fontSize: 12
  },
  content: { 
    marginTop: 2 
  },
  intro: {
    marginBottom: 10
  },
  outro: {
    marginTop: 10,
    marginBottom: 30
  },
  table: {
    width: '100%',
    flexDirection: 'row',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  tableLeftCol: {
    width: '68%',
    flexDirection: 'column',
  },
  tableRightCol: {
    width: '32%',
    flexDirection: 'column',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
  },
  thCell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    paddingVertical: 3,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 10.5,
  },
  tdCell: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 10,
    lineHeight: 1.2,
  },
  colNoSub: { width: '11.7647%', textAlign: 'center' },
  colJenisSub: { width: '55.8824%' },
  colJumlahSub: { width: '32.3529%' },

  signers2col: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20
  },
  signerColLeft: {
    width: '50%',
    paddingLeft: 0
  },
  signerColRight: {
    width: '40%',
    alignItems: 'center'
  },
  penerimaRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  penerimaLabel: {
    width: 70
  },
  penerimaColon: {
    width: 10
  },
  signerTitle: { textAlign: 'center' },
  signerSpace: { height: 60 },
  signerNameUnderline: { fontWeight: 700, textDecoration: 'underline' },
  signerNip: { marginTop: 2 },
  bold: { fontWeight: 700 }
});
