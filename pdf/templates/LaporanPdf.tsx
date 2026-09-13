import React from 'react'
import { Document, Page, StyleSheet, Text, View, type DocumentProps } from '@react-pdf/renderer'
import KopSurat from '@/pdf/components/kop-surat'
import { formatWita } from '@/lib/date-utils'
import '@/pdf/fonts'
import type { PdfConfig } from '@/components/pdf/PdfPreviewModal'

export type LaporanHasilMode = 'POINTS' | 'NARRATIVE'

type RosterItem = {
  id: string
  order: number
  role: 'KEPALA_JALAN' | 'PENGIKUT'
  nama: string
  nip: string | null
  jabatan: string
  pangkat: string | null
  golongan: string | null
  instansi: string | null
}

export type Laporan = {
  dasarLaporan: string | null
  kegiatan: string | null
  waktu: string | null
  lokasi: string | null
  tujuan: string | null

  penandatanganId?: string | null
  signerNama: string | null
  signerNip: string | null
  signerJabatan: string | null
  signerPangkat: string | null
  signerGolongan: string | null
  signerJabatanTampil: string | null

  excludeMengetahui?: boolean

  hasilMode: LaporanHasilMode
  hasilPembuka: string | null
  hasilPoin: string[]
  hasilNarasi: string | null
}

export type LaporanPdfProps = {
  spj: {
    noSuratTugas: string | null
    tglBerangkat?: Date | string | null
    tglKembali?: Date | string | null
  }
  roster: RosterItem[]
  laporan: Laporan | null
  config?: PdfConfig
}

function sortRoster(list: RosterItem[]) {
  return [...list].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'KEPALA_JALAN' ? -1 : 1
    return a.order - b.order
  })
}

function safeText(s?: string | null, fallback = '-') {
  const t = (s ?? '').trim()
  return t.length ? t : fallback
}

function fmtPangkatGol(pangkat: string | null, gol: string | null) {
  const p = (pangkat ?? '').trim()
  const g = (gol ?? '').trim()
  if (p && g) return `${p} (${g})`
  if (p) return p
  if (g) return g
  return ''
}

function dots(len = 12) {
  return '.'.repeat(len)
}

function normalizeMultiline(s: string) {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
}

function normalizeOneLine(s: string) {
  return normalizeMultiline(s).replace(/\s+/g, ' ').trim().toLowerCase()
}

function formatRentangWaktu(tglA?: Date | string | null, tglB?: Date | string | null): string {
  if (!tglA && !tglB) return ''
  const strA = tglA ? formatWita(tglA, 'dd MMMM yyyy') : ''
  const strB = tglB ? formatWita(tglB, 'dd MMMM yyyy') : ''

  if (strA && strB) {
    if (strA === strB) return strA
    return `${strA} s.d. ${strB}`
  }
  return strA || strB || ''
}

