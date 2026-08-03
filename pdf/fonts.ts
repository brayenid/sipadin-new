import { Font } from '@react-pdf/renderer'

// Disable auto-hyphenation across all PDF documents so words are not broken with hyphens (e.g. den-gan)
Font.registerHyphenationCallback(word => [word])

// Daftarkan font yang dibutuhkan untuk PDF
Font.register({
  family: 'Bookman',
  fonts: [
    { src: '/fonts/bookman.ttf' },
    { src: '/fonts/bookman-bold.ttf', fontWeight: 'bold' }
  ]
})

Font.register({
  family: 'Arial',
  fonts: [
    { src: '/fonts/arial.ttf' },
    { src: '/fonts/arial-bold.ttf', fontWeight: 'bold' }
  ]
})
