import prisma from '@/lib/prisma'
import { SpjType } from '@prisma/client'

export type CreateSpjInput = {
  subKegiatanId: string
  teamId: string
  type: SpjType
  driveUrl?: string
  nomorBku?: string
  pengeluaranDetails: {
    itemName: string
    qty: number
    hargaSatuan: number
    pegawaiId?: string
  }[]
  // Modul spesifik
  perjadinData?: any
  makanMinumData?: any
}

export const SpjService = {
  /**
   * Siklus Transaksi Database (Prisma $transaction)
   */
  async createSpj(input: CreateSpjInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Locking Saldo (In a real app, you might use raw SQL FOR UPDATE if high concurrency is needed)
      const subKegiatan = await tx.subKegiatan.findUnique({
        where: { id: input.subKegiatanId }
      })

      if (!subKegiatan) throw new Error("SubKegiatan tidak ditemukan")

      // 2. Kalkulasi Nominal
      const totalPengeluaran = input.pengeluaranDetails.reduce((sum, item) => {
        return sum + (item.qty * item.hargaSatuan)
      }, 0)

      // 3. Validasi Saldo
      if (subKegiatan.sisaSaldo < totalPengeluaran) {
        throw new Error("Saldo Tidak Mencukupi")
      }

      // 4. Eksekusi Mutasi
      // a. Kurangi sisaSaldo di tabel SubKegiatan
      await tx.subKegiatan.update({
        where: { id: input.subKegiatanId },
        data: {
          sisaSaldo: {
            decrement: totalPengeluaran
          }
        }
      })

      // b. Simpan baris data induk Spj dan detail pengeluaran
      const spj = await tx.spj.create({
        data: {
          subKegiatanId: input.subKegiatanId,
          teamId: input.teamId,
          totalPengeluaran,
          type: input.type,
          driveUrl: input.driveUrl,
          nomorBku: input.nomorBku,
          pengeluaranDetails: {
            create: input.pengeluaranDetails
          }
        }
      })

      // c. Simpan data spesifik modul (Bisa dikembangkan lebih lanjut dengan Zod validasi per tipe)
      if (input.type === 'PERJADIN' && input.perjadinData) {
        await tx.spjPerjadin.create({
          data: {
            spjId: spj.id,
            ...input.perjadinData
          }
        })
      } else if (input.type === 'MAKAN_MINUM' && input.makanMinumData) {
        await tx.spjMakanMinum.create({
          data: {
            spjId: spj.id,
            ...input.makanMinumData
          }
        })
      }

      return spj
    })
  },

  /**
   * Mekanisme Penghapusan SPJ (Buku Besar Langsung)
   */
  async deleteSpj(spjId: string) {
    return await prisma.$transaction(async (tx) => {
      const spj = await tx.spj.findUnique({
        where: { id: spjId },
        select: { id: true, subKegiatanId: true, totalPengeluaran: true }
      })

      if (!spj) throw new Error("SPJ tidak ditemukan")

      // Jika dihapus, kembalikan saldo utuh otomatis
      await tx.subKegiatan.update({
        where: { id: spj.subKegiatanId },
        data: {
          sisaSaldo: {
            increment: spj.totalPengeluaran
          }
        }
      })

      // Hapus SPJ (Relasi Cascade akan menghapus detail pecahan dan modul ekstensi)
      await tx.spj.delete({
        where: { id: spjId }
      })

      return true
    })
  }
}
