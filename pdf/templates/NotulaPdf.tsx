import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import KopSurat from '@/pdf/components/kop-surat'
import '@/pdf/fonts'

function fmtPangkatGolongan(pangkat?: string | null, golongan?: string | null) {
  const p = (pangkat ?? '').trim()
  const g = (golongan ?? '').trim()
  if (p && /\([^)]+\)/.test(p)) return p
  if (p && !g) return p
  if (p && g) return `${p} (${g})`
  if (!p && g) return g
  return '-'
}

export type PegawaiSigner = {
  id?: string
  nama: string
  nip?: string | null
  jabatan?: string | null
  pangkat?: string | null
  golongan?: string | null
}

export type NotulaPdfData = {
  nomorSurat?: string
  hariTanggal: string
  pukul: string
  suratUndangan: string
  tempat: string
  acara: string
  
  // Pimpinan & Peserta Rapat
  ketuaJabatan: string
  ketuaNama: string
  ketuaPegawaiId?: string
  ketuaNip?: string
  ketuaPangkat?: string
  
  sekretarisJabatan: string
  sekretarisNama: string
  sekretarisPegawaiId?: string
  sekretarisNip?: string
  sekretarisPangkat?: string

  pencatatJabatan: string
  pencatatNama: string
  pencatatPegawaiId?: string
  pencatatNip?: string
  pencatatPangkat?: string

  pesertaRapat: string

  // Display Checkbox Options
  headerTampilkanJabatan?: boolean
  headerTampilkanNama?: boolean
  headerTampilkanNip?: boolean
  headerTampilkanPangkat?: boolean
  ttdTampilkanJabatan?: boolean
  ttdTampilkanPangkat?: boolean
  ttdTampilkanNip?: boolean

  // Unified Content
  isiSurat: string

  penandatanganId?: string
}

export type NotulaPdfProps = {
  data: NotulaPdfData
  signer?: PegawaiSigner | null
  ketuaSigner?: PegawaiSigner | null
  instansiLine1?: string
  instansiLine2?: string
  alamatLine?: string
  layout?: {
    marginTop?: number
    marginBottom?: number
    marginHorizontal?: number
    fontSize?: number
    lineHeight?: number
  }
}

// Clean outer block tags but preserve inline formatting tags
function cleanInlineHtml(html: string): string {
  return html
    .replace(/^<p(?:\s[^>]*)?>/i, '')
    .replace(/<\/p>$/i, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

// ── Inline style renderer (Bold, Italic, Underline, Strikethrough) ───────────
const renderInlineStyles = (html: string): React.ReactNode => {
  if (!html) return null
  const cleaned = cleanInlineHtml(html)
  
  // Match bold, italic, underline, strikethrough, and markdown syntax
  const regex = /(<strong(?:\s[^>]*)?>[\s\S]*?<\/strong>|<b(?:\s[^>]*)?>[\s\S]*?<\/b>|<em(?:\s[^>]*)?>[\s\S]*?<\/em>|<i(?:\s[^>]*)?>[\s\S]*?<\/i>|<u(?:\s[^>]*)?>[\s\S]*?<\/u>|<s(?:\s[^>]*)?>[\s\S]*?<\/s>|<del(?:\s[^>]*)?>[\s\S]*?<\/del>|\*\*[\s\S]*?\*\*|\*[\s\S]*?\*|__[\s\S]*?__|~~[\s\S]*?~~)/gi
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let idx = 0

  while ((m = regex.exec(cleaned)) !== null) {
    if (m.index > last) {
      const plainText = stripHtml(cleaned.slice(last, m.index))
      if (plainText) parts.push(<Text key={idx++}>{plainText}</Text>)
    }
    const full = m[0]
    const inner = stripHtml(full)

    if (/^<(strong|b)/i.test(full) || full.startsWith('**')) {
      parts.push(<Text key={idx++} style={{ fontFamily: 'Helvetica-Bold' }}>{inner}</Text>)
    } else if (/^<(em|i)/i.test(full) || (full.startsWith('*') && !full.startsWith('**'))) {
      parts.push(<Text key={idx++} style={{ fontFamily: 'Helvetica-Oblique' }}>{inner}</Text>)
    } else if (/^<u/i.test(full) || full.startsWith('__')) {
      parts.push(<Text key={idx++} style={{ textDecoration: 'underline' }}>{inner}</Text>)
    } else if (/^<(s|del)/i.test(full) || full.startsWith('~~')) {
      parts.push(<Text key={idx++} style={{ textDecoration: 'line-through' }}>{inner}</Text>)
    } else {
      parts.push(<Text key={idx++}>{inner}</Text>)
    }
    last = m.index + full.length
  }
  if (last < cleaned.length) {
    const plainText = stripHtml(cleaned.slice(last))
    if (plainText) parts.push(<Text key={idx++}>{plainText}</Text>)
  }
  return parts.length === 1 ? parts[0] : <Text>{parts}</Text>
}

const stripHtml = (html: string): string =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()

// ── Stack-based tag finder ────────────────────────────────────────────────────
function findTagEnd(html: string, tagName: string, searchFrom: number): { innerEnd: number; outerEnd: number } | null {
  const openRe = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'gi')
  const closeRe = new RegExp(`<\\/${tagName}>`, 'gi')
  let depth = 1
  let pos = searchFrom

  while (depth > 0) {
    openRe.lastIndex = pos
    closeRe.lastIndex = pos
    const nextOpen = openRe.exec(html)
    const nextClose = closeRe.exec(html)

    if (!nextClose) return null

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      pos = nextOpen.index + nextOpen[0].length
    } else {
      depth--
      if (depth === 0) {
        return { innerEnd: nextClose.index, outerEnd: nextClose.index + nextClose[0].length }
      }
      pos = nextClose.index + nextClose[0].length
    }
  }
  return null
}

