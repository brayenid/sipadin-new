"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseWitaInput } from "@/lib/date-utils";

export async function createSpjTransaction(payload: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const {
    jenisSpj,
    tanggalSpj,
    kodeRekeningId,
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
    // a. Lock and Check KodeRekening
    const rek = await tx.kodeRekening.findFirst({
      where: {
        id: kodeRekeningId,
        ...(session.user.role !== 'SUPER_ADMIN' ? {
          subKegiatan: {
            users: {
              some: { 
                id: session.user.id
              }
            }
          }
        } : {})
      },
    });

    if (!rek) {
      throw new Error("Kode Rekening tidak ditemukan atau akses ditolak.");
    }

    // Validasi Saldo (Penting!)
    if (rek.sisaSaldo < totalPengeluaran) {
      throw new Error(`Saldo tidak mencukupi! Sisa saldo: Rp ${rek.sisaSaldo.toString()}, dibutuhkan: Rp ${totalPengeluaran.toString()}`);
    }

    // b. Kurangi Saldo
    await tx.kodeRekening.update({
      where: { id: kodeRekeningId },
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
        tanggalSpj: parseWitaInput(tanggalSpj) || new Date(),
        kodeRekeningId,
        nomorBku: nomorBku || null,
        perihal: perihal || null,
        driveUrl: driveUrl || null,
        totalPengeluaran,
        teamId: (session.user.role === 'SUPER_ADMIN' && payload.teamId) ? payload.teamId : session.user.teamId,
        createdById: (session.user.role === 'SUPER_ADMIN' && payload.userId) ? payload.userId : session.user.id,
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
      const dKembali = parseWitaInput(spesifik.tglKembali) || new Date();
      const dBerangkat = parseWitaInput(spesifik.tglBerangkat) || new Date();
      const msDiff = dKembali.getTime() - dBerangkat.getTime();
      const calcLama = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)) + 1);
      
      await tx.spjPerjadinDetail.create({
        data: {
          spjId: spj.id,
          tempatBerangkat: spesifik.tempatBerangkat || "Sendawar",
          tempatTujuan: spesifik.tempatTujuan,
          tglBerangkat: dBerangkat,
          tglKembali: dKembali,
          lamaPerjalanan: calcLama,
          alatAngkut: spesifik.alatAngkut || "Darat",
          tingkatPerjadin: spesifik.tingkatPerjadin || null,
        },
      });
    } else if (jenisSpj === "MAMIN" && spesifik) {
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

export async function updateSpjMasterData(spjId: string, payload: any) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    const spj = await tx.spj.findFirst({ where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) }, include: { perjadinDetail: true } });
    if (!spj) throw new Error("SPJ tidak ditemukan");

    // Handle perpindahan Kode Rekening
    if (payload.kodeRekeningId && payload.kodeRekeningId !== spj.kodeRekeningId) {
      const newRek = await tx.kodeRekening.findUnique({ where: { id: payload.kodeRekeningId } });
      if (!newRek) throw new Error("Kode Rekening tujuan tidak ditemukan");

      if (newRek.sisaSaldo < spj.totalPengeluaran) {
        throw new Error(`Saldo Rekening Baru tidak cukup! (Dibutuhkan: Rp ${spj.totalPengeluaran.toString()}, Tersedia: Rp ${newRek.sisaSaldo.toString()})`);
      }

      // Kembalikan dana ke rekening lama
      await tx.kodeRekening.update({
        where: { id: spj.kodeRekeningId },
        data: { sisaSaldo: { increment: spj.totalPengeluaran } }
      });

      // Potong dana dari rekening baru
      await tx.kodeRekening.update({
        where: { id: payload.kodeRekeningId },
        data: { sisaSaldo: { decrement: spj.totalPengeluaran } }
      });
    }

    await tx.spj.update({
      where: { id: spjId },
      data: {
        tanggalSpj: parseWitaInput(payload.tanggalSpj) || new Date(),
        kodeRekeningId: payload.kodeRekeningId || spj.kodeRekeningId,
        nomorBku: payload.nomorBku || null,
        perihal: payload.perihal || null,
        driveUrl: payload.driveUrl || null,
        terbayar: payload.terbayar,
      }
    });

    if (spj.jenisSpj === "PERJADIN" && payload.tempatBerangkat) {
      const dKembali = parseWitaInput(payload.tglKembali) || new Date();
      const dBerangkat = parseWitaInput(payload.tglBerangkat) || new Date();
      const msDiff = dKembali.getTime() - dBerangkat.getTime();
      const calcLama = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)) + 1);
      await tx.spjPerjadinDetail.update({
        where: { spjId: spj.id },
        data: {
          tempatBerangkat: payload.tempatBerangkat,
          tempatTujuan: payload.tempatTujuan,
          tglBerangkat: dBerangkat,
          tglKembali: dKembali,
          lamaPerjalanan: calcLama,
          alatAngkut: payload.alatAngkut,
        }
      });
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
      where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) } 
    });
    
    if (!spj) throw new Error("SPJ tidak ditemukan atau akses ditolak.");

    // 2. Kembalikan saldo ke pagu Kode Rekening
    if (spj.totalPengeluaran > BigInt(0)) {
      await tx.kodeRekening.update({
        where: { id: spj.kodeRekeningId },
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

export async function duplicateSpjTransaction(spjId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // 1. Ambil data original
    const spj = await tx.spj.findFirst({
      where: { id: spjId, ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }) },
      include: {
        perjadinDetail: true,
        maminDetail: true,
        roster: true,
        pengeluaranDetails: true,
      }
    });

    if (!spj) throw new Error("SPJ tidak ditemukan atau akses ditolak.");

    // 2. Validasi Saldo
    const rek = await tx.kodeRekening.findUnique({ where: { id: spj.kodeRekeningId } });
    if (!rek) throw new Error("Kode Rekening tidak ditemukan.");
    if (rek.sisaSaldo < spj.totalPengeluaran) {
      throw new Error(`Saldo tidak mencukupi untuk menduplikasi SPJ ini! Sisa saldo: Rp ${rek.sisaSaldo.toString()}, dibutuhkan: Rp ${spj.totalPengeluaran.toString()}`);
    }

    // 3. Kurangi Saldo
    if (spj.totalPengeluaran > BigInt(0)) {
      await tx.kodeRekening.update({
        where: { id: spj.kodeRekeningId },
        data: {
          sisaSaldo: {
            decrement: spj.totalPengeluaran
          }
        }
      });
    }

    // 4. Buat SPJ Baru
    const newSpj = await tx.spj.create({
      data: {
        jenisSpj: spj.jenisSpj,
        perihal: spj.perihal ? `${spj.perihal} (Salinan)` : "(Salinan)",
        kodeRekeningId: spj.kodeRekeningId,
        teamId: spj.teamId,
        createdById: session.user.id,
        totalPengeluaran: spj.totalPengeluaran,
        metaDokumen: spj.metaDokumen ? JSON.parse(JSON.stringify(spj.metaDokumen)) : null,
        // nomorBku & driveUrl dibiarkan default/null karena ini transaksi baru
      }
    });

    // 5. Salin Relasi Spesifik
    if (spj.perjadinDetail) {
      await tx.spjPerjadinDetail.create({
        data: {
          spjId: newSpj.id,
          tempatBerangkat: spj.perjadinDetail.tempatBerangkat,
          tempatTujuan: spj.perjadinDetail.tempatTujuan,
          tglBerangkat: spj.perjadinDetail.tglBerangkat,
          tglKembali: spj.perjadinDetail.tglKembali,
          lamaPerjalanan: spj.perjadinDetail.lamaPerjalanan,
          alatAngkut: spj.perjadinDetail.alatAngkut,
          tingkatPerjadin: spj.perjadinDetail.tingkatPerjadin,
        }
      });
    }

    if (spj.maminDetail) {
      await tx.spjMaminDetail.create({
        data: {
          spjId: newSpj.id,
          vendorId: spj.maminDetail.vendorId,
          namaRapat: spj.maminDetail.namaRapat,
          jumlahPeserta: spj.maminDetail.jumlahPeserta,
        }
      });
    }

    // 6. Salin Roster & Map IDs
    const rosterMap = new Map<string, string>();
    if (spj.roster.length > 0) {
      for (const r of spj.roster) {
        const newRoster = await tx.spjRosterItem.create({
          data: {
            spjId: newSpj.id,
            pegawaiId: r.pegawaiId,
            order: r.order,
            role: r.role,
            nama: r.nama,
            nip: r.nip,
            jabatan: r.jabatan,
            golongan: r.golongan,
            pangkat: r.pangkat,
          }
        });
        rosterMap.set(r.id, newRoster.id);
      }
    }

    // 7. Salin Rincian Pengeluaran
    if (spj.pengeluaranDetails.length > 0) {
      for (const pd of spj.pengeluaranDetails) {
        await tx.spjPengeluaranDetail.create({
          data: {
            spjId: newSpj.id,
            spjRosterItemId: pd.spjRosterItemId ? (rosterMap.get(pd.spjRosterItemId) || null) : null,
            kategori: pd.kategori,
            faktorPengali: pd.faktorPengali ? JSON.parse(JSON.stringify(pd.faktorPengali)) : null,
            uraian: pd.uraian,
            hargaSatuan: pd.hargaSatuan,
            qty: pd.qty,
            satuan: pd.satuan,
            total: pd.total,
          }
        });
      }
    }

    return newSpj.id;
  });
}

export async function getSpjForExport(startDateStr: string | null, endDateStr: string | null, jenisSpj: string | null = null) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const whereClause: any = {
    ...(session.user.role === 'SUPER_ADMIN' ? { teamId: session.user.teamId } : { createdById: session.user.id }),
  };

  if (jenisSpj && jenisSpj !== 'SEMUA') {
    whereClause.jenisSpj = jenisSpj;
  }

  if (startDateStr && endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    // Set end date to end of day to include the entire last day
    end.setHours(23, 59, 59, 999);
    whereClause.tanggalSpj = {
      gte: start,
      lte: end,
    };
  }

  return await prisma.spj.findMany({
    where: whereClause,
    include: {
      perjadinDetail: true,
      roster: true,
      kodeRekening: {
        include: {
          subKegiatan: true,
        }
      }
    },
    orderBy: {
      tanggalSpj: 'asc'
    }
  });
}
