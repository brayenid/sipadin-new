"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveDopdTransaction(spjId: string, dopdItems: any[]) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // 1. Ambil data SPJ saat ini
    const spj = await tx.spj.findUnique({
      where: { id: spjId, teamId: session.user.teamId },
      include: { subKegiatan: true }
    });

    if (!spj) throw new Error("SPJ tidak ditemukan.");

    // 2. Hitung total biaya yang baru
    let newTotalDopd = BigInt(0);
    const validItemsToInsert = dopdItems.map(item => {
      const hargaSatuan = BigInt(item.hargaSatuan);
      // Faktor pengali kalkulasi total
      let multiplier = 1;
      if (item.faktorPengali && Array.isArray(item.faktorPengali)) {
        item.faktorPengali.forEach((f: any) => {
          multiplier *= (parseInt(f.value, 10) || 1);
        });
      }
      const itemTotal = hargaSatuan * BigInt(multiplier);
      newTotalDopd += itemTotal;

      return {
        spjId: spj.id,
        spjRosterItemId: item.spjRosterItemId,
        kategori: item.kategori,
        uraian: item.uraian,
        hargaSatuan,
        total: itemTotal,
        faktorPengali: item.faktorPengali,
        // qty dan satuan diset default karena kita pakai faktorPengali Json
        qty: 1,
        satuan: "-",
      };
    });

    // 3. Validasi Saldo Pagu
    // Cari selisih
    const oldTotal = spj.totalPengeluaran;
    const diff = newTotalDopd - oldTotal;

    if (diff > BigInt(0)) {
      // Jika bertambah, pastikan sisa saldo mencukupi
      if (spj.subKegiatan.sisaSaldo < diff) {
        throw new Error(`Saldo Sub-Kegiatan tidak mencukupi untuk penambahan DOPD ini. Sisa Saldo: Rp ${spj.subKegiatan.sisaSaldo.toString()}`);
      }
    }

    // 4. Update Saldo (Kurangi atau Tambah kembali jika minus)
    await tx.subKegiatan.update({
      where: { id: spj.subKegiatanId },
      data: {
        sisaSaldo: {
          decrement: diff,
        }
      }
    });

    // 5. Update Total Pengeluaran di SPJ
    await tx.spj.update({
      where: { id: spj.id },
      data: {
        totalPengeluaran: newTotalDopd
      }
    });

    // 6. Hapus semua DOPD lama (khusus Perjadin / yang punya rosterItemId)
    await tx.spjPengeluaranDetail.deleteMany({
      where: { 
        spjId: spj.id,
        spjRosterItemId: { not: null }
      }
    });

    // 7. Insert DOPD baru
    if (validItemsToInsert.length > 0) {
      await tx.spjPengeluaranDetail.createMany({
        data: validItemsToInsert
      });
    }

    return true;
  });
}
