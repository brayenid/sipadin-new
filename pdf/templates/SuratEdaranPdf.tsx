import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import KopSurat from '@/pdf/components/kop-surat'
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

export type SuratEdaranPdfProps = {
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
  // Default static page style, will be overridden by dynamic layout
  page: {
    fontFamily: 'Helvetica'
  },
  headerInfo: {
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 16,
  },
  infoLeft: {
    width: 350,
  },
  infoRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    width: 65,
  },
  infoColon: {
    width: 15,
  },
  infoValue: {
    flex: 1,
    paddingRight: 10,
  },
  ythBlock: {
    marginBottom: 16,
  },
  contentBlock: {
    marginBottom: 10,
    textAlign: 'justify'
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  parafBox: {
    width: 300,
  },
  ttdBox: {
    width: 200,
    alignItems: 'center',
  },
  ttdNama: {
    marginTop: 60,
    fontWeight: 'bold',
    textDecoration: 'underline',
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

    // Check if paragraph contains list items
    const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Check if paragraph contains any list items or custom syntax (excluding the no-indent marker)
    const hasListItems = lines.some(l => l.match(/^\[.*?\]\s/) && !l.trimStart().startsWith('[_]'));
    
    // If it has no list items, render as a standard paragraph
    if (!hasListItems) {
      // Check for custom no-indent syntax [_]
      if (para.trimStart().startsWith('[_]')) {
        const cleanPara = para.trimStart().substring(3).trimStart();
        return <Text key={index} style={[styles.paragraph, { textIndent: 0 }]}>{renderInlineStyles(cleanPara)}</Text>
      }
      return <Text key={index} style={styles.paragraph}>{renderInlineStyles(para)}</Text>
    }

    // Process lines for custom syntax
    let currentIndent = 0; // 0 = none, 1 = level1, 2 = level2

    return (
      <View key={index} style={{ marginBottom: 4 }}>
        {lines.map((line, lIndex) => {
          // Check custom syntax: [1.] or [a.]
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
            // Regular text within a mixed block (continuation line)
            let paddingLeft = 0;
            if (currentIndent === 1) paddingLeft = 30; // 10 (listItem) + 20 (bullet)
            if (currentIndent === 2) paddingLeft = 50; // 30 (listItem) + 20 (bullet)
            if (currentIndent === 3) paddingLeft = 70; // 50 (listItem) + 20 (bullet)

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

export default function SuratEdaranPdf({ data, signer, parafList = [], layout }: SuratEdaranPdfProps) {
  const fullNomor = `${data.nomorPrefix}${data.nomorTengah || '          '}${data.nomorSuffix}`

  const dynamicPageStyle = {
    paddingTop: layout?.marginTop ?? 30,
    paddingBottom: layout?.marginBottom ?? 30,
    paddingHorizontal: layout?.marginHorizontal ?? 42,
    fontSize: layout?.fontSize ?? 11,
    lineHeight: layout?.lineHeight ?? 1.35,
  }

  return (
    <Document>
      <Page size="A4" style={[styles.page, dynamicPageStyle]}>
        <KopSurat 
          instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
          instansiLine2="SEKRETARIAT DAERAH"
          alamatLine="Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"
        />

        <View style={styles.headerInfo}>
          <View style={styles.infoLeft}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}><Text>Nomor</Text></View>
              <View style={styles.infoColon}><Text>:</Text></View>
              <View style={styles.infoValue}><Text>{fullNomor}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}><Text>Sifat</Text></View>
              <View style={styles.infoColon}><Text>:</Text></View>
              <View style={styles.infoValue}><Text>{data.sifat}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}><Text>Lampiran</Text></View>
              <View style={styles.infoColon}><Text>:</Text></View>
              <View style={styles.infoValue}><Text>{data.lampiran}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}><Text>Hal</Text></View>
              <View style={styles.infoColon}><Text>:</Text></View>
              <View style={styles.infoValue}><Text>{data.hal}</Text></View>
            </View>
          </View>
          
          <View style={styles.infoRight}>
            <Text>Sendawar,        {fmtDateId(data.tanggal)}</Text>
          </View>
        </View>

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
              
              {data.penerimaTipe !== 'LANGSUNG' && (
                <View style={{ marginTop: 10, marginLeft: 15 }}>
                  <Text>di -</Text>
                  <Text style={{ marginLeft: 15 }}>T E M P A T</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.contentBlock}>
          {renderMarkdownLite(data.isiSurat)}
        </View>

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
            <Text>{signer?.jabatan || 'PEJABAT PENANDATANGAN'}</Text>
            
            <Text style={styles.ttdNama}>{signer?.nama || 'NAMA PENANDATANGAN'}</Text>
            {signer?.pangkat && <Text>{signer.pangkat} {signer.golongan ? `(${signer.golongan})` : ''}</Text>}
            <Text>NIP. {signer?.nip || '-'}</Text>
          </View>
        </View>

        {data.tembusan && data.tembusan.filter(x => x.trim()).length > 0 && (
          <View style={styles.tembusanBlock}>
            <Text style={{ fontSize: 9 }}>Tembusan Yth :</Text>
            {data.tembusan.filter(x => x.trim()).map((t, idx) => (
              <View key={idx} style={{ flexDirection: 'row', fontSize: 9 }}>
                <View style={{ width: 12 }}><Text>{idx + 1}.</Text></View>
                <View style={{ flex: 1 }}><Text>{t}</Text></View>
              </View>
            ))}
          </View>
        )}
      </Page>

      {/* Halaman Lampiran jika tipe TERLAMPIR */}
      {data.penerimaTipe === 'TERLAMPIR' && data.penerimaDaftar.filter(x => x.trim()).length > 0 && (
        <Page size="A4" style={[styles.page, dynamicPageStyle]}>
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
