"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- GETTERS ---
export async function getTahunAnggaran() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.tahunAnggaran.findMany({
    include: {
      kegiatan: {
        include: { 
          subKegiatan: {
            include: { 
              rekening: true,
              users: true // Include assigned users for RBAC
            }
          } 
        },
      },
    },
    orderBy: { tahun: "desc" },
  });
}

// --- TAHUN ANGGARAN ---
export async function createTahunAnggaran(tahun: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat membuat Tahun Anggaran");
  }

  const res = await prisma.tahunAnggaran.create({
    data: {
      tahun,
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteTahunAnggaran(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat menghapus Tahun Anggaran");
  }

  await prisma.tahunAnggaran.delete({
    where: {
      id,
    },
  });
  revalidatePath("/dashboard/tahun-anggaran");
}

// --- KEGIATAN ---
export async function createKegiatan(tahunAnggaranId: string, kodeKegiatan: string, judulKegiatan: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat membuat Kegiatan");
  }

  const tahun = await prisma.tahunAnggaran.findUnique({
    where: { id: tahunAnggaranId },
  });
  if (!tahun) throw new Error("Tahun Anggaran tidak ditemukan");

  const res = await prisma.kegiatan.create({
    data: {
      tahunAnggaranId,
      kodeKegiatan,
      judulKegiatan,
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteKegiatan(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat menghapus Kegiatan");
  }

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id },
  });

  if (!kegiatan) {
    throw new Error("Kegiatan tidak ditemukan");
  }

  await prisma.kegiatan.delete({ where: { id } });
  revalidatePath("/dashboard/tahun-anggaran");
}

// --- SUB-KEGIATAN ---
export async function createSubKegiatan(
  kegiatanId: string,
  kodeSub: string,
  judulSub: string,
  userIds: string[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat membuat Sub Kegiatan");
  }

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id: kegiatanId },
  });

  if (!kegiatan) {
    throw new Error("Kegiatan tidak ditemukan");
  }

  const res = await prisma.subKegiatan.create({
    data: {
      kegiatanId,
      kodeSub,
      judulSub,
      users: {
        connect: userIds.map(id => ({ id }))
      }
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteSubKegiatan(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat menghapus Sub Kegiatan");
  }

  const sub = await prisma.subKegiatan.findUnique({
    where: { id },
  });

  if (!sub) {
    throw new Error("Sub Kegiatan tidak ditemukan");
  }

  await prisma.subKegiatan.delete({ where: { id } });
  revalidatePath("/dashboard/tahun-anggaran");
}

// --- KODE REKENING ---
export async function createKodeRekening(
  subKegiatanId: string,
  kodeRekening: string,
  judulRekening: string,
  saldoAwal: bigint
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const sub = await prisma.subKegiatan.findUnique({
    where: { id: subKegiatanId },
    include: { users: true },
  });

  if (!sub) throw new Error("Sub Kegiatan tidak ditemukan");

  if (session.user.role !== "SUPER_ADMIN") {
    const isAssigned = sub.users.some((u) => u.id === session.user.id);
    if (!isAssigned) {
      throw new Error("Akses ditolak: Tim Anda tidak ditugaskan pada Sub Kegiatan ini");
    }
  }

  const res = await prisma.kodeRekening.create({
    data: {
      subKegiatanId,
      kodeRekening,
      judulRekening,
      saldoAwal,
      sisaSaldo: saldoAwal, // Pada awal pembuatan, sisa saldo = saldo awal
    },
  });

  revalidatePath("/dashboard/tahun-anggaran");
  return res;
}

export async function deleteKodeRekening(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const rek = await prisma.kodeRekening.findUnique({
    where: { id },
    include: { subKegiatan: { include: { users: true } } },
  });

  if (!rek) throw new Error("Rekening tidak ditemukan");

  if (session.user.role !== "SUPER_ADMIN") {
    const isAssigned = rek.subKegiatan.users.some((u) => u.id === session.user.id);
    if (!isAssigned) {
      throw new Error("Akses ditolak: Tim Anda tidak ditugaskan pada Sub Kegiatan ini");
    }
  }

  await prisma.kodeRekening.delete({ where: { id } });
  revalidatePath("/dashboard/tahun-anggaran");
}

export async function getTahunAnggaranSummary(search: string = "", page: number = 1, limit: number = 12) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const skip = (page - 1) * limit;

  const whereClause = search ? { tahun: { contains: search } } : {};

  const [totalData, tahunList] = await Promise.all([
    prisma.tahunAnggaran.count({ where: whereClause }),
    prisma.tahunAnggaran.findMany({
      where: whereClause,
      include: {
        kegiatan: {
          include: {
            subKegiatan: {
              include: {
                rekening: true,
                users: true,
              }
            }
          }
        }
      },
      orderBy: { tahun: "desc" },
      skip,
      take: limit,
    })
  ]);

  const data = tahunList.map(tahun => {
    let totalPagu = BigInt(0);
    let totalSisa = BigInt(0);
    
    tahun.kegiatan.forEach(k => {
      k.subKegiatan.forEach(s => {
        s.rekening.forEach(r => {
          totalPagu += r.saldoAwal;
          totalSisa += r.sisaSaldo;
        });
      });
    });

    return {
      id: tahun.id,
      tahun: tahun.tahun,
      totalPagu,
      totalSisa
    };
  });

  return {
    data,
    totalData,
    totalPages: Math.ceil(totalData / limit)
  };
}

export async function getTahunAnggaranDetail(tahunString: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const tahun = await prisma.tahunAnggaran.findUnique({
    where: { 
      tahun: tahunString,
    },
    include: {
      kegiatan: {
        include: { 
          subKegiatan: {
            include: { 
              rekening: { orderBy: { kodeRekening: "asc" } },
              users: true,
            },
            orderBy: { kodeSub: "asc" }
          } 
        },
        orderBy: { kodeKegiatan: "asc" }
      },
    },
  });

  if (!tahun) throw new Error("Tahun Anggaran tidak ditemukan");
  return tahun;
}

// --- TIM KERJA (For SuperAdmin) ---
export async function getAllTimKerja() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak");
  }

  const users = await prisma.user.findMany({
    where: { role: "TIM_KERJA" },
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
  }));
}

