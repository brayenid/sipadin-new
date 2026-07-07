import React from 'react'
import { Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'

import KopSurat from '@/pdf/components/kop-surat'
import { formatWita } from '@/lib/date-utils'
import '@/pdf/fonts'

const NUMBERS = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function terbilang(n: number): string {
  if (n < 12) return NUMBERS[n];
  if (n < 20) return NUMBERS[n - 10] + " belas";
  if (n < 100) return NUMBERS[Math.floor(n / 10)] + " puluh " + NUMBERS[n % 10];
  return n.toString();
}
function terbilangId(n: number) {
  return `${n} (${terbilang(n).trim()})`;
}

function fmtDateId(d: Date | null | undefined) {
  if (!d) return '';
  return formatWita(d, 'dd MMMM yyyy');
}

function fmtMonthYear(d: Date | null | undefined) {
  if (!d) return '';
  return formatWita(d, 'MMMM yyyy');
}

function fmtPangkatGol(pangkat: string | null, golongan: string | null) {
  const p = (pangkat ?? '').trim()
  const g = (golongan ?? '').trim()
  if (p && /\([^)]+\)/.test(p)) return p
  if (p && !g) return p
  if (p && g) return `${p} (${g})`
  if (!p && g) return g
  return '-'
}

export type Roster = {
  id: string
  nama: string
  nip: string | null
  jabatan: string
  pangkat: string | null
  golongan: string | null
}

export type Spj = {
  kotaTandaTangan: string
  tempatTujuan: string
  tempatBerangkat: string
  alatAngkut: string
  lamaPerjalanan: number
  akunAnggaran: string | null
  tglBerangkat: Date | null
  tglKembali: Date | null
  tglSuratTugas: Date | null
  noSuratTugas: string | null
  overrideLamaText?: string
}

export type SuratTugas = {
  untuk: string
  assignedRosterItemId: string | null
  signerNama: string
  signerNip: string
  signerJabatan: string
  signerPangkatGolongan: string
}

