import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import KopSurat from '@/pdf/components/kop-surat';

export type KuitansiSpj = {
  tahunAnggaran: string | null;
  kodeKegiatan: string | null;
  judulKegiatan: string | null;
  kodeSubKegiatan: string | null;
  judulSubKegiatan: string | null;
  upGu: string | null;
  nomorBku: string | null;
  kodeRekening: string | null;
  judulRekening: string | null;

  maksudDinas: string;
  kotaTandaTangan: string;
  tanggalKuitansiLabel: string | null; // sudah diformat (opsional)
};

export type KuitansiRincianRow = {
  label: string;
  jumlah: number;
};

export type KuitansiPenerima = {
  nama: string;
  nip: string | null;
};

export type KuitansiSigner = {
  nama: string;
  nip: string | null;
};

function rupiah2(n: number) {
  const x = Math.round(Number(n || 0));
  const s = x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${s},00`;
}

// terbilang sederhana (cukup untuk angka DOPD yang umumnya <= milyaran)
function terbilang(n: number): string {
  const angka = Math.floor(Math.abs(Number(n || 0)));

  const satuan = [
    '',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas'
  ];

  function toWords(x: number): string {
    if (x < 12) return satuan[x];
    if (x < 20) return `${toWords(x - 10)} belas`;
    if (x < 100) return `${toWords(Math.floor(x / 10))} puluh${x % 10 ? ' ' + toWords(x % 10) : ''}`;
    if (x < 200) return `seratus${x - 100 ? ' ' + toWords(x - 100) : ''}`;
    if (x < 1000) return `${toWords(Math.floor(x / 100))} ratus${x % 100 ? ' ' + toWords(x % 100) : ''}`;
    if (x < 2000) return `seribu${x - 1000 ? ' ' + toWords(x - 1000) : ''}`;
    if (x < 1_000_000) return `${toWords(Math.floor(x / 1000))} ribu${x % 1000 ? ' ' + toWords(x % 1000) : ''}`;
    if (x < 1_000_000_000)
      return `${toWords(Math.floor(x / 1_000_000))} juta${x % 1_000_000 ? ' ' + toWords(x % 1_000_000) : ''}`;
    if (x < 1_000_000_000_000)
      return `${toWords(Math.floor(x / 1_000_000_000))} miliar${
        x % 1_000_000_000 ? ' ' + toWords(x % 1_000_000_000) : ''
      }`;
    return `${toWords(Math.floor(x / 1_000_000_000_000))} triliun${
      x % 1_000_000_000_000 ? ' ' + toWords(x % 1_000_000_000_000) : ''
    }`;
  }

  const words = toWords(angka).trim();
  if (!words) return 'nol rupiah';
  // kapitalisasi awal seperti contoh
  return (words.charAt(0).toUpperCase() + words.slice(1) + ' rupiah').trim();
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function safeText(v: string | null | undefined) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : ' ';
}

function BudgetRow({ label, v1, v2 }: { label: string; v1: string | null; v2?: string | null }) {
  return (
    <View style={styles.bRow}>
      <Text style={styles.bLabel}>{label}</Text>
      <Text style={styles.bColon}>:</Text>
      <Text style={styles.bV1}>{safeText(v1)}</Text>
      <Text style={styles.bV2}>{v2 ? safeText(v2) : ''}</Text>
    </View>
  );
}

function Row2({ label, value, boldValue }: { label: string; value: React.ReactNode; boldValue?: boolean }) {
  return (
    <View style={styles.row2}>
      <Text style={styles.row2Label}>{label}</Text>
      <Text style={styles.row2Colon}>:</Text>
      <View style={styles.row2Value}>
        <Text style={boldValue ? styles.bold : undefined}>{value}</Text>
      </View>
    </View>
  );
}

export default function KuitansiPdf({
  spj,
  penerima,
  rincian,
  signers
}: {
  spj: KuitansiSpj;
  penerima: KuitansiPenerima;
  rincian: KuitansiRincianRow[];
  signers: { kpa?: KuitansiSigner | null; bpp?: KuitansiSigner | null };
}) {
  const total = sum((rincian ?? []).map((x) => x.jumlah));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Kop */}
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine={"Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"}
        />

        {/* Blok Anggaran */}
        <View style={styles.anggaranWrap}>
          <Text style={styles.tahunAnggaran}>
            Tahun Anggaran : <Text style={styles.bold}>{safeText(spj.tahunAnggaran)}</Text>
          </Text>

          <View style={styles.budgetGrid}>
            <View style={styles.budgetLeft}>
              <BudgetRow label="Kode Kegiatan" v1={spj.kodeKegiatan} v2={spj.judulKegiatan} />
              <BudgetRow label="Kode Sub Kegiatan" v1={spj.kodeSubKegiatan} v2={spj.judulSubKegiatan} />
              <BudgetRow label="UP/GU" v1={spj.upGu} />
              <BudgetRow label="Nomor BKU" v1={spj.nomorBku} />
              <BudgetRow label="Kode Rekening" v1={spj.kodeRekening} v2={spj.judulRekening} />
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>KUITANSI</Text>
        </View>

        {/* Isi Kuitansi */}
        <View style={styles.content}>
          <Row2 label="Sudah terima dari" value="Bendahara Pengeluaran Pembantu" />
          <Row2 label="Sebesar" value={`Rp${rupiah2(total)}`} boldValue />
          <Row2 label="Terbilang" value={terbilang(total)} boldValue />
          <Row2 label="Untuk Pengeluaran" value={spj.maksudDinas} />

          <View style={{ height: 6 }} />

          <Row2 label="Dengan Rincian" value="" />

          <View style={styles.rincianWrap}>
            {(rincian ?? []).map((r, idx) => (
              <View key={`${r.label}-${idx}`} style={styles.rincianRow}>
                <Text style={styles.rNo}>{idx + 1}.</Text>
                <Text style={styles.rLabel}>{r.label}</Text>
                <Text style={styles.rColon}>:</Text>
                <Text style={styles.rRp}>Rp</Text>
                <Text style={styles.rValue}>{rupiah2(r.jumlah)}</Text>
              </View>
            ))}

            {/* total bawah rincian */}
            <View style={styles.rTotalRow}>
              <Text style={styles.rTotalSpacer} />
              <Text style={styles.rRpBold}>Rp</Text>
              <Text style={styles.rValueBoldUnderline}>{rupiah2(total)}</Text>
            </View>
          </View>
        </View>

        {/* Area penerima */}
        <View style={styles.penerimaConatainer}>
          <View style={styles.penerimaWrap}>
            <Text style={styles.sendawarLabel}>
              {safeText(spj.kotaTandaTangan)}, {spj.tanggalKuitansiLabel ? '' : ''}
            </Text>
            <Text style={styles.penerimaText}>Penerima</Text>

            <View style={styles.signerSpace} />

            <Text style={styles.penerimaNameUnderline}>{penerima.nama}</Text>
            <Text style={styles.penerimaNip}>{penerima.nip ? penerima.nip : ''}</Text>
          </View>
        </View>

        {/* Signers bottom */}
        <View style={styles.signers2col}>
          <View style={styles.signerCol}>
            <Text style={styles.signerTitle}>Menyetujui</Text>
            <Text style={styles.signerTitle}>Kuasa Pengguna Anggaran,</Text>

            <View style={styles.signerSpace} />

            <Text style={styles.signerNameUnderline}>{signers.kpa?.nama ?? ''}</Text>
            <Text style={styles.signerNip}>NIP. {signers.kpa?.nip ?? ''}</Text>
          </View>

          <View style={styles.signerCol}>
            <Text style={styles.signerTitle}> </Text>
            <Text style={styles.signerTitle}>Bendahara Pengeluaran Pembantu,</Text>

            <View style={styles.signerSpace} />

            <Text style={styles.signerNameUnderline}>{signers.bpp?.nama ?? ''}</Text>
            <Text style={styles.signerNip}>NIP. {signers.bpp?.nip ?? ''}</Text>
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
    fontSize: 10,
    lineHeight: 1.35
  },
  hr: {
    marginTop: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000'
  },
  anggaranWrap: {
    marginTop: 2,
    marginBottom: 10
  },
  tahunAnggaran: {
    textAlign: 'right',
    marginBottom: 6
  },
  budgetGrid: {
    flexDirection: 'row'
  },
  budgetLeft: {
    flex: 1
  },
  bRow: {
    flexDirection: 'row',
    marginBottom: 2
  },
  bLabel: { width: 110 },
  bColon: { width: 10 },
  bV1: { width: 145 },
  bV2: { flex: 1 },
  titleWrap: { alignItems: 'center', marginTop: 8, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: 700, textDecoration: 'underline' },
  content: { marginTop: 2 },
  row2: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3
  },
  row2Label: { width: 110 },
  row2Colon: { width: 10 },
  row2Value: { flex: 1 },
  rincianWrap: {
    marginTop: 4,
    marginLeft: 120
  },
  rincianRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2
  },
  rNo: { width: 14 },
  rLabel: { width: 150 },
  rColon: { width: 10 },
  rRp: { width: 16, textAlign: 'right' },
  rValue: { width: 90, textAlign: 'right' },
  rTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2
  },
  rTotalSpacer: { width: 14 + 150 + 10 },
  rRpBold: { width: 16, textAlign: 'right', fontWeight: 700 },
  rValueBoldUnderline: { width: 90, textAlign: 'right', fontWeight: 700, textDecoration: 'underline' },
  penerimaConatainer: {
    display: 'flex',
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginTop: 40,
    paddingRight: 100
  },
  penerimaWrap: {},
  sendawarLabel: { marginBottom: 2 },
  penerimaText: { marginTop: 0 },
  penerimaNameUnderline: { fontWeight: 700, textDecoration: 'underline' },
  penerimaNip: { marginTop: 2 },
  signers2col: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22
  },
  signerCol: {},
  signerTitle: { textAlign: 'left' },
  signerSpace: { height: 40 },
  signerNameUnderline: { fontWeight: 700, textDecoration: 'underline' },
  signerNip: { marginTop: 2 },
  bold: { fontWeight: 700 }
});