function getBulletString(ordered: boolean, depth: number, index: number): string {
  if (!ordered) {
    if (depth === 0) return '•'
    if (depth === 1) return '◦'
    return '-'
  }
  // Hierarchical Numbering:
  // depth 0: 1., 2., 3.
  // depth 1: a., b., c.
  // depth 2: 1), 2), 3)
  // depth >= 3: a), b), c)
  if (depth === 0) {
    return `${index}.`
  } else if (depth === 1) {
    const char = String.fromCharCode(96 + ((index - 1) % 26) + 1)
    return `${char}.`
  } else if (depth === 2) {
    return `${index})`
  } else {
    const char = String.fromCharCode(96 + ((index - 1) % 26) + 1)
    return `${char})`
  }
}

function extractTextAlign(tagHtml: string): 'left' | 'center' | 'right' | 'justify' {
  if (/text-align:\s*center/i.test(tagHtml)) return 'center'
  if (/text-align:\s*right/i.test(tagHtml)) return 'right'
  if (/text-align:\s*left/i.test(tagHtml)) return 'left'
  return 'justify'
}

// ── Main HTML renderer ────────────────────────────────────────────────────────
// Renders ordered/unordered list items, supporting nested lists
function renderListItems(
  html: string,
  ordered: boolean,
  depth: number,
  counterStart: number = 1
): React.ReactNode[] {
  const items: React.ReactNode[] = []
  const liRe = /<li(?:\s[^>]*)?>/gi
  let liMatch: RegExpExecArray | null
  let counter = counterStart - 1

  while ((liMatch = liRe.exec(html)) !== null) {
    const liContentStart = liMatch.index + liMatch[0].length
    const tagEnd = findTagEnd(html, 'li', liContentStart)
    if (!tagEnd) continue
    counter++

    const liInner = html.slice(liContentStart, tagEnd.innerEnd)

    // Find nested list inside this <li>
    const nestedListRe = /<(ul|ol)(?:\s[^>]*)?>/i
    const nestedMatch = nestedListRe.exec(liInner)

    let directHtml = liInner
    let nestedNode: React.ReactNode = null

    if (nestedMatch) {
      directHtml = liInner.slice(0, nestedMatch.index)
      const nestedTag = nestedMatch[1].toLowerCase()
      const nestedIsOrdered = nestedTag === 'ol'
      const nestedContentStart = nestedMatch.index + nestedMatch[0].length
      const nestedEnd = findTagEnd(liInner, nestedTag, nestedContentStart)
      if (nestedEnd) {
        const nestedInner = liInner.slice(nestedContentStart, nestedEnd.innerEnd)
        const nestedItems = renderListItems(nestedInner, nestedIsOrdered, depth + 1)
        nestedNode = (
          <View style={{ marginTop: 2 }}>
            {nestedItems}
          </View>
        )
      }
    }

    const bulletStr = getBulletString(ordered, depth, counter)
    const bulletWidth = 12
    // Hierarchical Indentation relative to container:
    // depth === 0 (1.): 9pt (sejajar lurus dengan huruf P pada "I. ")
    // depth > 0 (a., 1), etc.): 12pt (sejajar lurus dengan huruf awal teks parent item)
    const paddingLeft = depth === 0 ? 9 : 12
    const textAlign = extractTextAlign(liMatch[0])

    items.push(
      <View key={counter} style={{ marginBottom: 3, paddingLeft }}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ width: bulletWidth, flexShrink: 0, fontFamily: 'Helvetica' }}>{bulletStr}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ textAlign, fontFamily: 'Helvetica' }}>
              {renderInlineStyles(directHtml)}
            </Text>
          </View>
        </View>
        {nestedNode}
      </View>
    )

    // Advance liRe past this <li>...</li>
    liRe.lastIndex = tagEnd.outerEnd
  }

  return items
}