export type SuratTugasPdfProps = {
  spj: Spj
  suratTugas: SuratTugas
  roster: Roster[]
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 42,
    fontSize: 11,
    lineHeight: 1.35,
    fontFamily: 'Helvetica'
  },
  centerTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 12,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  nomorText: {
    fontSize: 11,
    marginTop: 2,
  },
  table: {
    width: '100%',
    flexDirection: 'column',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  labelCol: {
    width: 80,
  },
  colonCol: {
    width: 15,
    textAlign: 'center',
  },
  valueCol: {
    flex: 1,
    textAlign: 'justify',
  },
  // Khusus buat tabel yang melingkupi seluruh isi "Memerintahkan" dsb
  grid: {
    flexDirection: 'row',
  },
  klausulLabel: {
    width: 90,
  },
  klausulColon: {
    width: 15,
  },
  klausulContent: {
    flex: 1,
  },
  // List roster
  rosterList: {
    marginTop: 4,
  },
  rosterItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rosterNumber: {
    width: 20,
  },
  rosterDetails: {
    flex: 1,
  },
  rosterDetailRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  rosterDetailLabel: {
    width: 90,
  },
  rosterDetailColon: {
    width: 15,
    textAlign: 'center',
  },
  rosterDetailValue: {
    flex: 1,
  },
  footer: {
    marginTop: 30,
    alignItems: 'flex-end',
  },
  ttdBox: {
    width: 220,
    textAlign: 'left',
  },
  ttdNama: {
    marginTop: 60,
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  memerintahkan: {
    marginTop: 14,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  blockCenter: { alignItems: 'center' },
  subWrap: { marginLeft: 18 },
  subRow: { flexDirection: 'row', marginBottom: 4 },
  subNo: { width: 16 },
  subLabel: { width: 95 },
  subColon: { width: 10, textAlign: 'center' },
  subValue: { flex: 1 },
  ttdWrap: { marginTop: 25, alignItems: 'flex-end' },
  ttdDate: { textAlign: 'left' },
  ttdJabatan: { marginTop: 2 },
  ttdSpace: { height: 40 },
  ttdName: { fontWeight: 'bold', textDecoration: 'underline' },
  ttdPangkat: { marginTop: 2 },
  ttdNip: { marginTop: 2 }
})

export default function SuratTugasPdf(props: SuratTugasPdfProps): React.ReactElement<DocumentProps> {
  const { spj, suratTugas, roster } = props

  const lamaPerjalanan = spj.lamaPerjalanan || 1;
  const lamaText = spj.overrideLamaText || `${terbilangId(lamaPerjalanan)} hari, tanggal ${fmtDateId(spj.tglBerangkat)} s.d. tanggal ${fmtDateId(spj.tglKembali)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine="Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"
        />

        <View style={styles.blockCenter}>
          <Text style={styles.titleText}>SURAT TUGAS</Text>
          <Text style={styles.nomorText}>
            NOMOR : {spj.noSuratTugas || '.......................................................'}
          </Text>
        </View>

        <Text style={styles.memerintahkan}>MEMERINTAHKAN:</Text>

        <View style={styles.table}>
          {/* Kepada */}
          <View style={styles.row}>
            <Text style={styles.labelCol}>Kepada</Text>
            <Text style={styles.colonCol}>:</Text>

            <View style={styles.valueCol}>
              <View style={styles.subWrap}>
                {roster.map((r, idx) => (
                  <View key={r.id} style={{ marginBottom: 8 }}>
                    <View style={styles.subRow}>
                      <Text style={styles.subNo}>{idx + 1}</Text>
                      <Text style={styles.subLabel}>Nama</Text>
                      <Text style={styles.subColon}>:</Text>
                      <Text style={styles.subValue}>{r.nama}</Text>
                    </View>

                    <View style={styles.subRow}>
                      <Text style={styles.subNo} />
                      <Text style={styles.subLabel}>Pangkat/Gol</Text>
                      <Text style={styles.subColon}>:</Text>
                      <Text style={styles.subValue}>{fmtPangkatGol(r.pangkat, r.golongan)}</Text>
                    </View>

                    <View style={styles.subRow}>
                      <Text style={styles.subNo} />
                      <Text style={styles.subLabel}>NIP</Text>
                      <Text style={styles.subColon}>:</Text>
                      <Text style={styles.subValue}>{r.nip ?? '-'}</Text>
                    </View>

                    <View style={styles.subRow}>
                      <Text style={styles.subNo} />
                      <Text style={styles.subLabel}>Jabatan</Text>
                      <Text style={styles.subColon}>:</Text>
                      <Text style={styles.subValue}>{r.jabatan}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Untuk */}
          <View style={styles.row}>
            <Text style={styles.labelCol}>Untuk</Text>
            <Text style={styles.colonCol}>:</Text>
            <Text style={styles.valueCol}>{suratTugas.untuk}</Text>
          </View>

          {/* Tujuan */}
          <View style={styles.row}>
            <Text style={styles.labelCol}>Tujuan</Text>
            <Text style={styles.colonCol}>:</Text>
            <Text style={styles.valueCol}>{spj.tempatTujuan}</Text>
          </View>

          {/* Lamanya */}
          <View style={styles.row}>
            <Text style={styles.labelCol}>Lamanya</Text>
            <Text style={styles.colonCol}>:</Text>
            <Text style={styles.valueCol}>{lamaText}</Text>
          </View>

          {/* Beban Anggaran */}
          <View style={styles.row}>
            <Text style={styles.labelCol}>Beban Anggaran</Text>
            <Text style={styles.colonCol}>:</Text>
            <Text style={styles.valueCol}>{spj.akunAnggaran ?? '-'}</Text>
          </View>
        </View>

        <View style={styles.ttdWrap}>
          <View style={styles.ttdBox}>
            <Text style={styles.ttdDate}>
              {spj.kotaTandaTangan}, {'     '} {fmtMonthYear(spj.tglSuratTugas)}
            </Text>
            <Text style={styles.ttdJabatan}>{suratTugas.signerJabatan},</Text>
            <View style={styles.ttdSpace} />
            <Text style={styles.ttdName}>{suratTugas.signerNama}</Text>
            <Text style={styles.ttdPangkat}>{suratTugas.signerPangkatGolongan ?? '-'}</Text>
            <Text style={styles.ttdNip}>NIP. {suratTugas.signerNip ?? '-'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
