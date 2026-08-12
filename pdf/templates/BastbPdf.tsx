import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import KopSurat from '@/pdf/components/kop-surat';
import '@/pdf/fonts';

export type BastbItem = {
  no: number;
  jenisBarang: string;
  qty: number;
  satuan: string;
  keterangan: string;
};

export type BastbSpj = {
  nomorSurat: string;
  tanggalBastb: string | null;
};

export type BastbVendor = {
  nama: string;
  npwp: string | null;
  npwpd: string | null;
  alamat: string | null;
  jabatan: string; // e.g. "Pemilik CV. X"
};

export type BastbPptk = {
  nama: string;
  nip: string | null;
  jabatan: string; // e.g. "Pejabat Pelaksana Teknis Kegiatan"
  alamat: string;
};

const angka = [
  "", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
  "Dua Belas", "Tiga Belas", "Empat Belas", "Lima Belas", "Enam Belas", "Tujuh Belas", "Delapan Belas", "Sembilan Belas", "Dua Puluh",
  "Dua Puluh Satu", "Dua Puluh Dua", "Dua Puluh Tiga", "Dua Puluh Empat", "Dua Puluh Lima", "Dua Puluh Enam", "Dua Puluh Tujuh",
  "Dua Puluh Delapan", "Dua Puluh Sembilan", "Tiga Puluh", "Tiga Puluh Satu"
];

function toWords(x: number): string {
  if (x < 32) return angka[x]; // For dates 1-31
  if (x < 100) return toWords(Math.floor(x / 10)) + " Puluh" + (x % 10 ? " " + toWords(x % 10) : "");
  if (x < 200) return "Seratus" + (x - 100 ? " " + toWords(x - 100) : "");
  if (x < 1000) return toWords(Math.floor(x / 100)) + " Ratus" + (x % 100 ? " " + toWords(x % 100) : "");
  if (x < 2000) return "Seribu" + (x - 1000 ? " " + toWords(x - 1000) : "");
  if (x < 10000) return toWords(Math.floor(x / 1000)) + " Ribu" + (x % 1000 ? " " + toWords(x % 1000) : "");
  return "";
}

function getDateTerbilang(dateStr: string | null) {
  if (!dateStr) {
    return {
      hari: "................",
      tanggal: "................",
      bulan: "................",
      tahun: "................"
    };
  }

  const d = new Date(dateStr);
  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return {
    hari: hariArr[d.getDay()],
    tanggal: toWords(d.getDate()),
    bulan: bulanArr[d.getMonth()],
    tahun: toWords(d.getFullYear())
  };
}