// Parses top-level block elements and returns React PDF nodes
function renderBlocks(html: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  const BLOCK_TAGS = ['h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'p', 'table', 'blockquote']
  const blockRe = new RegExp(`<(${BLOCK_TAGS.join('|')})(?:\\s[^>]*)?>`, 'gi')
  let m: RegExpExecArray | null
  let elemIdx = 0

  while ((m = blockRe.exec(html)) !== null) {
    const tagName = m[1].toLowerCase()
    const contentStart = m.index + m[0].length
    const tagEnd = findTagEnd(html, tagName, contentStart)
    if (!tagEnd) continue

    const innerHtml = html.slice(contentStart, tagEnd.innerEnd)
    const key = elemIdx++
    const textAlign = extractTextAlign(m[0])

    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
      const fontSize = tagName === 'h1' ? 11 : tagName === 'h2' ? 10.5 : 10
      const marginTop = tagName === 'h1' ? 10 : 6
      elements.push(
        <Text key={key} style={{ fontFamily: 'Helvetica-Bold', fontSize, marginTop, marginBottom: 4, textAlign, paddingLeft: 0 }}>
          {renderInlineStyles(innerHtml)}
        </Text>
      )
    } else if (tagName === 'p') {
      const text = cleanInlineHtml(innerHtml)
      if (!text.trim()) { blockRe.lastIndex = tagEnd.outerEnd; continue }
      elements.push(
        <Text key={key} style={{ marginBottom: 4, textAlign, fontFamily: 'Helvetica', paddingLeft: 0 }}>
          {renderInlineStyles(innerHtml)}
        </Text>
      )
    } else if (tagName === 'ul' || tagName === 'ol') {
      const isOrdered = tagName === 'ol'
      const listItems = renderListItems(innerHtml, isOrdered, 0)
      elements.push(
        <View key={key} style={{ marginBottom: 6 }}>
          {listItems}
        </View>
      )
    } else if (tagName === 'table') {
      // Find all rows
      const trItems: React.ReactNode[] = []
      const trRe = /<tr(?:\s[^>]*)?>/gi
      let trM: RegExpExecArray | null
      let trIdx = 0

      // Pre-collect rows to know total count for border
      const rows: { html: string; isHeader: boolean }[] = []
      while ((trM = trRe.exec(innerHtml)) !== null) {
        const trStart = trM.index + trM[0].length
        const trEnd = findTagEnd(innerHtml, 'tr', trStart)
        if (!trEnd) continue
        const trInner = innerHtml.slice(trStart, trEnd.innerEnd)
        rows.push({ html: trInner, isHeader: /<th(?:\s|>)/i.test(trInner) })
        trRe.lastIndex = trEnd.outerEnd
      }

      rows.forEach((row, rIdx) => {
        const cells: React.ReactNode[] = []
        const cellRe = /<(td|th)(?:\s[^>]*)?>/gi
        let cellM: RegExpExecArray | null
        let cIdx = 0
        while ((cellM = cellRe.exec(row.html)) !== null) {
          const cellTag = cellM[1].toLowerCase()
          const cellStart = cellM.index + cellM[0].length
          const cellEnd = findTagEnd(row.html, cellTag, cellStart)
          if (!cellEnd) continue
          const cellInner = row.html.slice(cellStart, cellEnd.innerEnd)
          const localCIdx = cIdx++
          cells.push(
            <View key={localCIdx} style={{ flex: 1, padding: 4, borderRightWidth: localCIdx === cells.length ? 0 : 0.5, borderRightColor: '#000' }}>
              <Text style={{ fontSize: 8, fontFamily: row.isHeader ? 'Helvetica-Bold' : 'Helvetica' }}>
                {stripHtml(cellInner)}
              </Text>
            </View>
          )
          cellRe.lastIndex = cellEnd.outerEnd
        }
        trItems.push(
          <View key={rIdx} style={{ flexDirection: 'row', borderBottomWidth: rIdx === rows.length - 1 ? 0 : 0.5, borderBottomColor: '#000', backgroundColor: row.isHeader ? '#f8fafc' : 'transparent' }}>
            {cells}
          </View>
        )
      })

      elements.push(
        <View key={key} style={{ marginTop: 6, marginBottom: 8, borderWidth: 0.5, borderColor: '#000' }}>
          {trItems}
        </View>
      )
    }

    blockRe.lastIndex = tagEnd.outerEnd
  }

  return elements
}

