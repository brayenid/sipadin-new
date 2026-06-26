"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RosterRole } from "@prisma/client";

export async function addRoster(spjId: string, pegawaiId: string, role: RosterRole) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    // Verifikasi SPJ
    const spj = await tx.spj.findFirst({
      where: { id: spjId, teamId: session.user.teamId },
      include: { roster: true }
    });
    if (!spj) throw new Error("SPJ tidak ditemukan.");

    // Cek apakah pegawai sudah ada di SPJ ini
    if (spj.roster.some(r => r.pegawaiId === pegawaiId)) {
      throw new Error("Pegawai ini sudah ada di dalam daftar personel SPJ.");
    }

    // Ambil Snapshot Pegawai
    const pegawai = await tx.pegawai.findFirst({
      where: { id: pegawaiId, teamId: session.user.teamId }
    });
    if (!pegawai) throw new Error("Pegawai tidak ditemukan di master data.");

    // Tambahkan Roster
    const newOrder = spj.roster.length > 0 ? Math.max(...spj.roster.map(r => r.order)) + 1 : 0;

    const newRoster = await tx.spjRosterItem.create({
      data: {
        spjId: spj.id,
        pegawaiId: pegawai.id,
        order: newOrder,
        role: role,
        nama: pegawai.nama,
        nip: pegawai.nip,
        jabatan: pegawai.jabatan,
        golongan: pegawai.golongan,
        pangkat: pegawai.pangkat,
      }
    });

    return newRoster;
  });
}

export async function updateRosterRole(spjId: string, rosterItemId: string, role: RosterRole) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Verifikasi kepemilikan
  const spj = await prisma.spj.findFirst({
    where: { id: spjId, teamId: session.user.teamId }
  });
  if (!spj) throw new Error("Akses ditolak.");

  return await prisma.spjRosterItem.update({
    where: { id: rosterItemId, spjId: spj.id },
    data: { role }
  });
}

export async function deleteRoster(spjId: string, rosterItemId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx) => {
    const spj = await tx.spj.findFirst({
      where: { id: spjId, teamId: session.user.teamId },
      include: { subKegiatan: true }
    });
    if (!spj) throw new Error("SPJ tidak ditemukan.");

    const rosterItem = await tx.spjRosterItem.findFirst({
      where: { id: rosterItemId, spjId: spj.id },
      include: { pengeluaranDetails: true }
    });
    if (!rosterItem) throw new Error("Personel tidak ditemukan.");

    // 1. Hitung total uang DOPD yang menempel di personel ini
    const dopdRefundAmount = rosterItem.pengeluaranDetails.reduce((acc, curr) => acc + BigInt(curr.total), BigInt(0));

    // 2. Jika ada uang yang harus di-refund
    if (dopdRefundAmount > BigInt(0)) {
      // Kembalikan saldo pagu (increment)
      await tx.subKegiatan.update({
        where: { id: spj.subKegiatanId },
        data: {
          sisaSaldo: { increment: dopdRefundAmount }
        }
      });

      // Kurangi total pengeluaran SPJ (decrement)
      await tx.spj.update({
        where: { id: spj.id },
        data: {
          totalPengeluaran: { decrement: dopdRefundAmount }
        }
      });
    }

    // 3. Hapus personel (DOPD akan ikut terhapus secara otomatis oleh onDelete: Cascade di database)
    await tx.spjRosterItem.delete({
      where: { id: rosterItemId }
    });

    return true;
  });
}
