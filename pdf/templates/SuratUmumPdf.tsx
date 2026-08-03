import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import KopSurat from '@/pdf/components/kop-surat'
import { formatWita } from '@/lib/date-utils'
import '@/pdf/fonts'

function fmtDateId(date: string | Date | null | undefined) {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export type Pegawai = {
  id: string
  nama: string
  nip: string | null
  jabatan: string
  pangkat: string | null
  golongan: string | null
}

export type SuratUmumPdfProps = {
  data: {
    // Basic Metadata
    nomorPrefix: string
    nomorTengah: string
    nomorSuffix: string
    tanggal: string
    sifat: string
    lampiran: string
    hal: string

    // Customization Options
    kopSuratTipe?: 'SEKDA' | 'BUPATI' | 'CUSTOM' | 'NONE'
    kopCustomLine1?: string
    kopCustomLine2?: string
    kopCustomAlamat?: string

    tampilkanJudul?: boolean
    judulTeks?: string
    posisiNomor?: 'HEADER_LEFT' | 'BELOW_TITLE'

    posisiTanggal?: 'TOP_RIGHT' | 'ABOVE_SIGNATURE' | 'BOTH'

    tampilkanYth?: boolean
    penerimaTipe?: string
    penerimaTeksSemua?: string
    penerimaDaftar?: string[]
    penerimaDiTampilkan?: boolean
    penerimaLokasi?: string

    isiSurat: string

    sembunyikanGelar?: boolean
    sembunyikanJabatan?: boolean
    sembunyikanPangkat?: boolean
    sembunyikanNip?: boolean

    parafTampilkan?: boolean
    tembusan?: string[]
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
  garudaContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  garudaLogo: {
    width: 55,
    height: 55,
    marginBottom: 8,
  },
  bupatiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
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
  titleBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
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
    width: 270,
  },
  ttdBox: {
    width: 230,
    alignItems: 'center',
  },
  ttdNama: {
    marginTop: 55,
    fontWeight: 'bold',
  },
  tembusanBlock: {
    marginTop: 30,
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
    borderWidth: 0.5,
    borderColor: '#000',
    flexDirection: 'column',
  },
  parafRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
  },
  parafColHeader: {
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    fontSize: 7,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#000',
  },
  parafCol: {
    paddingVertical: 2.5,
    paddingHorizontal: 3,
    fontSize: 7,
    lineHeight: 1.15,
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    justifyContent: 'center',
    minHeight: 17,
  }
})

