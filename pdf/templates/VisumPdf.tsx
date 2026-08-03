import React from 'react'
import { Document, Page, StyleSheet, Text, View, type DocumentProps } from '@react-pdf/renderer'
import '@/pdf/fonts'

export type Signer = {
  nama: string
  nip: string | null
  jabatan?: string | null
  jabatanTampil?: string | null
}

export type VisumSpj = {
  tempatBerangkat: string
  tempatTujuan: string
}

export type VisumPdfProps = {
  spj: VisumSpj
  stageCount: number
  signer: Signer | null
}

// ===== helpers
function roman(n: number) {
  const map: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII'
  }
  return map[n] ?? String(n)
}

function dots(len = 42) {
  return '.'.repeat(len)
}

function safeStageCount(n: number) {
  const x = Number.isFinite(n) ? Math.floor(n) : 4
  return Math.min(6, Math.max(1, x))
}

// ===== components
function Line() {
  return <View style={styles.hr} />
}

function RowField({ label, value, strongValue }: { label: string; value?: string; strongValue?: boolean }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldColon}>:</Text>
      <Text style={[styles.fieldValue, strongValue ? styles.bold : {}]}>{value ?? dots()}</Text>
    </View>
  )
}

function StageBlock({ no, leftTitle, rightTitle }: { no: number; leftTitle: string; rightTitle: string }) {
  return (
    <View style={styles.stageWrap}>
      <View style={styles.stageLeft}>
        <Text style={styles.stageNo}>{roman(no)}.</Text>
        <View style={[styles.stageContent, { justifyContent: 'space-between' }]}>
          <View>
            <RowField label={leftTitle} />
            <RowField label="Pada Tanggal" />
            <RowField label="Kepala" />
          </View>
          <View>
            <View style={styles.signSpaceMini} />
            <View style={styles.signatureLine} />
            <Text style={styles.nipLabel2}>NIP.</Text>
          </View>
        </View>
      </View>

      <View style={styles.vline} />

      <View style={styles.stageRight}>
        <View style={[styles.stageContent, { justifyContent: 'space-between' }]}>
          <View>
            <RowField label={rightTitle} />
            <RowField label="Ke" />
            <RowField label="Pada Tanggal" />
            <RowField label="Kepala" />
          </View>
          <View>
            <View style={styles.signSpaceMini} />
            <View style={styles.signatureLine} />
            <Text style={styles.nipLabel2}>NIP.</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default function VisumPdf(props: VisumPdfProps): React.ReactElement<DocumentProps> {
  const stageCount = safeStageCount(props.stageCount)

  const signerName = props.signer?.nama ?? ''
  const signerNip = props.signer?.nip ?? ''

  const signerJabatanRaw = (props.signer?.jabatanTampil ?? props.signer?.jabatan ?? '').trim()
  const signerJabatanLabel = signerJabatanRaw ? `${signerJabatanRaw},` : ''

  const repeatedStages = Array.from({ length: stageCount }).map((_, i) => 2 + i)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.outerBox}>
          <Line />

          <View style={styles.stageWrapI}>
            <View style={styles.stageLeft}>
              <Text style={styles.stageNo}>{/* kosong */}</Text>
              <View style={styles.stageContent} />
            </View>

            <View style={styles.vline} />

            <View style={styles.stageRight}>
              <Text style={styles.stageNo}>{roman(1)}.</Text>
              <View style={styles.stageContent}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Berangkat Dari</Text>
                  <Text style={styles.fieldColon}>:</Text>
                  <Text style={[styles.fieldValue, styles.bold]}>{props.spj.tempatBerangkat}</Text>
                </View>
                <View style={[styles.fieldRow, { marginBottom: 4 }]}>
                  <Text style={{ width: 100 }}>(Tempat Kedudukan)</Text>
                  <Text style={styles.fieldColon}></Text>
                  <Text style={styles.fieldValue}></Text>
                </View>

                <RowField label="Ke" value={props.spj.tempatTujuan || dots()} />
                <RowField label="Pada Tanggal" />

                <Text style={styles.iSignerLabel}>{signerJabatanLabel || dots()}</Text>

                <View style={styles.signSpaceI} />

                <Text style={styles.signerName}>{signerName}</Text>
                <Text style={styles.signerNip}>NIP. {signerNip}</Text>
              </View>
            </View>
          </View>

          <Line />

          {repeatedStages.map((n) => (
            <React.Fragment key={n}>
              <StageBlock no={n} leftTitle="Tiba di" rightTitle="Berangkat Dari" />
              <Line />
            </React.Fragment>
          ))}

          <View style={styles.stageWrap}>
            <View style={styles.stageLeft}>
              <Text style={styles.stageNo}>{roman(stageCount + 2)}.</Text>
              <View style={styles.stageContent}>
                <RowField label="Tiba di" value={props.spj.tempatBerangkat} strongValue />
                <RowField label="Pada Tanggal" />

                <RowField label="Pejabat yang memberi perintah" value={signerJabatanLabel || dots()} />

                <View style={styles.signSpaceVI} />

                <Text style={styles.signerName}>{signerName}</Text>
                <Text style={styles.signerNip}>NIP. {signerNip}</Text>
              </View>
            </View>

            <View style={styles.vline} />

            <View style={styles.stageRight}>
              <View style={styles.stageContent}>
                <Text style={styles.paragraph}>
                  Telah diperiksa, dengan keterangan bahwa perjalanan tersebut diatas benar dilakukan atas perintahnya
                  dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.
                </Text>
              </View>
            </View>
          </View>

          <Line />

          <View style={styles.footerBlock}>
            <View style={styles.footerRow}>
              <Text style={styles.footerNo}>{roman(stageCount + 3)}.</Text>
              <Text style={styles.footerLabel}>Catatan Lain-lain</Text>
              <Text style={styles.footerColon}>:</Text>
              <Text style={styles.footerValue}>{dots(70)}</Text>
            </View>

            <View style={[styles.footerRow, { marginTop: 6 }]}>
              <Text style={styles.footerNo}>{roman(stageCount + 4)}.</Text>
              <Text style={styles.footerLabel}>PERHATIAN</Text>
              <Text style={styles.footerColon}>:</Text>
              <View style={styles.perhatianBox}>
                <Text style={styles.perhatianText}>
                  PPK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan
                  tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan
                  Keuangan Negara apabila negara menderita rugi akibat kesalahan, kelalaian, dan kealpaannya.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ===== styles
const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 28,
    fontSize: 9.5,
    lineHeight: 1.25,
    fontFamily: 'Helvetica'
  },

  outerBox: {
    borderWidth: 1,
    borderColor: '#000'
  },

  hr: {
    height: 1,
    backgroundColor: '#000'
  },

  stageWrap: {
    flexDirection: 'row',
    minHeight: 90
  },

  stageWrapI: {
    flexDirection: 'row',
    minHeight: 120
  },

  stageLeft: {
    width: '50%',
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10
  },

  stageRight: {
    width: '50%',
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10
  },

  vline: {
    width: 1,
    backgroundColor: '#000'
  },

  stageNo: {
    width: 18,
    fontSize: 9.5
  },

  stageNoInline: {
    width: 18,
    fontSize: 9.5
  },

  stageContent: {
    flex: 1
  },

  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  fieldLabel: {
    width: 78
  },
  fieldColon: {
    width: 10,
    textAlign: 'center'
  },
  fieldValue: {
    flex: 1
  },

  nipLabel: {
    marginTop: 10
  },
  nipLabel2: {
    marginTop: 8,
    fontSize: 9
  },
  signatureLine: {
    borderBottomWidth: 0.5,
    borderColor: '#000',
    marginTop: 32,
    width: '100%',
  },

  bold: { fontWeight: 700 },

  iHeaderRow: {
    flexDirection: 'row',
  },
  iHeaderText: {
    flex: 1
  },
  iSignerLabel: {
    marginTop: 4,
    marginBottom: 4
  },

  signSpaceI: {
    height: 36
  },

  signerName: {
    fontWeight: 700
  },
  signerNip: {
    marginTop: 2
  },

  signSpaceMini: {
    height: 18
  },


  signSpaceVI: {
    height: 36
  },

  paragraph: {
    fontSize: 9,
    textAlign: 'justify'
  },

  footerBlock: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  footerNo: { width: 18 },
  footerLabel: { width: 100 },
  footerColon: { width: 10, textAlign: 'center' },
  footerValue: { flex: 1 },

  perhatianBox: {
    flex: 1
  },
  perhatianText: {
    fontSize: 9,
    textAlign: 'justify'
  }
})
