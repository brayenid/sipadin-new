"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createSpjTransaction(payload: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const {
    jenisSpj,
    tanggalSpj,
    subKegiatanId,
    nomorBku,
    driveUrl,
    perihal,
    pengeluaranDetails,
    roster,
    spesifik,
  } = payload;

  const totalPengeluaran = BigInt(payload.totalPengeluaran || 0);

  // 1. Transaction Block untuk Keamanan Finansial (Saldo)
  return await prisma.$transaction(async (tx) => {
    // a. Lock and Check SubKegiatan
    const subKeg = await tx.subKegiatan.findFirst({
      where: {
        id: subKegiatanId,
        kegiatan: {
          tahunAnggaran: {
            teamId: session.user.teamId,
          }
        }
      },
    });

    if (!subKeg) {
      throw new Error("Sub-Kegiatan tidak ditemukan atau akses ditolak.");
    }

    // Validasi Saldo (Penting!)
    if (subKeg.sisaSaldo < totalPengeluaran) {
      throw new Error(`Saldo tidak mencukupi! Sisa saldo: Rp ${subKeg.sisaSaldo.toString()}, dibutuhkan: Rp ${totalPengeluaran.toString()}`);
    }

    // b. Kurangi Saldo
    await tx.subKegiatan.update({
      where: { id: subKegiatanId },
      data: {
        sisaSaldo: {
          decrement: totalPengeluaran,
        },
      },
    });

    // c. Buat Data SPJ Induk
    const spj = await tx.spj.create({
      data: {
        jenisSpj,
        tanggalSpj: new Date(tanggalSpj),
        subKegiatanId,
        nomorBku: nomorBku || null,
        perihal: perihal || null,
        driveUrl: driveUrl || null,
        totalPengeluaran,
        teamId: session.user.teamId,
        createdById: session.user.id,
      },
    });

    // d. Insert Rincian Pengeluaran (Jika ada)
    if (pengeluaranDetails && pengeluaranDetails.length > 0) {
      await tx.spjPengeluaranDetail.createMany({
        data: pengeluaranDetails.map((p: any) => ({
          spjId: spj.id,
          uraian: p.uraian,
          hargaSatuan: BigInt(p.hargaSatuan),
          qty: parseInt(p.qty, 10),
          satuan: p.satuan,
          total: BigInt(p.total),
        })),
      });
    }

    // e. Insert Roster Pegawai
    if (roster && roster.length > 0) {
      await tx.spjRosterItem.createMany({
        data: roster.map((r: any, idx: number) => ({
          spjId: spj.id,
          pegawaiId: r.pegawaiId,
          order: idx,
          role: r.role, // 'KEPALA_JALAN' | 'PENGIKUT'
          nama: r.nama,
          nip: r.nip,
          jabatan: r.jabatan,
          golongan: r.golongan,
          pangkat: r.pangkat,
        })),
      });
    }

    // f. Insert Ekstensi Modul Spesifik
    if (jenisSpj === "PERJADIN" && spesifik) {
      await tx.spjPerjadinDetail.create({
        data: {
          spjId: spj.id,
          tempatBerangkat: spesifik.tempatBerangkat || "Sendawar",
          tempatTujuan: spesifik.tempatTujuan,
          tglBerangkat: new Date(spesifik.tglBerangkat),
          tglKembali: new Date(spesifik.tglKembali),
          lamaPerjalanan: parseInt(spesifik.lamaPerjalanan, 10),
          alatAngkut: spesifik.alatAngkut,
          tingkatPerjadin: spesifik.tingkatPerjadin || null,
        },
      });
      if (!spesifik.vendorId) {
        throw new Error("Penyedia / Vendor untuk SPJ Makan Minum belum dipilih.");
      }
      if (!perihal) {
        throw new Error("Perihal / Judul Kegiatan wajib diisi untuk SPJ Makan Minum.");
      }
      
      await tx.spjMaminDetail.create({
        data: {
          spjId: spj.id,
          vendorId: spesifik.vendorId,
          namaRapat: perihal,
          jumlahPeserta: parseInt(spesifik.jumlahPeserta, 10),
        },
      });
    }

    return { success: true, id: spj.id };
  });
}

export async function updateSpjMasterData(spjId: string, payload: { tanggalSpj: string; nomorBku: string; perihal: string; driveUrl: string; terbayar: boolean }) {
  console.log("-> TRIGGER TURBOPACK RECOMPILE: updateSpjMasterData", spjId);
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const spj = await prisma.spj.findFirst({ where: { id: spjId, teamId: session.user.teamId } });
  if (!spj) throw new Error("SPJ tidak ditemukan");

  await prisma.spj.update({
    where: { id: spjId },
    data: {
      tanggalSpj: new Date(payload.tanggalSpj),
      nomorBku: payload.nomorBku || null,
      perihal: payload.perihal || null,
      driveUrl: payload.driveUrl || null,
      terbayar: payload.terbayar,
    }
  });

  revalidatePath(`/dashboard/spj/${spjId}`);
  revalidatePath(`/dashboard/spj`);
}

export async function deleteSpjTransaction(spjId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // 1. Ambil data SPJ untuk mengetahui total pengeluaran dan sub-kegiatan
    const spj = await tx.spj.findFirst({ 
      where: { id: spjId, teamId: session.user.teamId } 
    });
    
    if (!spj) throw new Error("SPJ tidak ditemukan atau akses ditolak.");

    // 2. Kembalikan saldo ke pagu Sub-Kegiatan
    if (spj.totalPengeluaran > BigInt(0)) {
      await tx.subKegiatan.update({
        where: { id: spj.subKegiatanId },
        data: {
          sisaSaldo: {
            increment: spj.totalPengeluaran
          }
        }
      });
    }

    // 3. Hapus SPJ (Relasi OnDelete: Cascade akan menghapus DOPD, Roster, dll secara otomatis)
    await tx.spj.delete({
      where: { id: spj.id }
    });

    return true;
  });
}

