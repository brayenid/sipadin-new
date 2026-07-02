import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import KopSurat from '@/pdf/components/kop-surat'
import { formatWita } from '@/lib/date-utils'
import '@/pdf/fonts'

function fmtDateId(date: Date | undefined | null) {
  if (!date) return '-'
  return formatWita(date, 'dd MMMM yyyy')
}

export type Pegawai = {
  id: string
  nama: string
  nip: string | null
  jabatan: string
  pangkat: string | null
  golongan: string | null
}

export type SuratPerintahPdfProps = {
  data: {
    nomorPrefix: string
    nomorTengah: string
    nomorSuffix: string
    tanggal: string
    menimbang: string[]
    dasar: string[]
    untuk: string[]
  }
  signer?: Pegawai
  kepada?: Pegawai
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 40,
    fontSize: 11,
    fontFamily: 'Bookman',
    lineHeight: 1.5,
  },
  titleBlock: {
    alignItems: 'center',
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
  section: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  labelCol: {
    width: 90,
  },
  colonCol: {
    width: 15,
    textAlign: 'center',
  },
  valueCol: {
    flex: 1,
    textAlign: 'justify',
  },
  // Sub-items for Kepada
  kepadaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  kepadaLabel: {
    width: 80,
  },
  kepadaColon: {
    width: 15,
    textAlign: 'center',
  },
  kepadaValue: {
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
  }
})

// Helper untuk merender list klausul (Menimbang, Dasar, Untuk)
const renderList = (items: string[] | string, type: 'alpha' | 'numeric' | 'none') => {
  if (!items) return <Text>-</Text>
  const arr = Array.isArray(items) ? items : [items]
  const validItems = arr.filter(i => i && i.trim().length > 0)
  if (validItems.length === 0) return <Text>-</Text>

  if (validItems.length === 1) {
    return <Text style={{ textAlign: 'justify' }}>{validItems[0]}</Text>
  }

  return validItems.map((item, idx) => {
    let bullet = ''
    if (type === 'alpha') bullet = String.fromCharCode(97 + idx) + '.' // a., b., c.
    else if (type === 'numeric') bullet = (idx + 1) + '.' // 1., 2., 3.
    else bullet = '-'
    return (
      <View key={idx} style={{ flexDirection: 'row', marginBottom: 2 }}>
        <View style={{ width: 16 }}><Text>{bullet}</Text></View>
        <View style={{ flex: 1 }}><Text style={{ textAlign: 'justify' }}>{item}</Text></View>
      </View>
    )
  })
}

export default function SuratPerintahPdf({ data, signer, kepada }: SuratPerintahPdfProps) {
  const fullNomor = `${data.nomorPrefix}${data.nomorTengah || '           '}${data.nomorSuffix}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine="Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"
          useBookman={true}
        />

        <View style={styles.titleBlock}>
          <Text style={styles.titleText}>SURAT PERINTAH</Text>
          <Text style={styles.nomorText}>NOMOR: {fullNomor}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelCol}><Text>Menimbang</Text></View>
          <View style={styles.colonCol}><Text>:</Text></View>
          <View style={styles.valueCol}>
            {renderList(data.menimbang, 'alpha')}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.labelCol}><Text>Dasar</Text></View>
          <View style={styles.colonCol}><Text>:</Text></View>
          <View style={styles.valueCol}>
            {renderList(data.dasar, 'numeric')}
          </View>
        </View>

        <View style={{ ...styles.titleBlock, marginTop: 10, marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold' }}>Memberi Perintah</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelCol}><Text>Kepada</Text></View>
          <View style={styles.colonCol}><Text>:</Text></View>
          <View style={styles.valueCol}>
            <View style={styles.kepadaRow}>
              <View style={styles.kepadaLabel}><Text>Nama</Text></View>
              <View style={styles.kepadaColon}><Text>:</Text></View>
              <View style={styles.kepadaValue}><Text>{kepada?.nama || '-'}</Text></View>
            </View>
            <View style={styles.kepadaRow}>
              <View style={styles.kepadaLabel}><Text>Pangkat/Gol</Text></View>
              <View style={styles.kepadaColon}><Text>:</Text></View>
              <View style={styles.kepadaValue}><Text>{kepada?.pangkat || '-'} {kepada?.golongan ? `/ ${kepada.golongan}` : ''}</Text></View>
            </View>
            <View style={styles.kepadaRow}>
              <View style={styles.kepadaLabel}><Text>NIP</Text></View>
              <View style={styles.kepadaColon}><Text>:</Text></View>
              <View style={styles.kepadaValue}><Text>{kepada?.nip || '-'}</Text></View>
            </View>
            <View style={styles.kepadaRow}>
              <View style={styles.kepadaLabel}><Text>Jabatan</Text></View>
              <View style={styles.kepadaColon}><Text>:</Text></View>
              <View style={styles.kepadaValue}><Text>{kepada?.jabatan || '-'}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.labelCol}><Text>Untuk</Text></View>
          <View style={styles.colonCol}><Text>:</Text></View>
          <View style={styles.valueCol}>
            {renderList(data.untuk, 'numeric')}
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.ttdBox}>
            <View style={{ flexDirection: 'row', marginBottom: 2 }}>
              <View style={{ width: 90 }}><Text>Ditetapkan di</Text></View>
              <View style={{ width: 10 }}><Text>:</Text></View>
              <View><Text>Sendawar</Text></View>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 2 }}>
              <View style={{ width: 90 }}><Text>Pada tanggal</Text></View>
              <View style={{ width: 10 }}><Text>:</Text></View>
              <View><Text>{fmtDateId(data.tanggal ? new Date(data.tanggal) : null)}</Text></View>
            </View>
            
            <Text style={{ marginTop: 8 }}>{signer?.jabatan || 'PEJABAT PENANDATANGAN'}</Text>
            
            <Text style={styles.ttdNama}>{signer?.nama || 'NAMA PENANDATANGAN'}</Text>
            {signer?.pangkat && <Text>{signer.pangkat} {signer.golongan ? `(${signer.golongan})` : ''}</Text>}
            <Text>NIP. {signer?.nip || '-'}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
