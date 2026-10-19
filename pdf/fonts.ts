import { Font } from '@react-pdf/renderer'
import path from 'path'

// Disable auto-hyphenation across all PDF documents so words are not broken with hyphens (e.g. den-gan)
Font.registerHyphenationCallback(word => [word])

const isServer = typeof window === 'undefined'
const getFontPath = (fileName: string) => {
  if (isServer) {
    return path.join(process.cwd(), 'public', 'fonts', fileName)
  }
  return `/fonts/${fileName}`
}

// Daftarkan font yang dibutuhkan untuk PDF
Font.register({
  family: 'Bookman',
  fonts: [
    { src: getFontPath('bookman.ttf') },
    { src: getFontPath('bookman-bold.ttf'), fontWeight: 'bold' }
  ]
})

Font.register({
  family: 'Arial',
  fonts: [
    { src: getFontPath('arial.ttf') },
    { src: getFontPath('arial-bold.ttf'), fontWeight: 'bold' }
  ]
})