const renderInlineStyles = (text: string) => {
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

const renderMarkdownLite = (text: string) => {
  if (!text) return null;

  const normalizedText = text.replace(/\r\n/g, '\n');
  const paragraphs = normalizedText.split(/\n\n+/);

  return paragraphs.map((para, index) => {
    if (para.trimStart().startsWith('[:grid]')) {
      const lines = para.split('\n').slice(1).map(l => l.trim()).filter(l => l.length > 0);
      let colWidths: number[] = [];
      let tableLines = lines;

      if (lines[0] && lines[0].startsWith('[widths:')) {
        const widthStr = lines[0].replace('[widths:', '').replace(']', '').trim();
        colWidths = widthStr.split(',').map(w => parseFloat(w.trim()) || 1);
        tableLines = lines.slice(1);
      }

      const parseRow = (line: string) => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length > 1 && parts[0] === '') parts.shift();
        if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        return parts;
      };

      const gridHeaders = tableLines.length > 0 ? parseRow(tableLines[0]) : ['No', 'Uraian'];
      const gridRows = tableLines.length > 1 ? tableLines.slice(1).map(parseRow) : [];

      const widths = colWidths.length === gridHeaders.length ? colWidths : gridHeaders.map(() => 1);
      const totalWidth = widths.reduce((a, b) => a + b, 0) || 1;
      const colPcts = widths.map(w => `${(w / totalWidth) * 100}%`);

      return (
        <View key={index} style={{ marginTop: 6, marginBottom: 8, borderWidth: 0.5, borderColor: '#000', flexDirection: 'column' }}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#000' }}>
            {gridHeaders.map((header, hIdx) => (
              <View 
                key={hIdx} 
                style={{ 
                  width: colPcts[hIdx], 
                  paddingTop: 3,
                  paddingBottom: 2, 
                  paddingHorizontal: 4, 
                  borderRightWidth: hIdx === gridHeaders.length - 1 ? 0 : 0.5, 
                  borderRightColor: '#000',
                  justifyContent: 'center',
                  alignItems: hIdx === 0 ? 'center' : 'flex-start'
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: 'bold', textAlign: hIdx === 0 ? 'center' : 'left' }}>
                  {renderInlineStyles(header)}
                </Text>
              </View>
            ))}
          </View>

          {gridRows.map((row, rIdx) => (
            <View 
              key={rIdx} 
              style={{ 
                flexDirection: 'row', 
                borderBottomWidth: rIdx === gridRows.length - 1 ? 0 : 0.5, 
                borderBottomColor: '#000',
                minHeight: 16
              }}
            >
              {gridHeaders.map((_, cIdx) => (
                <View 
                  key={cIdx} 
                  style={{ 
                    width: colPcts[cIdx], 
                    paddingVertical: 2.5, 
                    paddingHorizontal: 4, 
                    borderRightWidth: cIdx === gridHeaders.length - 1 ? 0 : 0.5, 
                    borderRightColor: '#000',
                    justifyContent: 'center',
                    alignItems: cIdx === 0 ? 'center' : 'flex-start'
                  }}
                >
                  <Text style={{ fontSize: 8, textAlign: cIdx === 0 ? 'center' : 'left' }}>
                    {renderInlineStyles(row[cIdx] || '')}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    const lines = para.split('\n');
    const hasListItems = lines.some(l => /^\s*([0-9]+\.|\*|-|[a-z]\.)\s+/.test(l));

    if (!hasListItems) {
      if (para.trimStart().startsWith('[_]')) {
        const cleanPara = para.trimStart().substring(3).trimStart();
        return <Text key={index} style={styles.paragraph}>{renderInlineStyles(cleanPara)}</Text>;
      }
      const INDENT_SPACES = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0';
      return (
        <Text key={index} style={styles.paragraph}>
          {INDENT_SPACES}{renderInlineStyles(para)}
        </Text>
      );
    }

    return (
      <View key={index} style={{ marginBottom: 8 }}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trimStart();
          const matchLevel3 = trimmed.match(/^(\t\t|\s{8})([0-9]+\.|\*|-|[a-z]\.)\s+(.*)/);
          const matchLevel2 = trimmed.match(/^(\t|\s{4})([0-9]+\.|\*|-|[a-z]\.)\s+(.*)/);
          const matchLevel1 = line.match(/^([0-9]+\.|\*|-|[a-z]\.)\s+(.*)/);

          if (matchLevel3) {
            return (
              <View key={lIdx} style={styles.listItemLevel3}>
                <Text style={styles.bullet}>{matchLevel3[2]}</Text>
                <Text style={styles.itemText}>{renderInlineStyles(matchLevel3[3])}</Text>
              </View>
            );
          } else if (matchLevel2) {
            return (
              <View key={lIdx} style={styles.listItemLevel2}>
                <Text style={styles.bullet}>{matchLevel2[2]}</Text>
                <Text style={styles.itemText}>{renderInlineStyles(matchLevel2[3])}</Text>
              </View>
            );
          } else if (matchLevel1) {
            return (
              <View key={lIdx} style={styles.listItemLevel1}>
                <Text style={styles.bullet}>{matchLevel1[1]}</Text>
                <Text style={styles.itemText}>{renderInlineStyles(matchLevel1[2])}</Text>
              </View>
            );
          }

          return (
            <Text key={lIdx} style={{ textAlign: 'justify', marginBottom: 2 }}>
              {renderInlineStyles(line)}
            </Text>
          );
        })}
      </View>
    );
  });
};

function stripGelar(nama: string) {
  if (!nama) return ''
  let bersih = nama.split(',')[0].trim()
  bersih = bersih.split(' ').filter(kata => !kata.endsWith('.')).join(' ').trim()
  return bersih || nama
}

export default function SuratUmumPdf({ data, signer, parafList = [], layout }: SuratUmumPdfProps) {
  const fullNomor = `${data.nomorPrefix}${data.nomorTengah || '          '}${data.nomorSuffix}`

  const kopTipe = data.kopSuratTipe ?? 'SEKDA'
  const posisiNomor = data.posisiNomor ?? 'HEADER_LEFT'
  const posisiTanggal = data.posisiTanggal ?? 'TOP_RIGHT'
  const tampilkanJudul = data.tampilkanJudul ?? false
  const judulTeks = data.judulTeks || 'SURAT UMUM'
  const tampilkanYth = data.tampilkanYth ?? true

  const hasPangkat = !data.sembunyikanPangkat && Boolean(signer?.pangkat || signer?.golongan)
  const hasNip = !data.sembunyikanNip && Boolean(signer?.nip && signer.nip.trim() !== '' && signer.nip !== '-')
  const showUnderline = signer ? (hasPangkat || hasNip) : (!data.sembunyikanPangkat || !data.sembunyikanNip)

  const dynamicPageStyle = {
    paddingTop: layout?.marginTop ?? 30,
    paddingBottom: layout?.marginBottom ?? 30,
    paddingHorizontal: layout?.marginHorizontal ?? 42,
    fontSize: layout?.fontSize ?? 11,
    lineHeight: layout?.lineHeight ?? 1.35,
  }

  const signerNama = signer?.nama
    ? (data.sembunyikanGelar ? stripGelar(signer.nama) : signer.nama)
    : 'NAMA PENANDATANGAN'

  const dateStr = `Sendawar,        ${fmtDateId(data.tanggal)}`

  return (
    <Document>
      <Page size="A4" style={[styles.page, dynamicPageStyle]}>
        {/* KOP SURAT CHOICES */}
        {kopTipe === 'SEKDA' && (
          <KopSurat 
            instansiLine1="PEMERINTAH KABUPATEN KUTAI BARAT"
            instansiLine2="SEKRETARIAT DAERAH"
            alamatLine="Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat, Telepon (0542) 594754\nKode Pos 75776 Fax (0542) 404384 Website: setda.kutaibaratkab.go.id"
          />
        )}

        {kopTipe === 'BUPATI' && (
          <View style={styles.garudaContainer}>
            <Image src="/garuda.png" style={styles.garudaLogo} />
            <Text style={styles.bupatiTitle}>BUPATI KUTAI BARAT</Text>
          </View>
        )}

        {kopTipe === 'CUSTOM' && (
          <KopSurat 
            instansiLine1={data.kopCustomLine1 || "PEMERINTAH KABUPATEN KUTAI BARAT"}
            instansiLine2={data.kopCustomLine2 || "DINAS / BADAN TERKAIT"}
            alamatLine={data.kopCustomAlamat || "Jalan Kompleks Perkantoran Kabupaten Kutai Barat"}
          />
        )}

        {/* HEADER INFO (Nomor, Sifat, Lampiran, Hal) & TOP RIGHT DATE */}
        {posisiNomor === 'HEADER_LEFT' && (
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
              {(posisiTanggal === 'TOP_RIGHT' || posisiTanggal === 'BOTH') && (
                <Text>{dateStr}</Text>
              )}
            </View>
          </View>
        )}

        {/* CENTER TITLE & NUMBERING (Bupati / Formal Title Style) */}
        {tampilkanJudul && posisiNomor === 'BELOW_TITLE' && (
          <View style={styles.titleBlock}>
            <Text style={styles.titleLabel}>{judulTeks.toUpperCase()}</Text>
            <Text style={styles.titleLabel}>NOMOR {fullNomor}</Text>
            {data.hal && <Text style={styles.titleLabel}>TENTANG {data.hal.toUpperCase()}</Text>}
          </View>
        )}

        {tampilkanJudul && posisiNomor === 'HEADER_LEFT' && (
          <View style={styles.titleBlock}>
            <Text style={styles.titleLabel}>{judulTeks.toUpperCase()}</Text>
          </View>
        )}

        {/* YTH / RECIPIENT BLOCK */}
        {tampilkanYth && (
          <View style={styles.ythBlock}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 30 }}><Text>Yth.</Text></View>
              <View style={{ flex: 1 }}>
                {data.penerimaTipe === 'SEMUA' && (
                  <Text>{data.penerimaTeksSemua || 'Seluruh Kepala Perangkat Daerah'}</Text>
                )}
                {data.penerimaTipe === 'TERLAMPIR' && (
                  <Text>(Daftar undangan terlampir)</Text>
                )}
                {data.penerimaTipe === 'LANGSUNG' && (data.penerimaDaftar || []).filter(x => x.trim()).map((p, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <View style={{ width: 15 }}><Text>{idx + 1}.</Text></View>
                    <View style={{ flex: 1 }}><Text>{p}</Text></View>
                  </View>
                ))}
                
                {data.penerimaDiTampilkan !== false && (
                  <View style={{ marginTop: 10, marginLeft: 15 }}>
                    <Text>di -</Text>
                    <Text style={{ marginLeft: 15 }}>{data.penerimaLokasi?.trim() ? data.penerimaLokasi.trim() : 'T E M P A T'}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* CONTENT */}
        <View style={styles.contentBlock}>
          {renderMarkdownLite(data.isiSurat)}
        </View>

        {/* FOOTER: PARAF & SIGNATURE */}
        <View style={styles.footer}>
          <View style={styles.parafBox}>
            {data.parafTampilkan && parafList.length > 0 && (
              <View style={styles.parafTable}>
                <View style={styles.parafRow}>
                  <View style={[styles.parafColHeader, { width: 18 }]}><Text>NO</Text></View>
                  <View style={[styles.parafColHeader, { flex: 1.1 }]}><Text>NAMA</Text></View>
                  <View style={[styles.parafColHeader, { flex: 1.2 }]}><Text>JABATAN</Text></View>
                  <View style={[styles.parafColHeader, { width: 40, borderRightWidth: 0 }]}><Text>PARAF</Text></View>
                </View>
                {parafList.map((p, idx) => (
                  <View key={idx} style={[styles.parafRow, idx === parafList.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                    <View style={[styles.parafCol, { width: 18, alignItems: 'center' }]}><Text>{idx + 1}</Text></View>
                    <View style={[styles.parafCol, { flex: 1.1 }]}><Text>{p.nama}</Text></View>
                    <View style={[styles.parafCol, { flex: 1.2 }]}><Text>{p.jabatan}</Text></View>
                    <View style={[styles.parafCol, { width: 40, borderRightWidth: 0 }]}><Text></Text></View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.ttdBox}>
            {(posisiTanggal === 'ABOVE_SIGNATURE' || posisiTanggal === 'BOTH') && (
              <Text style={{ marginBottom: 4 }}>{dateStr}</Text>
            )}

            {!data.sembunyikanJabatan && (
              <Text style={{ fontWeight: 'bold', textAlign: 'center' }}>
                {signer?.jabatan || 'PEJABAT PENANDATANGAN'}
              </Text>
            )}
            
            <Text style={[styles.ttdNama, showUnderline ? { textDecoration: 'underline' } : { textDecoration: 'none' }]}>
              {signerNama}
            </Text>
            {!data.sembunyikanPangkat && signer?.pangkat && (
              <Text>{signer.pangkat} {signer.golongan ? `(${signer.golongan})` : ''}</Text>
            )}
            {!data.sembunyikanNip && signer?.nip && (
              <Text>NIP. {signer.nip}</Text>
            )}
          </View>
        </View>

        {/* TEMBUSAN */}
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

      {/* LAMPIRAN PAGE IF TERLAMPIR */}
      {data.penerimaTipe === 'TERLAMPIR' && (data.penerimaDaftar || []).filter(x => x.trim()).length > 0 && (
        <Page size="A4" style={[styles.page, dynamicPageStyle]}>
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <View style={{ width: 300 }}>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Lampiran</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text>{data.lampiran || '-'}</Text></View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Nomor</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text>{fullNomor}</Text></View>
              </View>
              <View style={styles.infoRow}>
                <View style={styles.infoLabel}><Text>Tanggal</Text></View>
                <View style={styles.infoColon}><Text>:</Text></View>
                <View style={styles.infoValue}><Text>{fmtDateId(data.tanggal)}</Text></View>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
            DAFTAR PENERIMA / UNDANGAN
          </Text>

          <View style={{ marginTop: 10 }}>
            {(data.penerimaDaftar || []).filter(x => x.trim()).map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                <View style={{ width: 25 }}><Text>{idx + 1}.</Text></View>
                <View style={{ flex: 1 }}><Text>{item}</Text></View>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  )
}
