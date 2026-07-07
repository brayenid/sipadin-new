"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatCurrency } from "@/lib/utils";

export async function saveDopdTransaction(spjId: string, dopdItems: any[], dopdMeta?: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // 1. Ambil data SPJ saat ini
    const spj = await tx.spj.findUnique({
      where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) },
      include: { kodeRekening: true }
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
      if (spj.kodeRekening.sisaSaldo < diff) {
        throw new Error(`Saldo Kode Rekening tidak mencukupi untuk penambahan DOPD ini. Sisa Saldo: ${formatCurrency(spj.kodeRekening.sisaSaldo)}`);
      }
    }

    // 4. Update Saldo (Kurangi atau Tambah kembali jika minus)
    await tx.kodeRekening.update({
      where: { id: spj.kodeRekeningId },
      data: {
        sisaSaldo: {
          decrement: diff,
        }
      }
    });

    // 5. Update Total Pengeluaran di SPJ
    const newMeta = spj.metaDokumen ? { ...(spj.metaDokumen as any) } : {};
    if (dopdMeta) {
      newMeta.dopd = { ...newMeta.dopd, ...dopdMeta };
    }

    await tx.spj.update({
      where: { id: spj.id },
      data: {
        totalPengeluaran: newTotalDopd,
        ...(dopdMeta ? { metaDokumen: newMeta } : {})
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

export async function saveDopdHonorarium(spjId: string, dopdItems: any[], dopdMeta?: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // 1. Ambil data SPJ saat ini
    const spj = await tx.spj.findUnique({
      where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) },
      include: { kodeRekening: true }
    });

    if (!spj) throw new Error("SPJ tidak ditemukan.");

    // 2. Hitung total biaya DOPD yang baru
    let newTotalDopd = BigInt(0);
    const validItemsToInsert = dopdItems.map(item => {
      const hargaSatuan = BigInt(item.hargaSatuan);
      let multiplier = 1;
      if (item.faktorPengali && Array.isArray(item.faktorPengali)) {
        item.faktorPengali.forEach((f: any) => {
          multiplier *= (parseInt(f.value, 10) || 1);
        });
      }
      const itemTotal = hargaSatuan * BigInt(multiplier);
      newTotalDopd += itemTotal;

      return {
        id: item.id,
        spjRosterItemId: item.spjRosterItemId,
        kategori: item.kategori,
        uraian: item.uraian,
        hargaSatuan: hargaSatuan.toString(),
        total: itemTotal.toString(),
        faktorPengali: item.faktorPengali,
      };
    });

    // 3. Hitung total biaya Honorarium dari metaDokumen
    let totalHonor = BigInt(0);
    const meta = spj.metaDokumen && typeof spj.metaDokumen === 'object' ? (spj.metaDokumen as any) : {};
    
    if (meta.daftarTandaTerima && meta.daftarTandaTerima.tandaTerimaData) {
      const narasumberData = Object.values(meta.daftarTandaTerima.tandaTerimaData) as any[];
      narasumberData.forEach((row: any) => {
        const jumlah = (row.hargaSatuan || 0) * (row.kuantitas || 0);
        totalHonor += BigInt(jumlah);
      });
    }

    const newGrandTotal = totalHonor + newTotalDopd;
    const oldTotal = spj.totalPengeluaran;
    const diff = newGrandTotal - oldTotal;

    // 4. Validasi Saldo Pagu
    if (diff > BigInt(0)) {
      if (spj.kodeRekening.sisaSaldo < diff) {
        throw new Error(`Saldo Kode Rekening tidak mencukupi untuk penambahan DOPD ini. Sisa Saldo: ${formatCurrency(spj.kodeRekening.sisaSaldo)}`);
      }
    }

    // 5. Update Saldo (Kurangi atau Tambah kembali jika minus)
    if (diff !== BigInt(0)) {
      await tx.kodeRekening.update({
        where: { id: spj.kodeRekeningId },
        data: {
          sisaSaldo: {
            decrement: diff,
          }
        }
      });
    }

    // 6. Update Total Pengeluaran di SPJ dan simpan JSON DOPD
    const newMeta = { ...meta };
    newMeta.dopdHonorarium = {
      ...dopdMeta,
      items: validItemsToInsert
    };

    await tx.spj.update({
      where: { id: spj.id },
      data: {
        totalPengeluaran: newGrandTotal,
        metaDokumen: newMeta
      }
    });

    return true;
  });
}

