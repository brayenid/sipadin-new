"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWitaInput, formatWita, combineDateAndTimeWita } from "@/lib/date-utils";
import { deleteFromR2OrLocal } from "@/lib/r2";
import { generateSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { StatusAgendaAbsensi, StatusKehadiran } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

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
  kategoriPegawai?: string | null;
  urutanOpd?: number;
  instansi?: string;
  jabatan?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const { pegawaiId, wajibAbsenOpd, eselon, kategoriPegawai, urutanOpd, instansi, jabatan } = data;

  const res = await prisma.pegawai.update({
    where: {
      id: pegawaiId,
      teamId: session.user.teamId,
    },
    data: {
      wajibAbsenOpd,
      eselon: eselon || null,
      kategoriPegawai: kategoriPegawai || null,
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
    kategoriPegawai?: string | null;
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
          kategoriPegawai: item.kategoriPegawai || null,
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
  targetKategori?: string;
  waktuBukaAbsen?: string; // ISO / YYYY-MM-DDTHH:mm
  waktuTutupAbsen?: string; // ISO / YYYY-MM-DDTHH:mm
  jamBuka?: string; // HH:mm
  jamTutup?: string; // HH:mm
  requireLocation?: boolean;
  requirePhoto?: boolean;
  allowNonPeserta?: boolean;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  radiusMeter?: number | null;
  customPegawaiIds?: string[];
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const parsedTanggal = parseWitaInput(payload.tanggal) || new Date();
  const hariComputed = payload.hari || formatWita(parsedTanggal, "EEEE");

  // Format waktu buka & tutup absen dengan default cerdas jika tidak diisi manual
  const tanggalStr = payload.tanggal.split("T")[0];
  let waktuBuka: Date | null = null;
  let waktuTutup: Date | null = null;

  if (payload.waktuBukaAbsen) {
    waktuBuka = new Date(payload.waktuBukaAbsen);
  } else if (payload.jamBuka) {
    waktuBuka = combineDateAndTimeWita(tanggalStr, payload.jamBuka);
  } else {
    // Default buka: 07:30 WITA pada hari H
    waktuBuka = combineDateAndTimeWita(tanggalStr, "07:30");
  }

  if (payload.waktuTutupAbsen) {
    waktuTutup = new Date(payload.waktuTutupAbsen);
  } else if (payload.jamTutup) {
    waktuTutup = combineDateAndTimeWita(tanggalStr, payload.jamTutup);
  } else {
    // Default tutup: 14:00 WITA pada hari H
    waktuTutup = combineDateAndTimeWita(tanggalStr, "14:00");
  }

  // Filter pegawai sesuai kategori target binding
  const targetKategori = payload.targetKategori || "ESELON_2_3";
  let targetPegawaiFilter: any = { teamId: session.user.teamId };

  if (targetKategori === "CUSTOM" && payload.customPegawaiIds && payload.customPegawaiIds.length > 0) {
    targetPegawaiFilter.id = { in: payload.customPegawaiIds };
  } else if (targetKategori === "ESELON_2") {
    targetPegawaiFilter.OR = [
      { eselon: { in: ["II.a", "II.b", "II"] } },
      { kategoriPegawai: "ESELON_2" },
      { wajibAbsenOpd: true, eselon: { contains: "II", mode: "insensitive" } },
    ];
  } else if (targetKategori === "ESELON_3") {
    targetPegawaiFilter.OR = [
      { eselon: { in: ["III.a", "III.b", "III"] } },
      { kategoriPegawai: "ESELON_3" },
      { wajibAbsenOpd: true, eselon: { contains: "III", mode: "insensitive" } },
    ];
  } else if (targetKategori === "KECAMATAN") {
    targetPegawaiFilter.OR = [
      { instansi: { contains: "Kecamatan", mode: "insensitive" } },
      { kategoriPegawai: "KECAMATAN" },
    ];
  } else if (targetKategori === "SEMUA_OPD") {
    targetPegawaiFilter.wajibAbsenOpd = true;
  } else {
    // Default: ESELON_2_3
    targetPegawaiFilter.OR = [
      { eselon: { in: ["II.a", "II.b", "II", "III.a", "III.b", "III"] } },
      { kategoriPegawai: { in: ["ESELON_2", "ESELON_3"] } },
      { wajibAbsenOpd: true },
    ];
  }

  const pejabatTerdaftar = await prisma.pegawai.findMany({
    where: targetPegawaiFilter,
    orderBy: [
      { urutanOpd: "asc" },
      { instansi: "asc" },
      { nama: "asc" },
    ],
  });

  const baseSlug = generateSlug(payload.namaKegiatan).slice(0, 45) || "agenda-presensi";
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const generatedToken = `${baseSlug}-${randomSuffix}`;

  const created = await prisma.$transaction(async (tx) => {
    const agenda = await tx.agendaAbsensi.create({
      data: {
        publicToken: generatedToken,
        namaKegiatan: payload.namaKegiatan,
        tanggal: parsedTanggal,
        hari: hariComputed,
        waktu: payload.waktu || "09:00 WITA",
        tempat: payload.tempat,
        deskripsi: payload.deskripsi || null,
        targetPeserta: payload.targetPeserta || "Eselon II.b dan III.a",
        targetKategori,
        isPublicActive: true,
        waktuBukaAbsen: waktuBuka,
        waktuTutupAbsen: waktuTutup,
        requireLocation: payload.requireLocation ?? true,
        requirePhoto: payload.requirePhoto ?? true,
        allowNonPeserta: payload.allowNonPeserta ?? true,
        targetLatitude: payload.targetLatitude ?? null,
        targetLongitude: payload.targetLongitude ?? null,
        radiusMeter: payload.radiusMeter ?? 100,
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
          status: StatusKehadiran.TIDAK_HADIR,
          isSelfInput: false,
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
    targetKategori?: string;
    isPublicActive?: boolean;
    waktuBukaAbsen?: string | Date | null;
    waktuTutupAbsen?: string | Date | null;
    jamBuka?: string;
    jamTutup?: string;
    requireLocation?: boolean;
    requirePhoto?: boolean;
    targetLatitude?: number | null;
    targetLongitude?: number | null;
    radiusMeter?: number | null;
    status?: StatusAgendaAbsensi;
    driveUrl?: string;
    publicToken?: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const dataToUpdate: any = { ...payload };

  if (payload.tanggal) {
    dataToUpdate.tanggal = parseWitaInput(payload.tanggal) || new Date();
  }

  if (payload.jamBuka !== undefined || payload.jamTutup !== undefined) {
    const currentAgenda = await prisma.agendaAbsensi.findUnique({
      where: { id },
      select: { tanggal: true },
    });
    const baseDate = payload.tanggal ? payload.tanggal.split("T")[0] : formatWita(currentAgenda?.tanggal || new Date(), "yyyy-MM-dd");

    if (payload.jamBuka) {
      dataToUpdate.waktuBukaAbsen = combineDateAndTimeWita(baseDate, payload.jamBuka);
    }
    if (payload.jamTutup) {
      dataToUpdate.waktuTutupAbsen = combineDateAndTimeWita(baseDate, payload.jamTutup);
    }
    delete dataToUpdate.jamBuka;
    delete dataToUpdate.jamTutup;
  }

  if (typeof payload.waktuBukaAbsen === "string") {
    dataToUpdate.waktuBukaAbsen = new Date(payload.waktuBukaAbsen);
  }
  if (typeof payload.waktuTutupAbsen === "string") {
    dataToUpdate.waktuTutupAbsen = new Date(payload.waktuTutupAbsen);
  }
  if (payload.publicToken !== undefined) {
    const cleanSlug = generateSlug(payload.publicToken).slice(0, 80);
    if (!cleanSlug) {
      throw new Error("Slug / tautan kustom tidak boleh kosong");
    }
    // Cek apakah slug sudah dipakai oleh agenda lain
    const existing = await prisma.agendaAbsensi.findFirst({
      where: {
        publicToken: cleanSlug,
        id: { not: id },
        isDeleted: false,
      },
    });
    if (existing) {
      throw new Error(`Slug "${cleanSlug}" sudah digunakan oleh agenda lain. Silakan pilih slug yang berbeda.`);
    }
    dataToUpdate.publicToken = cleanSlug;
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
  if (updated.publicToken) {
    revalidatePath(`/p/absensi/${updated.publicToken}`);
  }
  return updated;
}

export async function togglePublicAbsensiActive(id: string, isPublicActive: boolean) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const updated = await prisma.agendaAbsensi.update({
    where: { id, teamId: session.user.teamId },
    data: { isPublicActive },
  });

  revalidatePath("/dashboard/absensi");
  revalidatePath(`/dashboard/absensi/${id}`);
  if (updated.publicToken) {
    revalidatePath(`/p/absensi/${updated.publicToken}`);
  }
  return { success: true, isPublicActive: updated.isPublicActive };
}

export async function deleteAgendaAbsensi(id: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { id, teamId: session.user.teamId },
    include: {
      peserta: {
        select: { fotoUrl: true },
      },
    },
  });

  if (agenda?.peserta) {
    for (const p of agenda.peserta) {
      if (p.fotoUrl) {
        await deleteFromR2OrLocal(p.fotoUrl);
      }
    }
  }

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
// 2.5. PUBLIC SELF-INPUT ENDPOINTS (TANPA LOGIN)
// ==========================================

export async function getPublicAgendaByToken(token: string) {
  if (!token) throw new Error("Token tautan presensi tidak valid");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: {
      publicToken: token,
      isDeleted: false,
    },
    select: {
      id: true,
      publicToken: true,
      namaKegiatan: true,
      hari: true,
      tanggal: true,
      waktu: true,
      tempat: true,
      deskripsi: true,
      targetPeserta: true,
      targetKategori: true,
      status: true,
      isPublicActive: true,
      waktuBukaAbsen: true,
      waktuTutupAbsen: true,
      requireLocation: true,
      requirePhoto: true,
      allowNonPeserta: true,
    },
  });

  if (!agenda) {
    throw new Error("Agenda presensi tidak ditemukan atau telah dihapus");
  }

  const now = new Date();
  let timeStatus: "NOT_STARTED" | "OPEN" | "CLOSED" = "OPEN";

  if (!agenda.isPublicActive) {
    timeStatus = "CLOSED";
  } else if (agenda.waktuBukaAbsen && now < agenda.waktuBukaAbsen) {
    timeStatus = "NOT_STARTED";
  } else if (agenda.waktuTutupAbsen && now > agenda.waktuTutupAbsen) {
    timeStatus = "CLOSED";
  }

  return {
    ...agenda,
    serverTime: now.toISOString(),
    timeStatus,
  };
}

export async function searchPublicPesertaAgenda(publicToken: string, query: string) {
  if (!publicToken || !query || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { publicToken, isDeleted: false },
    select: { id: true },
  });

  if (!agenda) {
    throw new Error("Agenda presensi tidak ditemukan");
  }

  const matches = await prisma.kehadiranPeserta.findMany({
    where: {
      agendaId: agenda.id,
      OR: [
        { nama: { contains: cleanQuery, mode: "insensitive" } },
        { instansi: { contains: cleanQuery, mode: "insensitive" } },
        { jabatan: { contains: cleanQuery, mode: "insensitive" } },
        { nip: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      pegawaiId: true,
      nama: true,
      nip: true,
      jabatan: true,
      instansi: true,
      eselon: true,
      urutan: true,
      status: true,
      isSelfInput: true,
      waktuInput: true,
    },
    orderBy: [
      { urutan: "asc" },
      { nama: "asc" },
    ],
    take: 10,
  });

  return matches;
}

export async function submitSelfAbsensi(payload: {
  publicToken: string;
  pesertaId?: string; // Jika memilih pejabat binding
  nama?: string;
  nip?: string;
  jabatan?: string;
  instansi?: string;
  eselon?: string;
  status: StatusKehadiran;
  namaPerwakilan?: string | null;
  jabatanPerwakilan?: string | null;
  keterangan?: string | null;
  fotoUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  lokasiText?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { publicToken } = payload;
  if (!publicToken) throw new Error("Token tidak valid");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { publicToken, isDeleted: false },
  });

  if (!agenda) throw new Error("Agenda presensi tidak ditemukan");

  // Validasi status kegiatan
  if (agenda.status === StatusAgendaAbsensi.DIBATALKAN) {
    throw new Error("Presensi tidak dapat dilakukan karena kegiatan telah DIBATALKAN");
  }

  // Validasi saklar aktif
  if (!agenda.isPublicActive) {
    throw new Error("Pengisian presensi online saat ini dinonaktifkan oleh Administrator");
  }

  const now = new Date();

  // Validasi rentang waktu buka
  if (agenda.waktuBukaAbsen && now < agenda.waktuBukaAbsen) {
    throw new Error(
      `Presensi belum dibuka. Jadwal buka presensi: ${formatWita(agenda.waktuBukaAbsen, "dd MMMM yyyy HH:mm")} WITA`
    );
  }

  // Validasi rentang waktu tutup
  if (agenda.waktuTutupAbsen && now > agenda.waktuTutupAbsen) {
    throw new Error(
      `Presensi telah berakhir pada ${formatWita(agenda.waktuTutupAbsen, "dd MMMM yyyy HH:mm")} WITA`
    );
  }

  // Validasi foto jika diwajibkan (Hanya wajib untuk HADIR dan MEWAKILI, status IZIN tidak wajib selfie)
  if (agenda.requirePhoto && payload.status !== "IZIN" && !payload.fotoUrl) {
    throw new Error("Foto selfie bukti presensi wajib diambil dan diunggah");
  }

  // Validasi geotag jika diwajibkan
  if (agenda.requireLocation && (payload.latitude === undefined || payload.longitude === undefined || payload.latitude === null || payload.longitude === null)) {
    throw new Error("Izin lokasi (Geotag/GPS) wajib diaktifkan untuk memastikan kehadiran Anda di lokasi kegiatan");
  }

  let resultPeserta;

  if (payload.pesertaId) {
    // Cek foto lama untuk diunlink jika ada foto baru
    if (payload.fotoUrl) {
      const oldRecord = await prisma.kehadiranPeserta.findUnique({
        where: { id: payload.pesertaId },
        select: { fotoUrl: true },
      });
      if (oldRecord?.fotoUrl && oldRecord.fotoUrl !== payload.fotoUrl) {
        await deleteFromR2OrLocal(oldRecord.fotoUrl);
      }
    }

    // Update data peserta binding yang sudah terdaftar di agenda
    resultPeserta = await prisma.kehadiranPeserta.update({
      where: {
        id: payload.pesertaId,
        agendaId: agenda.id,
      },
      data: {
        status: payload.status,
        namaPerwakilan: payload.status === "MEWAKILI" ? payload.namaPerwakilan : null,
        jabatanPerwakilan: payload.status === "MEWAKILI" ? payload.jabatanPerwakilan : null,
        keterangan: payload.keterangan || null,
        fotoUrl: payload.fotoUrl || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        accuracy: payload.accuracy || null,
        lokasiText: payload.lokasiText || null,
        waktuInput: now,
        isSelfInput: true,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      },
    });
  } else {
    // Peserta tamu / baru di luar daftar binding
    if (agenda.allowNonPeserta === false) {
      throw new Error("Pengisian presensi untuk nama di luar daftar undangan tidak diizinkan pada kegiatan ini.");
    }

    if (!payload.nama || !payload.jabatan || !payload.instansi) {
      throw new Error("Nama, Jabatan, dan Instansi/OPD wajib diisi");
    }

    const currentCount = await prisma.kehadiranPeserta.count({
      where: { agendaId: agenda.id },
    });

    resultPeserta = await prisma.kehadiranPeserta.create({
      data: {
        agendaId: agenda.id,
        nama: payload.nama,
        nip: payload.nip || null,
        jabatan: payload.jabatan,
        instansi: payload.instansi,
        eselon: payload.eselon || "II.b",
        urutan: currentCount + 1,
        status: payload.status,
        namaPerwakilan: payload.status === "MEWAKILI" ? payload.namaPerwakilan : null,
        jabatanPerwakilan: payload.status === "MEWAKILI" ? payload.jabatanPerwakilan : null,
        keterangan: payload.keterangan || null,
        fotoUrl: payload.fotoUrl || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        accuracy: payload.accuracy || null,
        lokasiText: payload.lokasiText || null,
        waktuInput: now,
        isSelfInput: true,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      },
    });
  }

  revalidatePath(`/p/absensi/${publicToken}`);
  revalidatePath(`/dashboard/absensi/${agenda.id}`);
  revalidatePath("/dashboard/absensi");
  revalidatePath("/dashboard/absensi/rekap");

  return {
    success: true,
    data: resultPeserta,
  };
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
    tanggal?: string | Date;
    hari?: string;
    waktu?: string;
    tempat?: string;
    deskripsi?: string | null;
    jamBuka?: string;
    jamTutup?: string;
    waktuBukaAbsen?: string | Date;
    waktuTutupAbsen?: string | Date;
    targetLatitude?: number | null;
    targetLongitude?: number | null;
    radiusMeter?: number | null;
    requireLocation?: boolean;
    requirePhoto?: boolean;
    allowNonPeserta?: boolean;
    publicToken?: string;
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
      const agendaUpdatePayload: any = {};

      if (extraAgendaData.publicToken !== undefined) {
        const cleanSlug = generateSlug(extraAgendaData.publicToken).slice(0, 80);
        if (!cleanSlug) {
          throw new Error("Slug / tautan kustom tidak boleh kosong");
        }
        const existing = await tx.agendaAbsensi.findFirst({
          where: {
            publicToken: cleanSlug,
            id: { not: agendaId },
            isDeleted: false,
          },
        });
        if (existing) {
          throw new Error(`Slug "${cleanSlug}" sudah digunakan oleh agenda lain.`);
        }
        agendaUpdatePayload.publicToken = cleanSlug;
      }

      if (extraAgendaData.driveUrl !== undefined) {
        agendaUpdatePayload.driveUrl = extraAgendaData.driveUrl;
      }
      if (extraAgendaData.status) {
        agendaUpdatePayload.status = extraAgendaData.status;
      }
      if (extraAgendaData.requireLocation !== undefined) {
        agendaUpdatePayload.requireLocation = extraAgendaData.requireLocation;
      }
      if (extraAgendaData.requirePhoto !== undefined) {
        agendaUpdatePayload.requirePhoto = extraAgendaData.requirePhoto;
      }
      if (extraAgendaData.allowNonPeserta !== undefined) {
        agendaUpdatePayload.allowNonPeserta = extraAgendaData.allowNonPeserta;
      }
      if (extraAgendaData.tempat !== undefined) {
        agendaUpdatePayload.tempat = extraAgendaData.tempat;
      }
      if (extraAgendaData.waktu !== undefined) {
        agendaUpdatePayload.waktu = extraAgendaData.waktu;
      }
      if (extraAgendaData.deskripsi !== undefined) {
        agendaUpdatePayload.deskripsi = extraAgendaData.deskripsi;
      }
      if (extraAgendaData.targetLatitude !== undefined) {
        agendaUpdatePayload.targetLatitude =
          extraAgendaData.targetLatitude !== null && !isNaN(Number(extraAgendaData.targetLatitude))
            ? Number(extraAgendaData.targetLatitude)
            : null;
      }
      if (extraAgendaData.targetLongitude !== undefined) {
        agendaUpdatePayload.targetLongitude =
          extraAgendaData.targetLongitude !== null && !isNaN(Number(extraAgendaData.targetLongitude))
            ? Number(extraAgendaData.targetLongitude)
            : null;
      }
      if (extraAgendaData.radiusMeter !== undefined) {
        agendaUpdatePayload.radiusMeter =
          extraAgendaData.radiusMeter !== null && !isNaN(Number(extraAgendaData.radiusMeter))
            ? parseInt(String(extraAgendaData.radiusMeter), 10)
            : 100;
      }
      if (extraAgendaData.tanggal) {
        const parsed = parseWitaInput(extraAgendaData.tanggal as string) || new Date(extraAgendaData.tanggal);
        agendaUpdatePayload.tanggal = parsed;
        agendaUpdatePayload.hari = extraAgendaData.hari || formatWita(parsed, "EEEE");
      }

      // Hitung rentang waktu absen jika jamBuka / jamTutup diupdate
      const baseDateStr = extraAgendaData.tanggal
        ? (typeof extraAgendaData.tanggal === "string" ? extraAgendaData.tanggal.split("T")[0] : formatWita(extraAgendaData.tanggal, "yyyy-MM-dd"))
        : formatWita(agenda.tanggal, "yyyy-MM-dd");

      if (extraAgendaData.jamBuka) {
        agendaUpdatePayload.waktuBukaAbsen = combineDateAndTimeWita(baseDateStr, extraAgendaData.jamBuka);
      } else if (extraAgendaData.waktuBukaAbsen) {
        agendaUpdatePayload.waktuBukaAbsen = new Date(extraAgendaData.waktuBukaAbsen);
      }

      if (extraAgendaData.jamTutup) {
        agendaUpdatePayload.waktuTutupAbsen = combineDateAndTimeWita(baseDateStr, extraAgendaData.jamTutup);
      } else if (extraAgendaData.waktuTutupAbsen) {
        agendaUpdatePayload.waktuTutupAbsen = new Date(extraAgendaData.waktuTutupAbsen);
      }

      if (Object.keys(agendaUpdatePayload).length > 0) {
        await tx.agendaAbsensi.update({
          where: { id: agendaId },
          data: agendaUpdatePayload,
        });
      }
    }
  });

  revalidatePath(`/dashboard/absensi/${agendaId}`);
  revalidatePath("/dashboard/absensi");
  revalidatePath("/dashboard/absensi/rekap");
  if (agenda.publicToken) {
    revalidatePath(`/p/absensi/${agenda.publicToken}`);
  }
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

  const peserta = await prisma.kehadiranPeserta.findUnique({
    where: { id: pesertaId },
    select: { fotoUrl: true },
  });

  if (peserta?.fotoUrl) {
    await deleteFromR2OrLocal(peserta.fotoUrl);
  }

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

  type HistoryRecord = {
    agendaId: string;
    namaKegiatan: string;
    tanggal: Date;
    status: StatusKehadiran;
    keterangan?: string | null;
    namaPerwakilan?: string | null;
    jabatanPerwakilan?: string | null;
    fotoUrl?: string | null;
    lokasiText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isSelfInput?: boolean;
    waktuInput?: Date | null;
  };

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
      history: HistoryRecord[];
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
      history: HistoryRecord[];
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
            jabatanPerwakilan: p.jabatanPerwakilan,
            fotoUrl: p.fotoUrl,
            lokasiText: p.lokasiText,
            latitude: p.latitude,
            longitude: p.longitude,
            isSelfInput: p.isSelfInput,
            waktuInput: p.waktuInput,
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
          jabatanPerwakilan: p.jabatanPerwakilan,
          fotoUrl: p.fotoUrl,
          lokasiText: p.lokasiText,
          latitude: p.latitude,
          longitude: p.longitude,
          isSelfInput: p.isSelfInput,
          waktuInput: p.waktuInput,
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
        jabatanPerwakilan: p.jabatanPerwakilan,
        fotoUrl: p.fotoUrl,
        lokasiText: p.lokasiText,
        latitude: p.latitude,
        longitude: p.longitude,
        isSelfInput: p.isSelfInput,
        waktuInput: p.waktuInput,
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