const renderContent = (content: string): React.ReactNode => {
  if (!content) return null
  const blocks = renderBlocks(content)
  if (blocks.length === 0) return null
  return <View>{blocks}</View>
}

export default function NotulaPdf({
  data,
  signer,
  ketuaSigner,
  instansiLine1 = 'PEMERINTAH KABUPATEN KUTAI BARAT',
  instansiLine2 = 'SEKRETARIAT DAERAH',
  alamatLine = 'Jalan Komplek Perkantoran Pemerintah Kabupaten Kutai Barat. Telepon (0542) 594754\nKode Pos 75576 Fax (0545) 4043843 Website setda.kutaibaratkab.go.id',
  layout
}: NotulaPdfProps) {
  const marginTop = layout?.marginTop ?? 20
  const marginBottom = layout?.marginBottom ?? 30
  const marginHorizontal = layout?.marginHorizontal ?? 45
  const fontSize = layout?.fontSize ?? 10
  const lineHeight = layout?.lineHeight ?? 1.3

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      paddingTop: marginTop,
      paddingBottom: marginBottom,
      paddingHorizontal: marginHorizontal,
      fontSize: fontSize,
      lineHeight: lineHeight,
      color: '#000000',
    },
    title: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      textAlign: 'center',
      marginTop: 0,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaTable: {
      marginBottom: 12,
    },
    metaRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    metaLabel: {
      width: 120,
    },
    metaSeparator: {
      width: 12,
    },
    metaValue: {
      flex: 1,
    },
    signatureContainer: {
      marginTop: 24,
      alignItems: 'flex-end',
    },
    signatureBox: {
      width: 240,
      textAlign: 'center',
    },
    signatureTitle: {
      fontFamily: 'Helvetica',
      textTransform: 'uppercase',
    },
    signatureJabatan: {
      fontFamily: 'Helvetica',
      textTransform: 'uppercase',
      marginBottom: 50,
    },
    signatureName: {
      fontFamily: 'Helvetica-Bold',
      textDecoration: 'underline',
    },
    signatureNip: {
      fontFamily: 'Helvetica',
    }
  })

  // Penandatangan default: signer prop atau ketuaSigner
  const activeSigner = signer || ketuaSigner
  const signerNama = activeSigner?.nama || data.ketuaNama || 'AGUNG SUGARA, SE.,M.Si'
  const signerJabatan = activeSigner?.jabatan || data.ketuaJabatan || 'KEPALA BAGIAN ORGANISASI'
  const signerPangkat = fmtPangkatGolongan(activeSigner?.pangkat, activeSigner?.golongan)
  const signerNip = activeSigner?.nip ? `NIP. ${activeSigner.nip}` : ''

  return (
    <Document title={`Notula - ${data.acara || 'Rapat'}`}>
      <Page size="A4" style={styles.page}>
        {/* Kop Surat Standard */}
        <KopSurat
          instansiLine1={instansiLine1}
          instansiLine2={instansiLine2}
          alamatLine={alamatLine}
        />

        {/* Title */}
        <Text style={styles.title}>NOTULA</Text>

        {/* Header Metadata */}
        <View style={styles.metaTable}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Hari/Tanggal</Text>
            <Text style={styles.metaSeparator}>:</Text>
            <Text style={styles.metaValue}>{data.hariTanggal || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Pukul</Text>
            <Text style={styles.metaSeparator}>:</Text>
            <Text style={styles.metaValue}>{data.pukul || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Surat Undangan</Text>
            <Text style={styles.metaSeparator}>:</Text>
            <Text style={styles.metaValue}>{data.suratUndangan || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Tempat</Text>
            <Text style={styles.metaSeparator}>:</Text>
            <Text style={styles.metaValue}>{data.tempat || '-'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Acara</Text>
            <Text style={styles.metaSeparator}>:</Text>
            <Text style={styles.metaValue}>{data.acara || '-'}</Text>
          </View>
        </View>

        {/* Pimpinan Rapat */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>PIMPINAN RAPAT</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Ketua</Text>
            <Text style={styles.metaSeparator}>:</Text>
            <Text style={styles.metaValue}>
              {(() => {
                const showJabatan = data.headerTampilkanJabatan !== false
                const showNama = data.headerTampilkanNama !== false
                const showNip = Boolean(data.headerTampilkanNip)
                const showPangkat = Boolean(data.headerTampilkanPangkat)

                const parts: string[] = []
                if (showJabatan && data.ketuaJabatan?.trim()) {
                  if (showNama && data.ketuaNama?.trim()) {
                    parts.push(`${data.ketuaJabatan.trim()} (${data.ketuaNama.trim()})`)
                  } else {
                    parts.push(data.ketuaJabatan.trim())
                  }
                } else if (showNama && data.ketuaNama?.trim()) {
                  parts.push(data.ketuaNama.trim())
                }

                if (showPangkat && (data.ketuaPangkat || ketuaSigner?.pangkat)) {
                  const p = fmtPangkatGolongan(data.ketuaPangkat || ketuaSigner?.pangkat, ketuaSigner?.golongan)
                  if (p !== '-') parts.push(`- ${p}`)
                }

                if (showNip && (data.ketuaNip || ketuaSigner?.nip)) {
                  parts.push(`- NIP. ${data.ketuaNip || ketuaSigner?.nip}`)
                }

                return parts.join(' ') || '-'
              })()}
            </Text>
          </View>

          {(data.sekretarisJabatan || data.sekretarisNama) ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Sekretaris</Text>
              <Text style={styles.metaSeparator}>:</Text>
              <Text style={styles.metaValue}>
                {(() => {
                  const showJabatan = data.headerTampilkanJabatan !== false
                  const showNama = data.headerTampilkanNama !== false
                  const showNip = Boolean(data.headerTampilkanNip)

                  const parts: string[] = []
                  if (showJabatan && data.sekretarisJabatan?.trim()) {
                    if (showNama && data.sekretarisNama?.trim()) {
                      parts.push(`${data.sekretarisJabatan.trim()} (${data.sekretarisNama.trim()})`)
                    } else {
                      parts.push(data.sekretarisJabatan.trim())
                    }
                  } else if (showNama && data.sekretarisNama?.trim()) {
                    parts.push(data.sekretarisNama.trim())
                  }

                  if (showNip && data.sekretarisNip) {
                    parts.push(`- NIP. ${data.sekretarisNip}`)
                  }

                  return parts.join(' ') || '-'
                })()}
              </Text>
            </View>
          ) : null}

          {(data.pencatatJabatan || data.pencatatNama) ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pencatat</Text>
              <Text style={styles.metaSeparator}>:</Text>
              <Text style={styles.metaValue}>
                {(() => {
                  const showJabatan = data.headerTampilkanJabatan !== false
                  const showNama = data.headerTampilkanNama !== false
                  const showNip = Boolean(data.headerTampilkanNip)

                  const parts: string[] = []
                  if (showJabatan && data.pencatatJabatan?.trim()) {
                    if (showNama && data.pencatatNama?.trim()) {
                      parts.push(`${data.pencatatJabatan.trim()} (${data.pencatatNama.trim()})`)
                    } else {
                      parts.push(data.pencatatJabatan.trim())
                    }
                  } else if (showNama && data.pencatatNama?.trim()) {
                    parts.push(data.pencatatNama.trim())
                  }

                  if (showNip && data.pencatatNip) {
                    parts.push(`- NIP. ${data.pencatatNip}`)
                  }

                  return parts.join(' ') || '-'
                })()}
              </Text>
            </View>
          ) : null}

          {data.pesertaRapat ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Peserta Rapat</Text>
              <Text style={styles.metaSeparator}>:</Text>
              <Text style={styles.metaValue}>{data.pesertaRapat}</Text>
            </View>
          ) : null}
        </View>

        {/* Unified WYSIWYG Content */}
        <View>
          {renderContent(data.isiSurat)}
        </View>

        {/* Signer Block */}
        <View wrap={false} style={styles.signatureContainer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>PIMPINAN RAPAT</Text>
            {data.ttdTampilkanJabatan !== false && signerJabatan ? (
              <Text style={styles.signatureJabatan}>{signerJabatan}</Text>
            ) : (
              <View style={{ marginBottom: 50 }} />
            )}
            <Text style={styles.signatureName}>{signerNama}</Text>
            {data.ttdTampilkanPangkat && signerPangkat && signerPangkat !== '-' && (
              <Text style={styles.signatureNip}>{signerPangkat}</Text>
            )}
            {data.ttdTampilkanNip && signerNip && (
              <Text style={styles.signatureNip}>{signerNip}</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}
