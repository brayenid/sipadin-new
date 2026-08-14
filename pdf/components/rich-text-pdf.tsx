import React from 'react'
import { Text } from '@react-pdf/renderer'

type Props = {
  text?: string | null
  style?: any
}

interface TextSegment {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

/**
 * Clean Parser for HTML tags (<b>bold</b>, <i>italic</i>, <u>underline</u>)
 * and markdown (**bold**, *italic*) without nested tag duplication.
 */
export function parseFormattedText(input: string): TextSegment[] {
  if (!input) return []

  // Clean double markdown stars if pasted or typed repeatedly
  let cleanInput = input
    .replace(/\*\*\*\*/g, '')
    .replace(/<b><\/b>/g, '')
    .replace(/<i><\/i>/g, '')
    .replace(/<u><\/u>/g, '')

  // Tokenizer pattern matching <b>...</b>, <i>...</i>, <u>...</u>, **...**, *...*
  const regex = /(<b>.*?<\/b>|<i>.*?<\/i>|<u>.*?<\/u>|\*\*.*?\*\*|\*.*?\*)/g
  const parts = cleanInput.split(regex)

  const segments: TextSegment[] = []

  for (const part of parts) {
    if (!part) continue

    if (part.startsWith('<b>') && part.endsWith('</b>') && part.length >= 7) {
      segments.push({ text: part.slice(3, -4), bold: true })
    } else if (part.startsWith('<i>') && part.endsWith('</i>') && part.length >= 7) {
      segments.push({ text: part.slice(3, -4), italic: true })
    } else if (part.startsWith('<u>') && part.endsWith('</u>') && part.length >= 7) {
      segments.push({ text: part.slice(3, -4), underline: true })
    } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      segments.push({ text: part.slice(2, -2), bold: true })
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      segments.push({ text: part.slice(1, -1), italic: true })
    } else {
      segments.push({ text: part })
    }
  }

  return segments
}

export function RichPdfText({ text, style }: Props) {
  if (!text) return null

  const segments = parseFormattedText(text)

  return (
    <Text style={style}>
      {segments.map((seg, idx) => {
        let fontFamily = 'Helvetica'
        if (seg.bold && seg.italic) {
          fontFamily = 'Helvetica-BoldOblique'
        } else if (seg.bold) {
          fontFamily = 'Helvetica-Bold'
        } else if (seg.italic) {
          fontFamily = 'Helvetica-Oblique'
        }

        const textDecoration = seg.underline ? 'underline' : 'none'

        return (
          <Text
            key={idx}
            style={{
              fontFamily,
              textDecoration
            }}
          >
            {seg.text}
          </Text>
        )
      })}
    </Text>
  )
}