export default function LaporanPdf(props: LaporanPdfProps): React.ReactElement<DocumentProps> {
  const rosterSorted = sortRoster(props.roster ?? [])
  const laporan = props.laporan
  const config = props.config

  const dasar = safeText(
    config?.content?.dasarLaporan ?? laporan?.dasarLaporan ?? (props.spj.noSuratTugas ? `Surat Tugas Nomor ${props.spj.noSuratTugas}` : null),
    '-'
  )

  const kegiatanRaw = (config?.content?.kegiatan ?? laporan?.kegiatan ?? '').trim()
  const kegiatan = safeText(kegiatanRaw, '-')
  
  // Ambil waktu dari rentang perjalanan di master SPJ (a-b, jika sama maka a saja)
  const masterRentangWaktu = formatRentangWaktu(props.spj.tglBerangkat, props.spj.tglKembali)
  let waktu = config?.content?.waktu || masterRentangWaktu
  if (!waktu && laporan?.waktu) {
    try {
      waktu = formatWita(laporan.waktu, 'dd MMMM yyyy')
    } catch {
      waktu = laporan.waktu
    }
  }
  waktu = safeText(waktu, '-')

  const lokasi = safeText(config?.content?.lokasi ?? laporan?.lokasi, '-')
  const tujuan = safeText(config?.content?.tujuan ?? laporan?.tujuan, '-')

  const hasilMode = laporan?.hasilMode ?? 'POINTS'
  const hasilNarasi = normalizeMultiline(safeText(config?.content?.hasilNarasi ?? laporan?.hasilNarasi, ''))

  const pembukaManual = normalizeMultiline(safeText(config?.content?.hasilPembuka ?? laporan?.hasilPembuka, ''))
  const pembukaAuto =
    kegiatanRaw.length > 0
      ? `Setelah melakukan kegiatan ${kegiatanRaw}, maka dapat disimpulkan sebagai berikut:`
      : `Setelah melakukan kegiatan, maka dapat disimpulkan sebagai berikut:`

  const manualIsSameAsAuto = normalizeOneLine(pembukaManual) === normalizeOneLine(pembukaAuto)
  const pembukaFinal =
    pembukaManual.length > 0 && !manualIsSameAsAuto
      ? pembukaManual
      : hasilMode === 'POINTS'
        ? pembukaAuto
        : pembukaManual

  // Penandatangan (Signer) logic
  const signerNama = safeText(config?.content?.signerNama ?? laporan?.signerNama, '')
  const signerNip = safeText(config?.content?.signerNip ?? laporan?.signerNip, '')
  const signerJabatanRaw = (config?.content?.signerJabatanTampil || config?.content?.signerJabatan || laporan?.signerJabatanTampil || laporan?.signerJabatan || '').trim()
  const signerJabatanLabel = signerJabatanRaw ? `${signerJabatanRaw},` : ''
  const signerPangkatGol = fmtPangkatGol(laporan?.signerPangkat ?? null, laporan?.signerGolongan ?? null)

  const excludeMengetahui = laporan?.excludeMengetahui ?? false

  // Dynamic Styles from config
  const pageMarginTop = config?.styles?.marginTop ?? 28
  const pageMarginBottom = config?.styles?.marginBottom ?? 32
  const pageMarginHorizontal = config?.styles?.marginHorizontal ?? 40
  const globalFontSize = config?.styles?.fontSize ?? 11
  const globalLineHeight = config?.styles?.lineHeight ?? 1.4

  const styles = StyleSheet.create({
    page: {
      paddingTop: pageMarginTop,
      paddingBottom: pageMarginBottom,
      paddingHorizontal: pageMarginHorizontal,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight,
      fontFamily: 'Helvetica'
    },
    titleWrap: {
      marginTop: -4,
      alignItems: 'center',
      marginBottom: 10
    },
    titleHeader: {
      fontSize: globalFontSize + 1,
      fontWeight: 700,
      textTransform: 'uppercase',
      textAlign: 'center',
      lineHeight: 1.2
    },
    titleObject: {
      fontSize: globalFontSize,
      fontWeight: 'normal',
      textTransform: 'uppercase',
      textAlign: 'center',
      marginTop: 3,
      maxWidth: 440,
      lineHeight: 1.25
    },
    sectionWrap: {
      marginTop: 10
    },
    sectionHeading: {
      fontSize: globalFontSize,
      fontWeight: 700,
      marginBottom: 4
    },
    subItemBlock: {
      marginLeft: 16,
      marginBottom: 6
    },
    subItemTitle: {
      fontSize: globalFontSize,
      lineHeight: globalLineHeight,
      fontWeight: 700
    },
    subItemContent: {
      marginLeft: 16,
      marginTop: 2,
      textAlign: 'justify',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    paragraph: {
      textAlign: 'justify',
      marginLeft: 16,
      marginBottom: 6,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    kvTable: {
      marginLeft: 16,
      marginTop: 2,
      marginBottom: 4
    },
    kvRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 3
    },
    kvLabel: {
      width: 140,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    kvColon: {
      width: 12,
      textAlign: 'center',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    kvValue: {
      flex: 1,
      textAlign: 'justify',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    pointsContainer: {
      marginLeft: 16,
      marginTop: 4
    },
    pointRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 6
    },
    pointNo: {
      width: 18,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    pointText: {
      flex: 1,
      textAlign: 'justify',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    signWrap: {
      marginTop: 28,
      flexDirection: 'row',
      justifyContent: excludeMengetahui ? 'flex-end' : 'space-between',
      break: false
    },
    signColLeft: {
      width: '45%'
    },
    signColRight: {
      width: '50%'
    },
    signDateRow: {
      marginBottom: 2
    },
    signLabel: {
      fontSize: globalFontSize,
      minHeight: 14,
      lineHeight: globalLineHeight
    },
    rosterLabel: {
      fontSize: globalFontSize,
      minHeight: 14,
      lineHeight: globalLineHeight,
      marginLeft: excludeMengetahui ? 0 : -35
    },
    signSpace: {
      height: 48
    },
    signName: {
      fontSize: globalFontSize,
      fontWeight: 700,
      textDecoration: 'underline',
      lineHeight: 1.1
    },
    signSub: {
      marginTop: 1,
      fontSize: Math.max(8, globalFontSize - 1),
      lineHeight: 1.2
    },
    execRow: {
      flexDirection: 'row',
      marginBottom: 10,
      minHeight: 20,
      alignItems: 'center'
    },
    execNo: {
      width: 15,
      fontSize: Math.max(8, globalFontSize - 1),
      marginLeft: excludeMengetahui ? 0 : -35
    },
    execContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    execName: {
      fontSize: Math.max(8, globalFontSize - 1),
      maxWidth: 160,
      overflow: 'hidden'
    },
    execDotsWrapper: {
      width: 100
    },
    execDotsLeft: {
      paddingLeft: 0
    },
    execDotsRight: {
      paddingLeft: 50
    },
    execDotsText: {
      fontSize: Math.max(8, globalFontSize - 1)
    }
  })

  function PointsBlock({ points }: { points: string[] }) {
    const cleaned = (points ?? []).map((x) => normalizeMultiline(String(x || ''))).filter(Boolean)
    if (cleaned.length === 0) return <Text style={styles.paragraph}>-</Text>

    return (
      <View style={styles.pointsContainer}>
        {cleaned.map((p, idx) => (
          <View key={idx} style={styles.pointRow}>
            <Text style={styles.pointNo}>{idx + 1}.</Text>
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Kop Surat Tetap Dipertahankan */}
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine="Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"
        />

        {/* Format Judul Tata Naskah Dinas: LAPORAN [KEGIATAN] */}
        <View style={styles.titleWrap}>
          <Text style={styles.titleHeader}>LAPORAN</Text>
          <Text style={styles.titleObject}>{kegiatanRaw.toUpperCase() || 'PELAKSANAAN PERJALANAN DINAS'}</Text>
        </View>

        {/* A. PENDAHULUAN */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>A. Pendahuluan</Text>

          {/* 1. Umum / Latar Belakang */}
          <View style={styles.subItemBlock}>
            <Text style={styles.subItemTitle}>1. Umum / Latar Belakang</Text>
            <Text style={styles.subItemContent}>
              Dalam rangka pelaksanaan tugas dan fungsi kedinasan, telah dilaksanakan perjalanan dinas untuk {kegiatan.toLowerCase().startsWith('melakukan') || kegiatan.toLowerCase().startsWith('mengikuti') || kegiatan.toLowerCase().startsWith('menghadiri') ? kegiatan : `pelaksanaan ${kegiatan}`}.
            </Text>
          </View>

          {/* 2. Landasan Hukum */}
          <View style={styles.subItemBlock}>
            <Text style={styles.subItemTitle}>2. Landasan Hukum</Text>
            <Text style={styles.subItemContent}>
              {dasar}
            </Text>
          </View>

          {/* 3. Maksud dan Tujuan */}
          <View style={styles.subItemBlock}>
            <Text style={styles.subItemTitle}>3. Maksud dan Tujuan</Text>
            <Text style={styles.subItemContent}>
              Maksud dan tujuan dilaksanakannya kegiatan ini adalah untuk {kegiatan} dengan tujuan ke {tujuan}.
            </Text>
          </View>
        </View>

        {/* B. KEGIATAN YANG DILAKSANAKAN */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>B. Kegiatan yang Dilaksanakan</Text>
          <View style={styles.kvTable}>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>1. Waktu Pelaksanaan</Text>
              <Text style={styles.kvColon}>:</Text>
              <Text style={styles.kvValue}>{waktu || '-'}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>2. Tempat / Lokasi</Text>
              <Text style={styles.kvColon}>:</Text>
              <Text style={styles.kvValue}>{lokasi}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>3. Kota / Daerah Tujuan</Text>
              <Text style={styles.kvColon}>:</Text>
              <Text style={styles.kvValue}>{tujuan}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>4. Uraian Kegiatan</Text>
              <Text style={styles.kvColon}>:</Text>
              <Text style={styles.kvValue}>{kegiatan}</Text>
            </View>
          </View>
        </View>

        {/* C. HASIL YANG DICAPAI */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>C. Hasil yang Dicapai</Text>

          {pembukaFinal ? (
            <Text style={styles.paragraph}>{pembukaFinal}</Text>
          ) : null}

          {hasilMode === 'POINTS' ? (
            <PointsBlock points={laporan?.hasilPoin ?? []} />
          ) : null}

          {hasilMode === 'NARRATIVE' ? (
            <Text style={[styles.paragraph, { marginTop: pembukaFinal ? 4 : 0 }]}>
              {hasilNarasi || '-'}
            </Text>
          ) : null}
        </View>

        {/* D. PENUTUP */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>D. Penutup</Text>
          <Text style={styles.paragraph}>
            Demikian laporan perjalanan dinas ini dibuat dan disampaikan sebagai bahan pertanggungjawaban pelaksanaan tugas serta bahan tindak lanjut sebagaimana mestinya.
          </Text>
        </View>

        {/* ===== Signatures Area ===== */}
        <View style={styles.signWrap} wrap={false}>
          {/* Sisi Kiri: Pejabat Penandatangan / Mengetahui (Kecuali jika dieksklusi) */}
          {!excludeMengetahui && (
            <View style={styles.signColLeft}>
              <Text style={styles.signLabel}>Mengetahui,</Text>
              <Text style={styles.signLabel}>{signerJabatanLabel}</Text>
              <View style={styles.signSpace} />
              <Text style={styles.signName}>{signerNama}</Text>
              {signerPangkatGol ? <Text style={styles.signSub}>{signerPangkatGol}</Text> : null}
              {signerNip ? <Text style={styles.signSub}>NIP. {signerNip}</Text> : null}
            </View>
          )}

          {/* Sisi Kanan: Yang Melaksanakan Tugas */}
          <View style={styles.signColRight}>
            <Text style={styles.rosterLabel}>Yang Melaksanakan Tugas,</Text>

            <View style={{ marginTop: 8 }}>
              {rosterSorted.map((r, idx) => (
                <View key={r.id} style={styles.execRow}>
                  {/* Nomor urut */}
                  <Text style={styles.execNo}>{idx + 1}.</Text>

                  {/* Container untuk Nama dan Titik-titik */}
                  <View style={styles.execContent}>
                    <Text style={styles.execName}>{safeText(r.nama, '-')}</Text>

                    {/* Titik-titik zig-zag */}
                    <View style={[styles.execDotsWrapper, idx % 2 === 0 ? styles.execDotsLeft : styles.execDotsRight]}>
                      <Text style={styles.execDotsText}>: {dots(14)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

