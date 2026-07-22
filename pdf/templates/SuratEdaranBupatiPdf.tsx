
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatWita } from '@/lib/date-utils'
import '@/pdf/fonts'

export type Pegawai = {
  id: string
  nama: string
  nip: string | null
  jabatan: string
  pangkat: string | null
  golongan: string | null
}

export type SuratEdaranBupatiPdfProps = {
  data: {
    nomorPrefix: string
    nomorTengah: string
    nomorSuffix: string
    tanggal: string
    sifat: string
    lampiran: string
    hal: string
    penerimaTipe: string
    penerimaTeksSemua: string
    penerimaDaftar: string[]
    isiSurat: string
    tembusan: string[]
    parafTampilkan: boolean
  }
  signer?: Pegawai
  parafList?: Pegawai[]
  layout?: {
    marginTop: number
    marginBottom: number
    marginHorizontal: number
    fontSize: number
    lineHeight: number
  }
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    position: 'relative'
  },
  pageNumber: {
    position: 'absolute',
    top: 30, // margin top of the page number itself
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11
  },
  garudaContainer: {
    alignItems: 'center',
    marginBottom: 8
  },
  garudaLogo: {
    width: 75,
    height: 75,
    objectFit: 'contain',
    marginBottom: 8
  },
  bupatiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  ythBlock: {
    marginBottom: 20,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 20,
    textAlign: 'center'
  },
  titleLabel: {
    fontWeight: 'bold',
    marginBottom: 4
  },
  contentBlock: {
    marginBottom: 10,
    textAlign: 'justify'
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  parafBox: {
    width: 250,
  },
  ttdBox: {
    width: 250,
    alignItems: 'center',
  },
  ttdNama: {
    marginTop: 60,
    fontWeight: 'bold',
    textTransform:'uppercase'
  },
  tembusanBlock: {
    marginTop: 40,
  },
  // Markdown Lite Styles
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
    textIndent: 30,
  },
  listItemLevel1: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingLeft: 10,
  },
  listItemLevel2: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingLeft: 30,
  },
  listItemLevel3: {
    flexDirection: 'row',
    marginBottom: 0,
    paddingLeft: 50,
  },
  bullet: {
    width: 20,
  },
  itemText: {
    flex: 1,
    textAlign: 'justify',
  },
  // Paraf Table
  parafTable: {
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'column',
  },
  parafRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  parafColHeader: {
    padding: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  parafCol: {
    padding: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: '#000',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2
  },
  infoLabel: {
    width: 60
  },
  infoColon: {
    width: 15,
    textAlign: 'center'
  },
  infoValue: {
    flex: 1
  }
})

