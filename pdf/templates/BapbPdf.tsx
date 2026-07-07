import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import KopSurat from '@/pdf/components/kop-surat';

export type BapbSpj = {
  nomorSurat: string;
  tanggalBapb: string | null;
  nomorSpb: string;
  tanggalSpbLabel: string | null;
  vendorNama: string;
  vendorPemilik: string;
  bagianOrganisasiLabel: string;
};

export type BapbSigner = {
  nama: string;
  nip: string | null;
  jabatan: string;
};

const angka = [
  "", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
];

function toWords(x: number): string {
  if (x < 12) return angka[x];
  if (x < 20) return toWords(x - 10) + " Belas";
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

export default function BapbPdf({
  spj,
  kpa,
  pptk,
  layout
}: {
  spj: BapbSpj;
  kpa: BapbSigner | null;
  pptk: BapbSigner | null;
  layout?: {
    marginTop?: number;
    marginBottom?: number;
    marginHorizontal?: number;
    fontSize?: number;
    lineHeight?: number;
  };
}) {
  const terbilang = getDateTerbilang(spj.tanggalBapb);

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

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>BERITA ACARA PEMERIKSAAN BARANG</Text>
          <Text style={styles.nomor}>NOMOR : {spj.nomorSurat}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>
            Pada hari ini {terbilang.hari} Tanggal {terbilang.tanggal} Bulan {terbilang.bulan} Tahun {terbilang.tahun}, kami yang bertanda tangan dibawah ini :
          </Text>

          <View style={styles.pejabatList}>
            <View style={styles.pejabatItem}>
              <Text style={styles.pNo}>1.</Text>
              <View style={styles.pDetail}>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Nama</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text style={styles.bold}>{kpa?.nama || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NIP</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{kpa?.nip || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Jabatan</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{kpa?.jabatan || "Kuasa Pengguna Anggaran"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.pejabatItem}>
              <Text style={styles.pNo}>2.</Text>
              <View style={styles.pDetail}>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Nama</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{pptk?.nama || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NIP</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{pptk?.nip || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Jabatan</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{pptk?.jabatan || "Pejabat Pelaksana Teknis Kegiatan"}</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.paragraph, styles.indent]}>
            Berdasarkan Surat Pesanan Barang Nomor {spj.nomorSpb || "......................."}, Tanggal {spj.tanggalSpbLabel || "......................."} dengan ini kami Memeriksa Pekerjaan Belanja Makan Minum Rapat Pada {spj.bagianOrganisasiLabel} Oleh {spj.vendorNama} telah sesuai dengan Surat Pesanan Barang dan Tepat Waktu serta dapat diterima oleh KPA dan PPTK, Sebagai Pejabat yang bertanggung jawab terhadap pelaksanaan pekerjaan tersebut.
          </Text>

          <Text style={[styles.paragraph, styles.indent]}>
            Demikian Berita Acara ini kami buat untuk dipergunakan sebagaimana mestinya.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureContainer}>
          <View style={styles.signatureLeft}>
            {/* KPA */}
            <View style={styles.pejabatItem}>
              <Text style={styles.pNo}>1.</Text>
              <View style={styles.pDetail}>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Nama</Text>
                  <Text style={styles.pColon}>:</Text>
                  <Text>{kpa?.nama || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NIP</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{kpa?.nip || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Jabatan</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{kpa?.jabatan || "Kuasa Pengguna Anggaran"}</Text>
                </View>
                <View style={[styles.pRow, { marginTop: 15 }]}>
                  <Text style={styles.pLabel}>Tanda Tangan</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>......................................</Text>
                </View>
              </View>
            </View>

            {/* PPTK */}
            <View style={[styles.pejabatItem, { marginTop: 15 }]}>
              <Text style={styles.pNo}>2.</Text>
              <View style={styles.pDetail}>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Nama</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{pptk?.nama || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>NIP</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{pptk?.nip || "......................................"}</Text>
                </View>
                <View style={styles.pRow}>
                  <Text style={styles.pLabel}>Jabatan</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>{pptk?.jabatan || "Pejabat Pelaksana Teknis Kegiatan"}</Text>
                </View>
                <View style={[styles.pRow, { marginTop: 15 }]}>
                  <Text style={styles.pLabel}>Tanda Tangan</Text>
                  <Text style={styles.pColon}></Text>
                  <Text>......................................</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.signatureRight}>
            <Text style={[styles.bold, { textTransform: 'uppercase' }]}>{spj.vendorNama}</Text>
            
            <View style={styles.signerSpace} />
            
            <Text style={styles.signerNameUnderline}>{spj.vendorPemilik}</Text>
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
    marginTop: 15,
    marginBottom: 20 
  },
  title: { 
    fontSize: 12, 
    fontWeight: 700, 
    textDecoration: 'underline',
    marginBottom: 2
  },
  nomor: {
    fontSize: 12,
    fontWeight: 700
  },
  content: { 
    marginTop: 2 
  },
  paragraph: {
    marginBottom: 15,
    textAlign: 'justify'
  },
  indent: {
    textIndent: 30
  },
  pejabatList: {
    marginLeft: 40,
    marginBottom: 15
  },
  pejabatItem: {
    flexDirection: 'row',
    marginBottom: 10
  },
  pNo: {
    width: 20
  },
  pDetail: {
    flex: 1
  },
  pRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  pLabel: {
    width: 80
  },
  pColon: {
    width: 15
  },
  bold: { fontWeight: 700 },
  
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },
  signatureLeft: {
    width: '60%'
  },
  signatureRight: {
    width: '35%',
    alignItems: 'center',
    paddingTop: 10
  },
  signerSpace: { height: 60 },
  signerNameUnderline: { fontWeight: 700, textDecoration: 'underline' }
});
