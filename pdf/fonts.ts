import { Font } from '@react-pdf/renderer'

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