const renderInlineStyles = (text: string) => {
  // Regex to match **bold**, *italic*, and __underline__
  const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__)/g;
  const parts = text.split(regex);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={{ fontFamily: 'Helvetica-Bold' }}>{part.slice(2, -2)}</Text>;
    } else if (part.startsWith('__') && part.endsWith('__')) {
      return <Text key={i} style={{ textDecoration: 'underline' }}>{part.slice(2, -2)}</Text>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <Text key={i} style={{ fontFamily: 'Helvetica-Oblique' }}>{part.slice(1, -1)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
};

// Markdown-Lite Parser
const renderMarkdownLite = (text: string) => {
  if (!text) return null;

  // Normalize Windows line endings to Unix line endings
  const normalizedText = text.replace(/\r\n/g, '\n');
  const paragraphs = normalizedText.split(/\n\n+/);

  return paragraphs.map((para, index) => {
    // Check for [:table] block
    if (para.trimStart().startsWith('[:table]')) {
      const tableLines = para.split('\n').slice(1).filter(l => l.trim().length > 0);
      const rows = tableLines.map(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) {
          return { key: line.trim(), value: '' };
        }
        return {
          key: line.substring(0, colonIdx).trim(),
          value: line.substring(colonIdx + 1).trim()
        };
      });

      return (
        <View key={index} style={{ marginTop: 4, marginBottom: 8, paddingLeft: 15 }}>
          {rows.map((row, rIdx) => (
            <View key={rIdx} style={{ flexDirection: 'row', marginBottom: 3 }}>
              <View style={{ width: 110 }}>
                <Text>{renderInlineStyles(row.key)}</Text>
              </View>
              <View style={{ width: 15, alignItems: 'center' }}>
                <Text>:</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ textAlign: 'justify' }}>{renderInlineStyles(row.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Check if paragraph contains any list items or custom syntax (excluding the no-indent marker)
    const hasListItems = lines.some(l => l.match(/^\[.*?\]\s/) && !l.trimStart().startsWith('[_]'));
    
    if (!hasListItems) {
      if (para.trimStart().startsWith('[_]')) {
        const cleanPara = para.trimStart().substring(3).trimStart();
        return <Text key={index} style={[styles.paragraph, { textIndent: 0 }]}>{renderInlineStyles(cleanPara)}</Text>
      }
      return <Text key={index} style={styles.paragraph}>{renderInlineStyles(para)}</Text>
    }

    let currentIndent = 0; 

    return (
      <View key={index} style={{ marginBottom: 4 }}>
        {lines.map((line, lIndex) => {
          const matchNum = line.match(/^\[(\d+\.?)\]\s(.*)/);
          const matchAlpha = line.match(/^\[([a-z]\.?)\]\s(.*)/i);
          const matchLevel3 = line.match(/^\[(.*?)\]\s(.*)/);

          if (matchNum) {
            currentIndent = 1;
            return (
              <View key={lIndex} style={styles.listItemLevel1}>
                <View style={styles.bullet}><Text>{matchNum[1]}</Text></View>
                <View style={styles.itemText}><Text>{renderInlineStyles(matchNum[2])}</Text></View>
              </View>
            )
          } else if (matchAlpha) {
            currentIndent = 2;
            return (
              <View key={lIndex} style={styles.listItemLevel2}>
                <View style={styles.bullet}><Text>{matchAlpha[1]}</Text></View>
                <View style={styles.itemText}><Text>{renderInlineStyles(matchAlpha[2])}</Text></View>
              </View>
            )
          } else if (matchLevel3 && (matchLevel3[1].endsWith(')') || matchLevel3[1] === '-' || matchLevel3[1] === '•')) {
            currentIndent = 3;
            return (
              <View key={lIndex} style={styles.listItemLevel3}>
                <View style={styles.bullet}><Text>{matchLevel3[1]}</Text></View>
                <View style={styles.itemText}><Text>{renderInlineStyles(matchLevel3[2])}</Text></View>
              </View>
            )
          } else {
            let paddingLeft = 0;
            if (currentIndent === 1) paddingLeft = 30;
            if (currentIndent === 2) paddingLeft = 50;
            if (currentIndent === 3) paddingLeft = 70;

            return (
              <View key={lIndex} style={{ paddingLeft, marginBottom: 0 }}>
                <Text style={{ textAlign: 'justify' }}>{renderInlineStyles(line)}</Text>
              </View>
            )
          }
        })}
      </View>
    )
  })
}

function fmtDateId(date: string) {
  if (!date) return '-'
  return formatWita(new Date(date), 'MMMM yyyy')
}

function stripGelar(nama: string) {
  if (!nama) return ''
  // Hapus gelar di belakang (setelah koma)
  let bersih = nama.split(',')[0].trim()
  // Hapus gelar di depan (berakhiran titik seperti Dr., H., Ir.)
  bersih = bersih.split(' ').filter(kata => !kata.endsWith('.')).join(' ')
  return bersih
}

export default function SuratEdaranBupatiPdf({ data, signer, parafList = [], layout }: SuratEdaranBupatiPdfProps) {
  const fullNomor = `${data.nomorPrefix}${data.nomorTengah || '          '}${data.nomorSuffix}`

  const dynamicPageStyle = {
    paddingTop: layout?.marginTop ?? 30,
    paddingBottom: layout?.marginBottom ?? 30,
    paddingHorizontal: layout?.marginHorizontal ?? 45, // Default changed to 45
    fontSize: layout?.fontSize ?? 11,
    lineHeight: layout?.lineHeight ?? 1.35,
  }

  const pageNumberStyle = {
    position: 'absolute' as const,
    top: (layout?.marginTop ?? 30) - 20, // Page number sits 20pt above the top margin
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    fontSize: layout?.fontSize ?? 11,
  }

  return (
    <Document>
      <Page size="A4" style={[styles.page, dynamicPageStyle]}>
        
        {/* Dynamic Page Number at Top */}
        <Text render={({ pageNumber }) => (
          pageNumber > 1 ? `- ${pageNumber} -` : ''
        )} fixed style={pageNumberStyle} />

        {/* Kop Bupati */}
        <View style={styles.garudaContainer}>
          <Image src="/garuda.png" style={styles.garudaLogo} />
          <Text style={styles.bupatiTitle}>BUPATI KUTAI BARAT</Text>
        </View>

        {/* Penerima / Yth */}
        <View style={styles.ythBlock}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 30 }}><Text>Yth.</Text></View>
            <View style={{ flex: 1 }}>
              {data.penerimaTipe === 'SEMUA' && (
                <Text>{data.penerimaTeksSemua}</Text>
              )}
              {data.penerimaTipe === 'TERLAMPIR' && (
                <Text>(Daftar undangan terlampir)</Text>
              )}
              {data.penerimaTipe === 'LANGSUNG' && data.penerimaDaftar.filter(x => x.trim()).map((p, idx) => (
                <View key={idx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <View style={{ width: 15 }}><Text>{idx + 1}.</Text></View>
                  <View style={{ flex: 1 }}><Text>{p}</Text></View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Judul Surat */}
        <View style={styles.titleBlock}>
          <Text style={styles.titleLabel}>SURAT EDARAN</Text>
          {/* eslint-disable-next-line react-hooks/purity */}
          <Text style={styles.titleLabel}>NOMOR {fullNomor} TAHUN {new Date(data.tanggal || Date.now()).getFullYear()}</Text>
          <Text style={styles.titleLabel}>TENTANG</Text>
          <Text style={styles.titleLabel}>{data.hal?.toUpperCase()}</Text>
        </View>

        {/* Isi Surat */}
        <View style={styles.contentBlock}>
          {renderMarkdownLite(data.isiSurat)}
        </View>

        {/* Footer & TTD */}
        <View style={styles.footer}>
          <View style={styles.parafBox}>
            {data.parafTampilkan && parafList.length > 0 && (
              <View style={styles.parafTable}>
                <View style={styles.parafRow}>
                  <View style={[styles.parafColHeader, { width: 30 }]}><Text>NO</Text></View>
                  <View style={[styles.parafColHeader, { flex: 1 }]}><Text>NAMA</Text></View>
                  <View style={[styles.parafColHeader, { width: 80 }]}><Text>JABATAN</Text></View>
                  <View style={[styles.parafColHeader, { width: 50, borderRightWidth: 0 }]}><Text>PARAF</Text></View>
                </View>
                {parafList.map((p, idx) => (
                  <View key={idx} style={[styles.parafRow, idx === parafList.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                    <View style={[styles.parafCol, { width: 30, alignItems: 'center' }]}><Text>{idx + 1}</Text></View>
                    <View style={[styles.parafCol, { flex: 1 }]}><Text>{p.nama}</Text></View>
                    <View style={[styles.parafCol, { width: 80 }]}><Text>{p.jabatan}</Text></View>
                    <View style={[styles.parafCol, { width: 50, borderRightWidth: 0 }]}><Text></Text></View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.ttdBox}>
            <Text>Sendawar,               {fmtDateId(data.tanggal)}</Text>
            <Text style={{ marginTop: 2, fontWeight: 'bold' }}>BUPATI KUTAI BARAT,</Text>
            
            <Text style={styles.ttdNama}>{stripGelar(signer?.nama || 'NAMA PENANDATANGAN')}</Text>
            {/* NO NIP AND PANGKAT FOR BUPATI */}
          </View>
        </View>

        {/* Tembusan */}
        {data.tembusan && data.tembusan.filter(x => x.trim()).length > 0 && (
          <View style={styles.tembusanBlock}>
            <Text style={{ fontSize: 8 }}>Tembusan disampaikan kepada Yth.</Text>
            {data.tembusan.filter(x => x.trim()).map((t, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginTop: 1, fontSize: 8 }}>
                <View style={{ width: 15 }}><Text>{idx + 1}.</Text></View>
                <View style={{ flex: 1 }}><Text>{t}</Text></View>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* Halaman Lampiran jika tipe TERLAMPIR */}
      {data.penerimaTipe === 'TERLAMPIR' && data.penerimaDaftar.filter(x => x.trim()).length > 0 && (
        <Page size="A4" style={[styles.page, dynamicPageStyle]}>
          <Text render={({ pageNumber }) => (
            pageNumber > 1 ? `- ${pageNumber} -` : ''
          )} fixed style={pageNumberStyle} />

          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <View style={{ width: 300 }}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Lampiran</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text></Text></View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Nomor</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text>{fullNomor}</Text></View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Tanggal</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text></Text></View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Hal</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text style={{ textAlign: 'justify' }}>{data.hal}</Text></View>
              </View>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
            <Text style={{ fontWeight: 'bold' }}>Daftar Undangan</Text>
          </View>

          <View style={{ paddingLeft: 40 }}>
            {data.penerimaDaftar.filter(x => x.trim()).map((p, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 6 }}>
                <View style={{ width: 20 }}><Text>{idx + 1}.</Text></View>
                <View style={{ flex: 1 }}><Text>{p}</Text></View>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  )
}