export async function updateKegiatan(id: string, kodeKegiatan: string, judulKegiatan: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const kegiatan = await prisma.kegiatan.findUnique({
    where: { id },
    include: { tahunAnggaran: true }
  });
  if (!kegiatan) throw new Error("Kegiatan tidak ditemukan");

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("Akses ditolak: Hanya Super Admin yang dapat mengedit Kegiatan");
  }

  await prisma.kegiatan.update({
    where: { id },
    data: { kodeKegiatan, judulKegiatan }
  });
  revalidatePath(`/dashboard/tahun-anggaran/${kegiatan.tahunAnggaran.tahun}`);
}

export async function updateSubKegiatan(id: string, kodeSub: string, judulSub: string, userIds?: string[]) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const sub = await prisma.subKegiatan.findUnique({
    where: { id },
    include: { kegiatan: { include: { tahunAnggaran: true } }, users: true }
  });
  if (!sub) throw new Error("Sub Kegiatan tidak ditemukan");

  if (session.user.role !== "SUPER_ADMIN") {
    const isAssigned = sub.users.some((u) => u.id === session.user.id);
    if (!isAssigned) {throw new Error("Akses ditolak: Tim Anda tidak berhak mengedit Sub Kegiatan ini");
  }
}

  const updateData: any = { kodeSub, judulSub };
  if (userIds) {
    updateData.users = { set: userIds.map(id => ({ id })) };
  }

  await prisma.subKegiatan.update({
    where: { id },
    data: updateData
  });
  revalidatePath(`/dashboard/tahun-anggaran/${sub.kegiatan.tahunAnggaran.tahun}`);
}

export async function updateKodeRekening(id: string, kodeRekening: string, judulRekening: string, saldoAwal: bigint) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const rek = await prisma.kodeRekening.findUnique({
    where: { id },
    include: { subKegiatan: { include: { kegiatan: { include: { tahunAnggaran: true } }, users: true } } }
  });
  if (!rek) throw new Error("Rekening tidak ditemukan");

  if (session.user.role !== "SUPER_ADMIN") {
    const isAssigned = rek.subKegiatan.users.some((u) => u.id === session.user.id);
    if (!isAssigned) {throw new Error("Akses ditolak: Tim Anda tidak berhak mengedit Rekening di Sub Kegiatan ini");
  }
}

  const selisih = saldoAwal - rek.saldoAwal;
  const newSisaSaldo = rek.sisaSaldo + selisih;

  await prisma.kodeRekening.update({
    where: { id },
    data: { 
      kodeRekening, 
      judulRekening, 
      saldoAwal, 
      sisaSaldo: newSisaSaldo 
    }
  });
  revalidatePath(`/dashboard/tahun-anggaran/${rek.subKegiatan.kegiatan.tahunAnggaran.tahun}`);
}
