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
  
  // Custom format date if time is provided
  let waktu = '';
  const waktuRaw = config?.content?.waktu ?? laporan?.waktu;
  if (waktuRaw) {
    try {
      waktu = formatWita(waktuRaw, 'dd MMMM yyyy');
    } catch {
      waktu = waktuRaw;
    }
  }

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
  const globalLineHeight = config?.styles?.lineHeight ?? 1.35

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
      marginTop: -8,
      alignItems: 'center',
      marginBottom: 2
    },
    title: {
      fontSize: globalFontSize,
      fontWeight: 700,
      textTransform: 'uppercase',
      textDecoration: 'underline'
    },
    metaWrap: {
      marginTop: 10
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 2
    },
    metaLabel: {
      width: 150,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    metaColon: {
      width: 10,
      textAlign: 'center',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    metaValue: {
      flex: 1,
      textAlign: 'justify',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 4
    },
    sectionValue: {
      flex: 1
    },
    bodyText: {
      fontSize: globalFontSize,
      lineHeight: globalLineHeight * 1.1,
      textAlign: 'justify'
    },
    paragraph: {
      textAlign: 'justify',
      textIndent: 28
    },
    pointRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 3
    },
    pointNo: {
      width: 14,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight * 1.1
    },
    pointText: {
      flex: 1,
      textAlign: 'justify',
      fontSize: globalFontSize,
      lineHeight: globalLineHeight * 1.1
    },
    signWrap: {
      marginTop: 36,
      flexDirection: 'row',
      justifyContent: excludeMengetahui ? 'flex-end' : 'space-between',
      break: false
    },
    signColLeft: {
      width: '45%'
    },
    signColRight: {
      width: excludeMengetahui ? '50%' : '50%'
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
      marginLeft: excludeMengetahui ? 0 : -40
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
      marginLeft: excludeMengetahui ? 0 : -40
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

  function MetaRow({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaColon}>:</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    )
  }

  function PointsBlock({ points }: { points: string[] }) {
    const cleaned = (points ?? []).map((x) => normalizeMultiline(String(x || ''))).filter(Boolean)
    if (cleaned.length === 0) return <Text style={styles.bodyText}>-</Text>

    return (
      <View style={{ marginTop: 2 }}>
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
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine="Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"
        />

        <View style={styles.titleWrap}>
          <Text style={styles.title}>LAPORAN PERJALANAN DINAS</Text>
        </View>

        <View style={styles.metaWrap}>
          <MetaRow label="Dasar Laporan" value={dasar} />
          <MetaRow label="Kegiatan Yang Di Lakukan" value={kegiatan} />
          <MetaRow label="Waktu" value={waktu} />
          <MetaRow label="1. Lokasi" value={lokasi} />
          <MetaRow label="2. Tujuan" value={tujuan} />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.metaLabel}>3. Hasil Pelaksanaan</Text>
          <Text style={styles.metaColon}>:</Text>

          <View style={styles.sectionValue}>
            {pembukaFinal ? <Text style={styles.bodyText}>{pembukaFinal}</Text> : null}
            {hasilMode === 'POINTS' ? <PointsBlock points={laporan?.hasilPoin ?? []} /> : null}
            {hasilMode === 'NARRATIVE' ? (
              <Text style={[styles.bodyText, { marginTop: pembukaFinal ? 6 : 0 }]}>{hasilNarasi || '-'}</Text>
            ) : null}
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={[styles.bodyText, styles.paragraph]}>
            Demikian laporan Perjalanan Dinas ini kami sampaikan untuk bahan pertanggungjawaban kerja sesuai dengan
            bidang tugas dan untuk bahan tindak lanjut bagaimana mestinya.
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

