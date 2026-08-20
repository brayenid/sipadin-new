import 'dotenv/config'
import { PrismaClient, KategoriAgenda, StatusAgenda } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('🚀 Memulai seeding data pengingat pakaian dinas ASN Tahun 2026...')

  // Dapatkan seluruh team dan admin/user
  const teams = await prisma.team.findMany({
    include: {
      users: {
        take: 1
      }
    }
  })

  if (teams.length === 0) {
    console.error('❌ Tidak ditemukan team dalam database.')
    return
  }

  // Hapus data pengingat pakaian dinas lama
  const deleted = await prisma.agendaTim.deleteMany({
    where: {
      kategori: KategoriAgenda.PENGINGAT,
      judul: {
        in: [
          'PDH Khaki',
          'PDH Kemeja Putih',
          'Seragam Batik KORPRI',
          'Wastra Khas Kutai Barat',
          'Batik Motif Khas Kutai Barat',
          'PDH Batik / Tenun / Lurik',
          'Upacara Tanggal 17 - Batik KORPRI',
          'Hari Batik Nasional'
        ]
      }
    }
  })
  console.log(`🧹 Membersihkan ${deleted.count} data pengingat lama...`)

  const year = 2026
  const allItems: Array<{
    judul: string
    kategori: KategoriAgenda
    tanggalMulai: Date
    tanggalSelesai: Date | null
    waktuMulai: string
    waktuSelesai: string
    lokasi: string
    deskripsi: string
    pic: string
    status: StatusAgenda
    teamId: string
    createdById: string
  }> = []

  for (const team of teams) {
    const user = team.users[0]
    if (!user) continue

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()

      // Cari hari Senin pertama di bulan ini
      let firstMondayDay = 1
      for (let day = 1; day <= 7; day++) {
        const checkDate = new Date(year, month, day)
        if (checkDate.getDay() === 1) {
          firstMondayDay = day
          break
        }
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const currDate = new Date(Date.UTC(year, month, day, 0, 0, 0))
        const dayOfWeek = new Date(year, month, day).getDay() // 0: Min, 1: Sen, ..., 6: Sab

        const isTanggal17 = day === 17
        const isHariBatikNasional = month === 9 && day === 2 // 2 Oktober

        // Hanya hari kerja (Senin - Jumat)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          let judul = ''
          let deskripsi = ''

          if (isHariBatikNasional) {
            judul = 'Hari Batik Nasional'
            deskripsi = 'Peringatan Hari Batik Nasional - Wajib mengenakan Pakaian Batik.'
          } else if (dayOfWeek === 1 || dayOfWeek === 2) {
            // Senin & Selasa
            judul = 'PDH Khaki'
            deskripsi =
              'Pakaian Dinas Harian Khaki. Kemeja lengan pendek bagi ASN pria dimasukkan ke dalam celana.'
          } else if (dayOfWeek === 3) {
            // Rabu
            judul = 'PDH Kemeja Putih'
            deskripsi =
              'Pakaian Dinas Harian Kemeja Putih (celana/rok gelap). Kemeja lengan pendek bagi ASN pria dimasukkan ke dalam celana.'
          } else if (dayOfWeek === 4) {
            // Kamis
            if (day < firstMondayDay) {
              // Kamis sebelum Senin pertama (awal bulan parsial)
              judul = 'PDH Batik / Tenun / Lurik'
              deskripsi = 'Pakaian Dinas Harian Batik / Tenun / Lurik.'
            } else {
              // Hitung minggu kerja ke-N (Senin pertama = Minggu 1)
              const weekIndex = Math.floor((day - firstMondayDay) / 7) + 1

              if (weekIndex === 1) {
                judul = 'Seragam Batik KORPRI'
                deskripsi =
                  'Pakaian Seragam Batik Korps Pegawai Republik Indonesia (digunakan setiap hari Kamis minggu pertama).'
              } else if (weekIndex === 2 || weekIndex === 3) {
                judul = 'Wastra Khas Kutai Barat'
                deskripsi =
                  'Pakaian berbahan dasar / kombinasi wastra khas Kutai Barat (Kriookng, Tenun Doyo, Sulam Tumpar, Ulap Sarut, Tenun Badong).'
              } else if (weekIndex === 4) {
                judul = 'Batik Motif Khas Kutai Barat'
                deskripsi = 'Pakaian Batik motif khas Kabupaten Kutai Barat.'
              } else {
                // Minggu ke-5
                judul = 'PDH Batik / Tenun / Lurik'
                deskripsi = 'Pakaian Dinas Harian Batik / Tenun / Lurik.'
              }
            }
          } else if (dayOfWeek === 5) {
            // Jumat
            judul = 'PDH Batik / Tenun / Lurik'
            deskripsi = 'Pakaian Dinas Harian Batik / Tenun / Lurik.'
          }

          if (judul) {
            allItems.push({
              judul,
              kategori: KategoriAgenda.PENGINGAT,
              tanggalMulai: currDate,
              tanggalSelesai: null,
              waktuMulai: '07:30',
              waktuSelesai: '16:00',
              lokasi: 'Kantor / Instansi',
              deskripsi,
              pic: 'Seluruh Pegawai ASN',
              status: StatusAgenda.DIRENCANAKAN,
              teamId: team.id,
              createdById: user.id
            })
          }

          // Pengingat Upacara Tanggal 17 jika hari kerja dan belum KORPRI
          if (isTanggal17 && judul !== 'Seragam Batik KORPRI') {
            allItems.push({
              judul: 'Upacara Tanggal 17 - Batik KORPRI',
              kategori: KategoriAgenda.PENGINGAT,
              tanggalMulai: currDate,
              tanggalSelesai: null,
              waktuMulai: '07:30',
              waktuSelesai: '09:00',
              lokasi: 'Halaman Kantor / Lapangan Upacara',
              deskripsi:
                'Pakaian Seragam Batik Korps Pegawai Republik Indonesia (KORPRI) lengkap untuk Upacara Tanggal 17 Setiap Bulan.',
              pic: 'Seluruh Pegawai ASN',
              status: StatusAgenda.DIRENCANAKAN,
              teamId: team.id,
              createdById: user.id
            })
          }
        }
      }
    }
  }

  console.log(`📦 Menyiapkan ${allItems.length} jadwal pengingat pakaian dinas...`)

  // Insert batch
  await prisma.agendaTim.createMany({
    data: allItems
  })

  console.log(
    `✅ Berhasil melakukan seed ${allItems.length} jadwal pengingat pakaian dinas untuk tahun 2026!`
  )

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error('❌ Error saat seeding:', e)
  process.exit(1)
})
