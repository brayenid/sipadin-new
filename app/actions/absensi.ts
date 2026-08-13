"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWitaInput, formatWita } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { StatusAgendaAbsensi, StatusKehadiran } from "@prisma/client";

// ==========================================
// 1. MANAJEMEN BINDING PEJABAT (MASTER ESELON)
// ==========================================

export async function getPejabatWajibAbsen() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.pegawai.findMany({
    where: {
      teamId: session.user.teamId,
      wajibAbsenOpd: true,
    },
    orderBy: [
      { urutanOpd: "asc" },
      { instansi: "asc" },
      { nama: "asc" },
    ],
  });
}

export async function getAllPegawaiForBinding() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return prisma.pegawai.findMany({
    where: {
      teamId: session.user.teamId,
    },
    orderBy: [
      { wajibAbsenOpd: "desc" },
      { urutanOpd: "asc" },
      { instansi: "asc" },
      { nama: "asc" },
    ],
  });
}

export async function updateBindingPejabat(data: {
  pegawaiId: string;
  wajibAbsenOpd: boolean;
  eselon?: string | null;
  urutanOpd?: number;
  instansi?: string;
  jabatan?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { pegawaiId, wajibAbsenOpd, eselon, urutanOpd, instansi, jabatan } = data;

  const res = await prisma.pegawai.update({
    where: {
      id: pegawaiId,
      teamId: session.user.teamId,
    },
    data: {
      wajibAbsenOpd,
      eselon: eselon || null,
      urutanOpd: urutanOpd ?? 0,
      ...(instansi ? { instansi } : {}),
      ...(jabatan ? { jabatan } : {}),
    },
  });

  revalidatePath("/dashboard/absensi");
  revalidatePath("/dashboard/absensi/pejabat");
  revalidatePath("/dashboard/pegawai");
  return res;
}

export async function bulkUpdateBindingPejabat(
  updates: {
    pegawaiId: string;
    wajibAbsenOpd: boolean;
    eselon?: string | null;
    urutanOpd?: number;
  }[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.$transaction(
    updates.map((item) =>
      prisma.pegawai.update({
        where: { id: item.pegawaiId, teamId: session.user.teamId },
        data: {
          wajibAbsenOpd: item.wajibAbsenOpd,
          eselon: item.eselon || null,
          urutanOpd: item.urutanOpd ?? 0,
        },
      })
    )
  );

  revalidatePath("/dashboard/absensi");
  revalidatePath("/dashboard/absensi/pejabat");
  return { success: true };
}

// ==========================================
// 2. AGENDA ABSENSI CRUD
// ==========================================

export async function getAgendaAbsensiList(filter?: {
  status?: StatusAgendaAbsensi;
  search?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const whereClause: any = {
    teamId: session.user.teamId,
    isDeleted: false,
  };

  if (filter?.status) {
    whereClause.status = filter.status;
  }

  if (filter?.search) {
    whereClause.OR = [
      { namaKegiatan: { contains: filter.search, mode: "insensitive" } },
      { tempat: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  if (filter?.startDate || filter?.endDate) {
    whereClause.tanggal = {};
    if (filter.startDate) {
      whereClause.tanggal.gte = parseWitaInput(filter.startDate);
    }
    if (filter.endDate) {
      whereClause.tanggal.lte = parseWitaInput(filter.endDate);
    }
  }

  const agendas = await prisma.agendaAbsensi.findMany({
    where: whereClause,
    orderBy: {
      tanggal: "desc",
    },
    include: {
      peserta: {
        select: {
          id: true,
          status: true,
          instansi: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return agendas.map((agenda) => {
    const totalPeserta = agenda.peserta.length;
    const hadir = agenda.peserta.filter((p) => p.status === "HADIR").length;
    const mewakili = agenda.peserta.filter((p) => p.status === "MEWAKILI").length;
    const tidakHadir = agenda.peserta.filter((p) => p.status === "TIDAK_HADIR").length;
    const izin = agenda.peserta.filter((p) => p.status === "IZIN").length;

    const persentaseKehadiran =
      totalPeserta > 0
        ? Math.round(((hadir + mewakili) / totalPeserta) * 100)
        : 0;

    return {
      ...agenda,
      stats: {
        total: totalPeserta,
        hadir,
        mewakili,
        tidakHadir,
        izin,
        persentase: persentaseKehadiran,
      },
    };
  });
}

export async function getAgendaAbsensiDetail(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: {
      id,
      teamId: session.user.teamId,
      isDeleted: false,
    },
    include: {
      peserta: {
        orderBy: [
          { urutan: "asc" },
          { instansi: "asc" },
          { nama: "asc" },
        ],
      },
      createdBy: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!agenda) throw new Error("Agenda absensi tidak ditemukan.");
  return agenda;
}

export async function createAgendaAbsensi(payload: {
  namaKegiatan: string;
  tanggal: string; // YYYY-MM-DD
  hari?: string;
  waktu?: string;
  tempat: string;
  deskripsi?: string;
  targetPeserta?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const parsedTanggal = parseWitaInput(payload.tanggal) || new Date();
  const hariComputed = payload.hari || formatWita(parsedTanggal, "EEEE");

  // Ambil pegawai ter-binding wajib absen OPD
  const pejabatTerdaftar = await prisma.pegawai.findMany({
    where: {
      teamId: session.user.teamId,
      wajibAbsenOpd: true,
    },
    orderBy: [
      { urutanOpd: "asc" },
      { instansi: "asc" },
      { nama: "asc" },
    ],
  });

  const created = await prisma.$transaction(async (tx) => {
    const agenda = await tx.agendaAbsensi.create({
      data: {
        namaKegiatan: payload.namaKegiatan,
        tanggal: parsedTanggal,
        hari: hariComputed,
        waktu: payload.waktu || "09:00 WITA - Selesai",
        tempat: payload.tempat,
        deskripsi: payload.deskripsi || null,
        targetPeserta: payload.targetPeserta || "Eselon II.b dan III.a",
        status: StatusAgendaAbsensi.BERLANGSUNG,
        teamId: session.user.teamId,
        createdById: session.user.id,
      },
    });

    if (pejabatTerdaftar.length > 0) {
      await tx.kehadiranPeserta.createMany({
        data: pejabatTerdaftar.map((p, idx) => ({
          agendaId: agenda.id,
          pegawaiId: p.id,
          nama: p.nama,
          nip: p.nip || null,
          jabatan: p.jabatan,
          instansi: p.instansi,
          eselon: p.eselon || "II.b",
          urutan: p.urutanOpd ?? idx + 1,
          status: StatusKehadiran.TIDAK_HADIR, // Status default awal adalah tidak hadir (belum dicentang)
        })),
      });
    }

    return agenda;
  });

  revalidatePath("/dashboard/absensi");
  return created;
}

export async function updateAgendaAbsensi(
  id: string,
  payload: {
    namaKegiatan?: string;
    tanggal?: string;
    hari?: string;
    waktu?: string;
    tempat?: string;
    deskripsi?: string;
    targetPeserta?: string;
    status?: StatusAgendaAbsensi;
    driveUrl?: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const dataToUpdate: any = { ...payload };

  if (payload.tanggal) {
    dataToUpdate.tanggal = parseWitaInput(payload.tanggal) || new Date();
  }

  const updated = await prisma.agendaAbsensi.update({
    where: {
      id,
      teamId: session.user.teamId,
    },
    data: dataToUpdate,
  });

  revalidatePath("/dashboard/absensi");
  revalidatePath(`/dashboard/absensi/${id}`);
  revalidatePath("/dashboard/absensi/rekap");
  return updated;
}

export async function deleteAgendaAbsensi(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.agendaAbsensi.update({
    where: {
      id,
      teamId: session.user.teamId,
    },
    data: {
      isDeleted: true,
    },
  });

  revalidatePath("/dashboard/absensi");
  return { success: true };
}

// ==========================================
// 3. PENGISIAN KEHADIRAN PESERTA
// ==========================================

export async function updateKehadiranPesertaBatch(
  agendaId: string,
  pesertaList: {
    id: string;
    status: StatusKehadiran;
    namaPerwakilan?: string | null;
    jabatanPerwakilan?: string | null;
    keterangan?: string | null;
  }[],
  extraAgendaData?: {
    driveUrl?: string;
    status?: StatusAgendaAbsensi;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Validasi kepemilikan agenda
  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { id: agendaId, teamId: session.user.teamId },
  });
  if (!agenda) throw new Error("Agenda tidak ditemukan");

  await prisma.$transaction(async (tx) => {
    for (const item of pesertaList) {
      await tx.kehadiranPeserta.update({
        where: { id: item.id, agendaId },
        data: {
          status: item.status,
          namaPerwakilan: item.status === "MEWAKILI" ? item.namaPerwakilan : null,
          jabatanPerwakilan: item.status === "MEWAKILI" ? item.jabatanPerwakilan : null,
          keterangan: item.keterangan || null,
        },
      });
    }

    if (extraAgendaData) {
      await tx.agendaAbsensi.update({
        where: { id: agendaId },
        data: {
          ...(extraAgendaData.driveUrl !== undefined ? { driveUrl: extraAgendaData.driveUrl } : {}),
          ...(extraAgendaData.status ? { status: extraAgendaData.status } : {}),
        },
      });
    }
  });

  revalidatePath(`/dashboard/absensi/${agendaId}`);
  revalidatePath("/dashboard/absensi");
  revalidatePath("/dashboard/absensi/rekap");
  return { success: true };
}

export async function addPesertaManualToAgenda(
  agendaId: string,
  payload: {
    pegawaiId?: string;
    nama: string;
    nip?: string;
    jabatan: string;
    instansi: string;
    eselon?: string;
    status?: StatusKehadiran;
    namaPerwakilan?: string;
    jabatanPerwakilan?: string;
    keterangan?: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { id: agendaId, teamId: session.user.teamId },
  });
  if (!agenda) throw new Error("Agenda tidak ditemukan");

  const count = await prisma.kehadiranPeserta.count({ where: { agendaId } });

  const peserta = await prisma.kehadiranPeserta.create({
    data: {
      agendaId,
      pegawaiId: payload.pegawaiId || null,
      nama: payload.nama,
      nip: payload.nip || null,
      jabatan: payload.jabatan,
      instansi: payload.instansi,
      eselon: payload.eselon || "II.b",
      urutan: count + 1,
      status: payload.status || StatusKehadiran.HADIR,
      namaPerwakilan: payload.namaPerwakilan || null,
      jabatanPerwakilan: payload.jabatanPerwakilan || null,
      keterangan: payload.keterangan || null,
    },
  });

  revalidatePath(`/dashboard/absensi/${agendaId}`);
  return peserta;
}

export async function deletePesertaFromAgenda(agendaId: string, pesertaId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  await prisma.kehadiranPeserta.delete({
    where: {
      id: pesertaId,
      agendaId,
    },
  });

  revalidatePath(`/dashboard/absensi/${agendaId}`);
  return { success: true };
}

// ==========================================
// 4. REKAPITULASI KEHADIRAN PERANGKAT DAERAH
// ==========================================

export async function getRekapKehadiranOpd(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const whereAgenda: any = {
    teamId: session.user.teamId,
    isDeleted: false,
  };

  if (params?.startDate || params?.endDate) {
    whereAgenda.tanggal = {};
    if (params.startDate) {
      whereAgenda.tanggal.gte = parseWitaInput(params.startDate);
    }
    if (params.endDate) {
      whereAgenda.tanggal.lte = parseWitaInput(params.endDate);
    }
  }

  const agendas = await prisma.agendaAbsensi.findMany({
    where: whereAgenda,
    orderBy: { tanggal: "desc" },
    include: {
      peserta: true,
    },
  });

  const totalAgenda = agendas.length;

  // Akumulasi per Instansi / Perangkat Daerah dan Pegawai
  const opdMap: Record<
    string,
    {
      instansi: string;
      jabatanTerdata: string[];
      totalDiundang: number;
      hadir: number;
      mewakili: number;
      tidakHadir: number;
      izin: number;
      history: {
        agendaId: string;
        namaKegiatan: string;
        tanggal: Date;
        status: StatusKehadiran;
        keterangan?: string | null;
        namaPerwakilan?: string | null;
      }[];
    }
  > = {};

  const pegawaiMap: Record<
    string,
    {
      nama: string;
      nip: string | null;
      jabatan: string;
      instansi: string;
      totalDiundang: number;
      hadir: number;
      mewakili: number;
      tidakHadir: number;
      izin: number;
      history: {
        agendaId: string;
        namaKegiatan: string;
        tanggal: Date;
        status: StatusKehadiran;
        keterangan?: string | null;
        namaPerwakilan?: string | null;
      }[];
    }
  > = {};

  for (const ag of agendas) {
    for (const p of ag.peserta) {
      const instansiKey = p.instansi.trim();
      if (!opdMap[instansiKey]) {
        opdMap[instansiKey] = {
          instansi: instansiKey,
          jabatanTerdata: [],
          totalDiundang: 0,
          hadir: 0,
          mewakili: 0,
          tidakHadir: 0,
          izin: 0,
          history: [],
        };
      }

      if (p.jabatan && !opdMap[instansiKey].jabatanTerdata.includes(p.jabatan)) {
        opdMap[instansiKey].jabatanTerdata.push(p.jabatan);
      }

      // logic rekap per instansi (unik per agenda)
      // Jika instansi mengirimkan lebih dari 1 perwakilan/pejabat pada agenda yang sama, kita hanya hitung status terbaik dari instansi tersebut di agenda ini.
      const existingHistoryIndex = opdMap[instansiKey].history.findIndex((h) => h.agendaId === ag.id);
      
      if (existingHistoryIndex !== -1) {
        const currentBest = opdMap[instansiKey].history[existingHistoryIndex].status;
        const candidate = p.status;
        
        // Aturan hierarki keaktifan: HADIR > MEWAKILI > IZIN > TIDAK_HADIR
        const getWeight = (st: StatusKehadiran) => {
          if (st === "HADIR") return 4;
          if (st === "MEWAKILI") return 3;
          if (st === "IZIN") return 2;
          return 1; // TIDAK_HADIR
        };

        if (getWeight(candidate) > getWeight(currentBest)) {
          // Kurangi counter status lama yang digantikan
          const oldStatus = currentBest;
          if (oldStatus === "HADIR") opdMap[instansiKey].hadir -= 1;
          else if (oldStatus === "MEWAKILI") opdMap[instansiKey].mewakili -= 1;
          else if (oldStatus === "IZIN") opdMap[instansiKey].izin -= 1;
          else opdMap[instansiKey].tidakHadir -= 1;

          // Tambah counter status yang baru
          if (candidate === "HADIR") opdMap[instansiKey].hadir += 1;
          else if (candidate === "MEWAKILI") opdMap[instansiKey].mewakili += 1;
          else if (candidate === "IZIN") opdMap[instansiKey].izin += 1;
          else opdMap[instansiKey].tidakHadir += 1;

          // Update riwayat history
          opdMap[instansiKey].history[existingHistoryIndex] = {
            agendaId: ag.id,
            namaKegiatan: ag.namaKegiatan,
            tanggal: ag.tanggal,
            status: candidate,
            keterangan: p.keterangan,
            namaPerwakilan: p.namaPerwakilan,
          };
        }
      } else {
        // Jika agenda baru pertama kali didaftarkan untuk instansi ini
        opdMap[instansiKey].totalDiundang += 1;

        if (p.status === "HADIR") opdMap[instansiKey].hadir += 1;
        else if (p.status === "MEWAKILI") opdMap[instansiKey].mewakili += 1;
        else if (p.status === "IZIN") opdMap[instansiKey].izin += 1;
        else opdMap[instansiKey].tidakHadir += 1;

        opdMap[instansiKey].history.push({
          agendaId: ag.id,
          namaKegiatan: ag.namaKegiatan,
          tanggal: ag.tanggal,
          status: p.status,
          keterangan: p.keterangan,
          namaPerwakilan: p.namaPerwakilan,
        });
      }

      // logic rekap per pegawai
      // Gunakan nama + nip + jabatan sebagai key jika pegawaiId null (peserta manual)
      const pegawaiKey = p.pegawaiId || `${p.nama}_${p.nip || ""}_${p.jabatan}`;
      if (!pegawaiMap[pegawaiKey]) {
        pegawaiMap[pegawaiKey] = {
          nama: p.nama,
          nip: p.nip,
          jabatan: p.jabatan,
          instansi: p.instansi,
          totalDiundang: 0,
          hadir: 0,
          mewakili: 0,
          tidakHadir: 0,
          izin: 0,
          history: [],
        };
      }

      pegawaiMap[pegawaiKey].totalDiundang += 1;
      if (p.status === "HADIR") pegawaiMap[pegawaiKey].hadir += 1;
      else if (p.status === "MEWAKILI") pegawaiMap[pegawaiKey].mewakili += 1;
      else if (p.status === "IZIN") pegawaiMap[pegawaiKey].izin += 1;
      else pegawaiMap[pegawaiKey].tidakHadir += 1;

      pegawaiMap[pegawaiKey].history.push({
        agendaId: ag.id,
        namaKegiatan: ag.namaKegiatan,
        tanggal: ag.tanggal,
        status: p.status,
        keterangan: p.keterangan,
        namaPerwakilan: p.namaPerwakilan,
      });
    }
  }

  const opdSummary = Object.values(opdMap).map((item) => {
    const totalPartisipasi = item.hadir + item.mewakili;
    const persentaseKehadiran =
      item.totalDiundang > 0
        ? Math.round((totalPartisipasi / item.totalDiundang) * 100)
        : 0;

    const persentaseHadirLangsung =
      item.totalDiundang > 0
        ? Math.round((item.hadir / item.totalDiundang) * 100)
        : 0;

    return {
      ...item,
      totalPartisipasi,
      persentaseKehadiran,
      persentaseHadirLangsung,
    };
  });

  const pegawaiSummary = Object.values(pegawaiMap).map((item) => {
    const totalPartisipasi = item.hadir + item.mewakili;
    const persentaseKehadiran =
      item.totalDiundang > 0
        ? Math.round((totalPartisipasi / item.totalDiundang) * 100)
        : 0;

    return {
      ...item,
      totalPartisipasi,
      persentaseKehadiran,
    };
  });

  // Sort by persentaseKehadiran desc
  opdSummary.sort((a, b) => b.persentaseKehadiran - a.persentaseKehadiran);
  pegawaiSummary.sort((a, b) => b.persentaseKehadiran - a.persentaseKehadiran);

  return {
    totalAgenda,
    agendas,
    opdSummary,
    pegawaiSummary,
  };
}

export async function addPesertaBulkToAgenda(
  agendaId: string,
  pegawaiIds: string[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { id: agendaId, teamId: session.user.teamId },
  });
  if (!agenda) throw new Error("Agenda tidak ditemukan");

  const count = await prisma.kehadiranPeserta.count({ where: { agendaId } });
  const pegawais = await prisma.pegawai.findMany({
    where: { id: { in: pegawaiIds }, teamId: session.user.teamId }
  });

  await prisma.$transaction(
    pegawais.map((p, idx) =>
      prisma.kehadiranPeserta.create({
        data: {
          agendaId,
          pegawaiId: p.id,
          nama: p.nama,
          nip: p.nip || null,
          jabatan: p.jabatan,
          instansi: p.instansi,
          eselon: p.eselon || "II.b",
          urutan: count + idx + 1,
          status: StatusKehadiran.HADIR,
        },
      })
    )
  );

  revalidatePath(`/dashboard/absensi/${agendaId}`);
  return { success: true };
}

