 
import React from 'react'
import { Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import KopSurat from '@/pdf/components/kop-surat'
import { formatWita } from '@/lib/date-utils'
import '@/pdf/fonts'

function fmtDateId(date: Date | undefined | null) {
  if (!date) return '-'
  return formatWita(date, 'dd MMMM yyyy')
}

export type RosterItemPdf = {
  order: number
  role: 'KEPALA_JALAN' | 'PENGIKUT'
  nama: string
  nip: string | null
  jabatan: string
  pangkat: string | null
  golongan: string | null
}

export type TelaahanPdfData = {
  kepada: string | null
  sifat: string | null
  lampiran: string | null
  perihal: string | null
  dasar: string | null
  praAnggapan: string[]
  fakta: string[]
  analisis: string | null
  kesimpulan: string | null
  saran: string | null
  tglTelaahan: Date | undefined
}

export type SpjPdfData = {
  kotaTandaTangan: string
  tglSuratTugas: Date
  noTelaahan?: string | null
}

export type TelaahanSigner = {
  nama: string
  nip?: string | null
  jabatan?: string | null
  pangkat?: string | null
  golongan?: string | null
  jabatanTampil?: string | null
} | null

// Konfigurasi dinamis (hasil dari Editor Modal)
export type TelaahanStafConfig = {
  styles?: {
    marginTop?: number
    marginBottom?: number
    marginHorizontal?: number
    fontSize?: number
    lineHeight?: number
  }
  content?: Partial<TelaahanPdfData> & { 
    dariOverride?: string;
    namaOverride?: string;
    nipOverride?: string;
    pangkatOverride?: string;
  }
}

export type TelaahanStafPdfProps = {
  spj: SpjPdfData
  telaahan: TelaahanPdfData
  roster: RosterItemPdf[]
  signer?: TelaahanSigner
  instansiLine1?: string
  instansiLine2?: string
  alamatLine?: string
  config?: TelaahanStafConfig
}

function splitParagraphs(text: string) {
  return text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function fmtPangkatGolongan(pangkat: string | null, golongan: string | null) {
  const p = (pangkat ?? '').trim()
  const g = (golongan ?? '').trim()
  if (p && /\([^)]+\)/.test(p)) return p
  if (p && !g) return p
  if (p && g) return `${p} (${g})`
  if (!p && g) return g
  return '-'
}

export function buildTelaahanStafDocument(props: TelaahanStafPdfProps): React.ReactElement<DocumentProps> {
  const {
    spj,
    telaahan: baseTelaahan,
    roster,
    signer,
    instansiLine1 = 'PEMERINTAH KABUPATEN KUTAI BARAT',
    instansiLine2 = 'SEKRETARIAT DAERAH',
    alamatLine = 'Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id',
    config
  } = props

  // Merge konten dasar dengan override dari config
  const telaahan = { ...baseTelaahan, ...(config?.content || {}) }

  const kepadaYth = telaahan.kepada ?? 'Sekretaris Daerah Kabupaten Kutai Barat'
  const dari = signer?.jabatanTampil || signer?.jabatan || config?.content?.dariOverride || 'Kepala Bagian Organisasi'
  
  const tanggal = telaahan.tglTelaahan ? fmtDateId(new Date(telaahan.tglTelaahan)) : '-'
  const nomor = spj.noTelaahan ?? ''
  const lampiran = telaahan.lampiran ?? '-'
  const perihal = telaahan.perihal ?? '-'

  const dasarParas = splitParagraphs(telaahan.dasar ?? '')
  const analisisParas = splitParagraphs(telaahan.analisis ?? '')
  const kesimpulanParas = splitParagraphs(telaahan.kesimpulan ?? '')
  const saranParas = splitParagraphs(telaahan.saran ?? '')

  const signerNama = config?.content?.namaOverride || signer?.nama || 'NAMA PENANDATANGAN'
  const signerNip = config?.content?.nipOverride || signer?.nip || '-------------------'
  const signerPangkat = config?.content?.pangkatOverride || fmtPangkatGolongan(signer?.pangkat ?? null, signer?.golongan ?? null)

  // Dynamic Styles
  const pageMarginTop = config?.styles?.marginTop ?? 28
  const pageMarginBottom = config?.styles?.marginBottom ?? 32
  const pageMarginHorizontal = config?.styles?.marginHorizontal ?? 40
  const globalFontSize = config?.styles?.fontSize ?? 11
  const globalLineHeight = config?.styles?.lineHeight ?? 1

  const styles = StyleSheet.create({
    page: {
      paddingTop: pageMarginTop,
      paddingBottom: pageMarginBottom,
      paddingHorizontal: pageMarginHorizontal,
      fontSize: globalFontSize,
      lineHeight: globalLineHeight,
      fontFamily: 'Helvetica'
    },
    headerRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    metaBlock: {
      marginTop: 10,
      marginBottom: 10
    },
    metaRow: {
      flexDirection: 'row',
      marginBottom: 2.5
    },
    metaLabel: { width: 80, lineHeight: globalLineHeight * 0.9 },
    metaColon: { width: 10, textAlign: 'center', lineHeight: globalLineHeight * 0.9 },
    metaValue: { flex: 1, lineHeight: globalLineHeight * 0.9 },
    sectionTitle: {
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 6
    },
    paragraph: {
      textAlign: 'justify',
      marginLeft: 16,
      marginRight: 6,
      marginBottom: 6,
      textIndent: 32,
      lineHeight: globalLineHeight
    },
    listItem: {
      flexDirection: 'row',
      marginLeft: 32,
      marginRight: 6,
      marginBottom: 4
    },
    listNo: {
      width: 16,
      lineHeight: globalLineHeight
    },
    listText: {
      flex: 1,
      textAlign: 'justify',
      lineHeight: globalLineHeight
    },
    paragraphNoIndent: {
      textAlign: 'justify',
      marginLeft: 16,
      marginRight: 6,
      marginBottom: 6,
      lineHeight: globalLineHeight
    },
    rosterIntro: {
      marginLeft: 32,
      marginRight: 6,
      marginBottom: 8,
      textAlign: 'justify',
      lineHeight: globalLineHeight
    },
    personBlock: {
      marginLeft: 34,
      marginBottom: 8
    },
    personRow: {
      flexDirection: 'row',
      marginBottom: 2.5
    },
    personNo: {
      width: 16,
      fontWeight: 'bold'
    },
    personContent: {
      flex: 1
    },
    personLine: {
      flexDirection: 'row',
      marginBottom: 2
    },
    personLabel: { width: 95, lineHeight: globalLineHeight },
    personColon: { width: 10, textAlign: 'center', lineHeight: globalLineHeight },
    personValue: { flex: 1, lineHeight: globalLineHeight },
    closing: {
      marginTop: 8,
      marginLeft: 16,
      marginRight: 6,
      textAlign: 'justify',
      lineHeight: globalLineHeight
    },
    signerWrap: {
      marginTop: 18,
      alignItems: 'flex-end'
    },
    signerBox: {
      width: 240
    },
    signerJabatan: {
      textAlign: 'center',
      marginBottom: 2
    },
    signerSpace: {
      height: 55
    },
    signerName: {
      textAlign: 'center',
      fontWeight: 'bold',
      textDecoration: 'underline',
      textTransform: 'uppercase',
      lineHeight: 1
    },
    signerPangkat: {
      textAlign: 'center',
      lineHeight: 1
    },
    signerNip: {
      textAlign: 'center',
      lineHeight: 1
    }
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <KopSurat
          title="TELAAHAN STAF"
          instansiLine1={instansiLine1}
          instansiLine2={instansiLine2}
          alamatLine={alamatLine}
        />

        <View>
          {/* ===== META ===== */}
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Kepada Yth</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{kepadaYth}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Dari</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{dari}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Tanggal</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{tanggal}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Nomor</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{nomor}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Lampiran</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{lampiran}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Perihal</Text>
              <Text style={styles.metaColon}>:</Text>
              <Text style={styles.metaValue}>{perihal}</Text>
            </View>
          </View>

          {/* Dynamic Section Rendering */}
          {(() => {
            let sectionIndex = 0;
            const getSectionLetter = () => String.fromCharCode(65 + sectionIndex++);

            const renderSectionText = (title: string, paras: string[]) => {
              if (paras.length === 0) return null;
              const letter = getSectionLetter();
              return (
                <React.Fragment key={title}>
                  <View wrap={false}>
                    <Text style={styles.sectionTitle}>{letter}. {title}</Text>
                    <Text style={styles.paragraph}>{paras[0]}</Text>
                  </View>
                  {paras.slice(1).map((p, i) => (
                    <Text key={`${title}-extra-${i}`} style={styles.paragraph}>
                      {p}
                    </Text>
                  ))}
                </React.Fragment>
              );
            };

            const renderSectionList = (title: string, items: string[] | null | undefined) => {
              if (!items || items.length === 0) return null;
              if (items.length === 1) {
                return renderSectionText(title, items);
              }
              const letter = getSectionLetter();
              return (
                <React.Fragment key={title}>
                  <View wrap={false}>
                    <Text style={styles.sectionTitle}>{letter}. {title}</Text>
                    <View style={styles.listItem}>
                      <Text style={styles.listNo}>1.</Text>
                      <Text style={styles.listText}>{items[0]}</Text>
                    </View>
                  </View>
                  {items.slice(1).map((v, i) => (
                    <View key={`${title}-${i}`} style={styles.listItem}>
                      <Text style={styles.listNo}>{`${i + 2}.`}</Text>
                      <Text style={styles.listText}>{v}</Text>
                    </View>
                  ))}
                </React.Fragment>
              );
            };

            return (
              <>
                {renderSectionText("Dasar", dasarParas)}
                {renderSectionList("Pra Anggapan", telaahan.praAnggapan)}
                {renderSectionList("Fakta - Fakta yang Memengaruhi", telaahan.fakta)}
                {renderSectionText("Analisis", analisisParas)}
                {renderSectionText("Kesimpulan", kesimpulanParas)}
                
                {/* Saran/Tindakan is always shown */}
                {saranParas.length > 0 ? (
                  renderSectionText("Saran/Tindakan", saranParas)
                ) : (
                  <View wrap={false}>
                    <Text style={styles.sectionTitle}>{getSectionLetter()}. Saran/Tindakan</Text>
                    <Text style={[styles.rosterIntro, styles.paragraph]}>
                      Sehubungan dengan kegiatan di maksud maka kami mengusulkan pegawai yang akan mengikuti kegiatan tersebut adalah:
                    </Text>
                  </View>
                )}
              </>
            );
          })()}

          {/* Roster block */}
          {roster.length
            ? roster.map((r, idx) => (
                <View key={`person-${r.order}-${r.nama}`} style={styles.personBlock} wrap={false}>
                  <View style={styles.personRow}>
                    <Text style={styles.personNo}>{`${idx + 1}`}</Text>
                    <View style={styles.personContent}>
                      <View style={styles.personLine}>
                        <Text style={styles.personLabel}>Nama</Text>
                        <Text style={styles.personColon}>:</Text>
                        <Text style={styles.personValue}>{r.nama}</Text>
                      </View>
                      <View style={styles.personLine}>
                        <Text style={styles.personLabel}>NIP</Text>
                        <Text style={styles.personColon}>:</Text>
                        <Text style={styles.personValue}>{r.nip ?? '-'}</Text>
                      </View>
                      <View style={styles.personLine}>
                        <Text style={styles.personLabel}>Pangkat / Golongan</Text>
                        <Text style={styles.personColon}>:</Text>
                        <Text style={styles.personValue}>{fmtPangkatGolongan(r.pangkat, r.golongan)}</Text>
                      </View>
                      <View style={styles.personLine}>
                        <Text style={styles.personLabel}>Jabatan</Text>
                        <Text style={styles.personColon}>:</Text>
                        <Text style={styles.personValue}>{r.jabatan}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            : null}

          <View wrap={false}>
            <Text style={styles.closing}>
              Demikian telaahan staf ini disampaikan, atas perkenan Bapak diucapkan terima kasih.
            </Text>

            {/* ===== SIGNATURE ===== */}
            <View style={styles.signerWrap}>
              <View style={styles.signerBox}>
                <Text style={styles.signerJabatan}>{dari},</Text>
                <View style={styles.signerSpace} />
                <Text style={styles.signerName}>{signerNama}</Text>
                <Text style={styles.signerPangkat}>{signerPangkat}</Text>
                <Text style={styles.signerNip}>NIP. {signerNip}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default function TelaahanStafPdf(props: TelaahanStafPdfProps) {
  return buildTelaahanStafDocument(props)
}