export default function BastbPdf({
  spj,
  vendor,
  pptk,
  items,
  layout
}: {
  spj: BastbSpj;
  vendor: BastbVendor | null;
  pptk: BastbPptk | null;
  items: BastbItem[];
  layout?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
  };
}) {
  const terbilang = getDateTerbilang(spj.tanggalBastb);

  return (
    <Document>
      <Page size="A4" style={[styles.page, layout ? { 
        paddingTop: layout.marginTop ?? styles.page.paddingTop,
        paddingBottom: layout.marginBottom ?? styles.page.paddingBottom,
        paddingHorizontal: layout.marginHorizontal ?? styles.page.paddingHorizontal,
        fontSize: layout.fontSize ?? styles.page.fontSize,
        lineHeight: layout.lineHeight ?? styles.page.lineHeight 
      } : {}]}>
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine={"Jalan Komplek Perkantoran Pemerintah Kabupaten Kutai Barat. Telepon (0542) 594754\nKode Pos 75576 Fax (0545) 4043843 Website setda.kutaibaratkab.go.id"}
        />

        <View style={styles.titleWrap}>
          <Text style={styles.title}>BERITA ACARA SERAH TERIMA BARANG</Text>
          <Text style={styles.nomor}>Nomor : {spj.nomorSurat}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Pada hari ini {terbilang.hari} Tanggal {terbilang.tanggal} Bulan {terbilang.bulan} Tahun {terbilang.tahun}, kami yang bertanda tangan dibawah ini :
          </Text>

          <View style={styles.pihakList}>
            {/* PIHAK PERTAMA (Vendor) */}
            <View style={styles.pihakItem}>
              <Text style={styles.pNo}>1)</Text>
              <View style={styles.pDetail}>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Nama</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{vendor?.nama || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NPWP</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{vendor?.npwp || "-"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NPWPD</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{vendor?.npwpd || "-"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Jabatan</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{vendor?.jabatan || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Alamat</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{vendor?.alamat || "......................................"}</Text>
                </View>

                <Text style={styles.setujuText}>Setuju di sebut sebagai <Text style={styles.italicUnderline}>PIHAK PERTAMA</Text></Text>
              </View>
            </View>

            {/* PIHAK KEDUA (PPTK) */}
            <View style={[styles.pihakItem, { marginTop: 15 }]}>
              <Text style={styles.pNo}>2)</Text>
              <View style={styles.pDetail}>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Nama</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{pptk?.nama || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NIP</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{pptk?.nip || "-"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Jabatan</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{pptk?.jabatan || "Pejabat Pelaksana Teknis Kegiatan"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Alamat</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.pValue}>{pptk?.alamat || "Jl. Komplek Perkantoran Bupati Kutai Barat"}</Text>
                </View>

                <Text style={styles.setujuText}>Setuju disebut sebagai <Text style={styles.italicUnderline}>PIHAK KEDUA</Text></Text>
              </View>
            </View>
          </View>

          <Text style={styles.paragraph}>
            Kedua belah pihak sepakat dan setuju untuk melakukan Berita Acara Serah Terima Barang dengan ketentuan sebagai berikut ini berdasarkan :
          </Text>
          <View style={{ marginLeft: 20, marginBottom: 15 }}>
            <Text>1) Surat Permintaan Barang</Text>
          </View>

          {/* PASAL 1 */}
          <Text style={styles.pasalTitle}>Pasal 1</Text>
          <Text style={styles.paragraph}>
            Pihak Pertama menyerahkan Kepada Pihak kedua dan Pihak kedua telah menerima dari Pihak pertama
          </Text>

          {/* PASAL 2 */}
          <View wrap={false}>
            <Text style={styles.pasalTitle}>Pasal 2</Text>
            <Text style={styles.paragraphZero}>
              Penyerahan sebagaimana dimaksud di atas meliputi:
            </Text>
            
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
                    <View style={[styles.tableRow, { flexGrow: 1 }]} key={idx} wrap={false}>
                      <View style={[styles.colNoSub, styles.tdCell]}><Text>{item.no}.</Text></View>
                      <View style={[styles.colJenisSub, styles.tdCell]}><Text>{item.jenisBarang}</Text></View>
                      <View style={[styles.colJumlahSub, styles.tdCell]}>
                        <Text style={{ textAlign: 'center' }}>{item.qty}   {item.satuan}</Text>
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
          </View>

          {/* PASAL 3 */}
          <Text style={[styles.pasalTitle, { marginTop: 15 }]}>Pasal 3</Text>
          <Text style={styles.paragraph}>
            Dengan ditandatanganinya surat Berita Acara Serah Terima Barang ini, maka segala tanggung jawab atas barang tersebut, beralih pada pihak kedua. Demikian Berita Acara Serah Terima Barang ini dibuat untuk dapat dipergunakan sebagai mana mestinya.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureContainer} wrap={false}>
          <View style={styles.signatureCol}>
            <Text style={styles.bold}>PIHAK KEDUA</Text>
            <View style={styles.signerSpace} />
            <Text style={styles.signerNameUnderline}>{pptk?.nama || "......................................"}</Text>
            <Text>NIP. {pptk?.nip || "......................................"}</Text>
          </View>

          <View style={styles.signatureCol}>
            <Text style={styles.bold}>PIHAK PERTAMA</Text>
            <View style={styles.signerSpace} />
            <Text style={styles.signerNameUnderline}>{vendor?.nama || "......................................"}</Text>
            <Text>{vendor?.jabatan || "......................................"}</Text>
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
  titleWrap: { 
    alignItems: 'center', 
    marginTop: 6,
    marginBottom: 12 
  },
  title: { 
    fontSize: 12, 
    fontWeight: 700, 
    textDecoration: 'underline',
    marginBottom: 2
  },
  nomor: {
    fontSize: 11
  },
  content: { 
    marginTop: 2 
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify'
  },
  paragraphZero: {
    marginBottom: 2,
    textAlign: 'justify'
  },
  pihakList: {
    marginLeft: 30,
    marginBottom: 15
  },
  pihakItem: {
    flexDirection: 'row',
  },
  pNo: {
    width: 25
  },
  pDetail: {
    flex: 1
  },
  pRow: {
    flexDirection: 'row',
    marginBottom: 2
  },
  pLabel: {
    width: 60
  },
  pColon: {
    width: 15
  },
  pValue: {
    flex: 1
  },
  bold: { fontWeight: 700 },
  italicUnderline: { fontStyle: 'italic', textDecoration: 'underline' },
  setujuText: { marginTop: 10 },
  
  pasalTitle: {
    fontWeight: 700,
    textDecoration: 'underline',
    textAlign: 'center',
    marginBottom: 5,
    fontStyle: 'italic'
  },

  // Table
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
    width: '60%',
    flexDirection: 'column',
  },
  tableRightCol: {
    width: '40%',
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
    fontWeight: 700,
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
  colNoSub: { width: '13.3333%', textAlign: 'center' },
  colJenisSub: { width: '58.3333%' },
  colJumlahSub: { width: '28.3334%', textAlign: 'center' },
  jumlahRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 2
  },
  jumlahVal: {
    width: '50%',
    textAlign: 'center'
  },
  jumlahSatuan: {
    width: '50%',
    textAlign: 'left'
  },
  center: { textAlign: 'center' },

  // Signatures
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 40
  },
  signatureCol: {
    alignItems: 'center'
  },
  signerSpace: { height: 60 },
  signerNameUnderline: { fontWeight: 700, textDecoration: 'underline' }
});
