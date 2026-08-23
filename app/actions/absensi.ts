"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseWitaInput, formatWita, combineDateAndTimeWita, calculatePresensiWindow } from "@/lib/date-utils";
import { deleteFromR2OrLocal } from "@/lib/r2";
import { generateSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { StatusAgendaAbsensi, StatusKehadiran, StatusSesiAgenda } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { calculateDistanceMeters } from "@/lib/geo-utils";

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
    select: {
      id: true,
      nip: true,
      nama: true,
      jabatan: true,
      instansi: true,
      eselon: true,
      wajibAbsenOpd: true,
    },
    orderBy: [
      { wajibAbsenOpd: "desc" },
      { urutanOpd: "asc" },
      { instansi: "asc" },
      { nama: "asc" },
    ],
  });
}

export async function getPegawaiForBindingPaginated(params: {
  search?: string;
  status?: "ALL" | "BINDING" | "UNBOUND";
  eselon?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(10, Number(params.limit) || 50));
  const skip = (page - 1) * limit;

  const teamId = session.user.teamId;
  const search = params.search?.trim();
  const status = params.status || "ALL";
  const eselon = params.eselon || "ALL";

  // Build where clause
  const where: any = { teamId };

  if (search) {
    where.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { nip: { contains: search, mode: "insensitive" } },
      { jabatan: { contains: search, mode: "insensitive" } },
      { instansi: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status === "BINDING") {
    where.wajibAbsenOpd = true;
  } else if (status === "UNBOUND") {
    where.wajibAbsenOpd = false;
  }

  if (eselon === "ESELON_ONLY") {
    where.AND = [
      { eselon: { not: null } },
      { eselon: { not: "NON_ESELON" } },
      { eselon: { not: "" } },
    ];
  } else if (eselon === "NON_ESELON") {
    where.OR = [
      { eselon: null },
      { eselon: "NON_ESELON" },
      { eselon: "" },
    ];
  } else if (eselon !== "ALL") {
    where.eselon = eselon;
  }

  // Parallel fetch: items, totalFiltered, and stat counters
  const [items, totalFiltered, totalBound, totalPegawaiInTeam, countEselon2, countEselon3, countNonEselon] = await Promise.all([
    prisma.pegawai.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { wajibAbsenOpd: "desc" },
        { urutanOpd: "asc" },
        { instansi: "asc" },
        { nama: "asc" },
      ],
      select: {
        id: true,
        nip: true,
        nama: true,
        jabatan: true,
        instansi: true,
        eselon: true,
        kategoriPegawai: true,
        wajibAbsenOpd: true,
        urutanOpd: true,
      },
    }),
    prisma.pegawai.count({ where }),
    prisma.pegawai.count({ where: { teamId, wajibAbsenOpd: true } }),
    prisma.pegawai.count({ where: { teamId } }),
    prisma.pegawai.count({
      where: {
        teamId,
        wajibAbsenOpd: true,
        eselon: { in: ["II.a", "II.b"] },
      },
    }),
    prisma.pegawai.count({
      where: {
        teamId,
        wajibAbsenOpd: true,
        eselon: { in: ["III.a", "III.b"] },
      },
    }),
    prisma.pegawai.count({
      where: {
        teamId,
        wajibAbsenOpd: true,
        OR: [{ eselon: null }, { eselon: "NON_ESELON" }, { eselon: "" }],
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems: totalFiltered,
      totalPages: Math.max(1, Math.ceil(totalFiltered / limit)),
    },
    stats: {
      totalPegawai: totalPegawaiInTeam,
      totalBound,
      countEselon2,
      countEselon3,
      countNonEselon,
    },
  };
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

  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/pejabat");
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

  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/pejabat");
  return { success: true };
}

export async function bulkSetWajibAbsenByFilter(params: {
  search?: string;
  status?: "ALL" | "BINDING" | "UNBOUND";
  eselon?: string;
  wajibAbsenOpd: boolean;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const teamId = session.user.teamId;
  const search = params.search?.trim();
  const status = params.status || "ALL";
  const eselon = params.eselon || "ALL";

  // Build where clause matching filter
  const where: any = { teamId };

  if (search) {
    where.OR = [
      { nama: { contains: search, mode: "insensitive" } },
      { nip: { contains: search, mode: "insensitive" } },
      { jabatan: { contains: search, mode: "insensitive" } },
      { instansi: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status === "BINDING") {
    where.wajibAbsenOpd = true;
  } else if (status === "UNBOUND") {
    where.wajibAbsenOpd = false;
  }

  if (eselon === "ESELON_ONLY") {
    where.AND = [
      { eselon: { not: null } },
      { eselon: { not: "NON_ESELON" } },
      { eselon: { not: "" } },
    ];
  } else if (eselon === "NON_ESELON") {
    where.OR = [
      { eselon: null },
      { eselon: "NON_ESELON" },
      { eselon: "" },
    ];
  } else if (eselon !== "ALL") {
    where.eselon = eselon;
  }

  const result = await prisma.pegawai.updateMany({
    where,
    data: {
      wajibAbsenOpd: params.wajibAbsenOpd,
    },
  });

  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/pejabat");
  revalidatePath("/dashboard/pegawai");

  return { success: true, count: result.count };
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
    orderBy: [
      { createdAt: "desc" },
    ],
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
      templates: {
        orderBy: [
          { urutan: "asc" },
          { instansi: "asc" },
          { nama: "asc" },
        ],
      },
      sesi: {
        orderBy: { tanggalSesi: "desc" },
        include: {
          peserta: {
            orderBy: [
              { urutan: "asc" },
              { instansi: "asc" },
              { nama: "asc" },
            ],
          },
        },
      },
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

  // Auto-deduplikasi: bersihkan row duplikat TIDAK_HADIR jika peserta yang sama sudah memiliki record presensi terisi
  const filledPeserta = agenda.peserta.filter((p) => p.status !== "TIDAK_HADIR" || p.waktuInput !== null);
  if (filledPeserta.length > 0) {
    const duplicateIdsToDelete: string[] = [];
    const filledKeys = new Set(filledPeserta.map((p) => p.pegawaiId || `${p.instansi.trim().toLowerCase()}_${p.nama.trim().toLowerCase()}`));

    for (const p of agenda.peserta) {
      if (p.status === "TIDAK_HADIR" && !p.waktuInput) {
        const key = p.pegawaiId || `${p.instansi.trim().toLowerCase()}_${p.nama.trim().toLowerCase()}`;
        if (filledKeys.has(key)) {
          duplicateIdsToDelete.push(p.id);
        }
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await prisma.kehadiranPeserta.deleteMany({
        where: { id: { in: duplicateIdsToDelete } },
      }).catch(() => {});
      agenda.peserta = agenda.peserta.filter((p) => !duplicateIdsToDelete.includes(p.id));
    }
  }

  return agenda;
}

export async function getOrCreateSesiAgenda(
  agendaId: string,
  tanggalStr: string, // "YYYY-MM-DD"
  tx?: any
) {
  const db = tx || prisma;

  const agenda = await db.agendaAbsensi.findUnique({
    where: { id: agendaId },
    include: {
      templates: {
        orderBy: [{ urutan: "asc" }, { instansi: "asc" }, { nama: "asc" }],
      },
      peserta: {
        where: { isNonUndangan: false },
        distinct: ["pegawaiId", "nama"],
      },
      sesi: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!agenda) throw new Error("Agenda tidak ditemukan");

  // Jika agenda BUKAN agenda rutin (hanya rapat/acara 1 kali), gunakan sesi yang sudah ada
  if (!agenda.isRecurring && agenda.sesi.length > 0) {
    return await db.sesiAgendaAbsensi.findUniqueOrThrow({
      where: { id: agenda.sesi[0].id },
      include: {
        peserta: {
          orderBy: [
            { urutan: "asc" },
            { instansi: "asc" },
            { nama: "asc" },
          ],
        },
      },
    });
  }

  const parsedDate = new Date(`${tanggalStr}T00:00:00.000Z`);

  let sesi = await db.sesiAgendaAbsensi.findFirst({
    where: {
      agendaId,
      tanggalSesi: parsedDate,
    },
    include: {
      peserta: {
        orderBy: [
          { urutan: "asc" },
          { instansi: "asc" },
          { nama: "asc" },
        ],
      },
    },
  });

  if (!sesi) {
    sesi = await db.sesiAgendaAbsensi.create({
      data: {
        agendaId: agenda.id,
        tanggalSesi: parsedDate,
        status: StatusSesiAgenda.AKTIF,
        targetLatitude: agenda.targetLatitude,
        targetLongitude: agenda.targetLongitude,
        radiusMeter: agenda.radiusMeter,
      },
      include: {
        peserta: true,
      },
    });

    // Populate peserta sesi dari templates atau fallback daftar peserta
    const templateItems =
      agenda.templates.length > 0
        ? agenda.templates
        : agenda.peserta;

    if (templateItems.length > 0) {
      await db.kehadiranPeserta.createMany({
        data: templateItems.map((t: any, idx: number) => ({
          agendaId: agenda.id,
          sesiId: sesi.id,
          pegawaiId: t.pegawaiId || null,
          tanggalSesi: parsedDate,
          nama: t.nama,
          nip: t.nip || null,
          jabatan: t.jabatan,
          instansi: t.instansi,
          eselon: t.eselon || "II.b",
          urutan: t.urutan ?? idx + 1,
          status: StatusKehadiran.TIDAK_HADIR,
          isSelfInput: false,
          isNonUndangan: false,
        })),
        skipDuplicates: true,
      });

      sesi = await db.sesiAgendaAbsensi.findUnique({
        where: { id: sesi.id },
        include: {
          peserta: {
            orderBy: [
              { urutan: "asc" },
              { instansi: "asc" },
              { nama: "asc" },
            ],
          },
        },
      });
    }
  }

  return sesi!;
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
  enableCheckOut?: boolean;
  waktuBukaPulang?: string;
  waktuTutupPulang?: string;
  jamBukaPulang?: string;
  jamTutupPulang?: string;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  radiusMeter?: number | null;
  customPegawaiIds?: string[];
  pesertaIds?: string[];
  isRecurring?: boolean;
  recurringDays?: string[];
  recurringWeeks?: number[];
  recurringJamBuka?: string;
  recurringJamTutup?: string;
  kategori?: string;
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const parsedTanggal = parseWitaInput(payload.tanggal) || new Date();
  const hariComputed = payload.hari || formatWita(parsedTanggal, "EEEE");

  // Format waktu buka & tutup absen otomatis (H-1 jam dan H+4 jam) jika tidak diisi manual
  const tanggalStr = payload.tanggal.split("T")[0];
  let waktuBuka: Date | null = null;
  let waktuTutup: Date | null = null;

  const defaultWindow = calculatePresensiWindow(payload.waktu || "09:00");
  const effectiveJamBuka = payload.jamBuka || defaultWindow.jamBuka;
  const effectiveJamTutup = payload.jamTutup || defaultWindow.jamTutup;

  if (payload.waktuBukaAbsen) {
    waktuBuka = new Date(payload.waktuBukaAbsen);
  } else {
    waktuBuka = combineDateAndTimeWita(tanggalStr, effectiveJamBuka);
  }

  if (payload.waktuTutupAbsen) {
    waktuTutup = new Date(payload.waktuTutupAbsen);
  } else {
    waktuTutup = combineDateAndTimeWita(tanggalStr, effectiveJamTutup);
  }

  let waktuBukaPulang: Date | null = null;
  let waktuTutupPulang: Date | null = null;
  if (payload.enableCheckOut) {
    if (payload.waktuBukaPulang) {
      waktuBukaPulang = new Date(payload.waktuBukaPulang);
    } else if (payload.jamBukaPulang) {
      waktuBukaPulang = combineDateAndTimeWita(tanggalStr, payload.jamBukaPulang);
    }
    if (payload.waktuTutupPulang) {
      waktuTutupPulang = new Date(payload.waktuTutupPulang);
    } else if (payload.jamTutupPulang) {
      waktuTutupPulang = combineDateAndTimeWita(tanggalStr, payload.jamTutupPulang);
    }
  }

  // Ambil daftar pegawai yang dipilih pengguna (atau default rekomendasi wajib absen)
  let pejabatTerdaftar: any[] = [];
  if (Array.isArray(payload.pesertaIds)) {
    if (payload.pesertaIds.length > 0) {
      pejabatTerdaftar = await prisma.pegawai.findMany({
        where: {
          id: { in: payload.pesertaIds },
          teamId: session.user.teamId,
        },
        orderBy: [
          { urutanOpd: "asc" },
          { instansi: "asc" },
          { nama: "asc" },
        ],
      });
    }
  } else {
    // Fallback default: pegawai dengan wajibAbsenOpd = true
    pejabatTerdaftar = await prisma.pegawai.findMany({
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
        targetPeserta: payload.targetPeserta || "Daftar Hadir Pegawai / Pejabat",
        targetKategori: "SEMUA_OPD",
        isPublicActive: true,
        waktuBukaAbsen: waktuBuka,
        waktuTutupAbsen: waktuTutup,
        enableCheckOut: payload.enableCheckOut ?? false,
        waktuBukaPulang,
        waktuTutupPulang,
        requireLocation: payload.requireLocation ?? true,
        requirePhoto: payload.requirePhoto ?? true,
        allowNonPeserta: payload.allowNonPeserta ?? true,
        targetLatitude: payload.targetLatitude ?? null,
        targetLongitude: payload.targetLongitude ?? null,
        radiusMeter: payload.radiusMeter ?? 100,
        isRecurring: payload.isRecurring ?? false,
        recurringDays: payload.recurringDays ?? [],
        recurringWeeks: payload.recurringWeeks ?? [],
        recurringJamBuka: payload.recurringJamBuka ?? null,
        recurringJamTutup: payload.recurringJamTutup ?? null,
        kategori: payload.kategori || (payload.isRecurring ? "APEL" : "RAPAT"),
        status: StatusAgendaAbsensi.BERLANGSUNG,
        teamId: session.user.teamId,
        createdById: session.user.id,
      },
    });

    // 1. Simpan Template Undangan Master
    if (pejabatTerdaftar.length > 0) {
      await tx.agendaPesertaTemplate.createMany({
        data: pejabatTerdaftar.map((p, idx) => ({
          agendaId: agenda.id,
          pegawaiId: p.id,
          nama: p.nama,
          nip: p.nip || null,
          jabatan: p.jabatan,
          instansi: p.instansi,
          eselon: p.eselon || "II.b",
          urutan: p.urutanOpd ?? idx + 1,
        })),
      });
    }

    // 2. Buat Sesi Pertama
    const firstSesi = await tx.sesiAgendaAbsensi.create({
      data: {
        agendaId: agenda.id,
        tanggalSesi: parsedTanggal,
        status: StatusSesiAgenda.AKTIF,
        targetLatitude: agenda.targetLatitude,
        targetLongitude: agenda.targetLongitude,
        radiusMeter: agenda.radiusMeter,
        waktuBuka: waktuBuka,
        waktuTutup: waktuTutup,
        waktuBukaPulang: waktuBukaPulang,
        waktuTutupPulang: waktuTutupPulang,
      },
    });

    // 3. Simpan Peserta untuk Sesi Pertama
    if (pejabatTerdaftar.length > 0) {
      await tx.kehadiranPeserta.createMany({
        data: pejabatTerdaftar.map((p, idx) => ({
          agendaId: agenda.id,
          sesiId: firstSesi.id,
          pegawaiId: p.id,
          tanggalSesi: parsedTanggal,
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

  revalidatePath("/dashboard/presensi");
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
    enableCheckOut?: boolean;
    waktuBukaPulang?: string | Date | null;
    waktuTutupPulang?: string | Date | null;
    jamBukaPulang?: string;
    jamTutupPulang?: string;
    requireLocation?: boolean;
    requirePhoto?: boolean;
    allowNonPeserta?: boolean;
    targetLatitude?: number | null;
    targetLongitude?: number | null;
    radiusMeter?: number | null;
    status?: StatusAgendaAbsensi;
    driveUrl?: string;
    publicToken?: string;
    picPegawaiId?: string | null;
    picNama?: string | null;
    picNip?: string | null;
    picJabatan?: string | null;
    isRecurring?: boolean;
    recurringDays?: string[];
    recurringWeeks?: number[];
    recurringJamBuka?: string | null;
    recurringJamTutup?: string | null;
    kategori?: string;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const dataToUpdate: any = { ...payload };

  if (payload.tanggal) {
    dataToUpdate.tanggal = parseWitaInput(payload.tanggal) || new Date();
  }

  if (
    payload.jamBuka !== undefined ||
    payload.jamTutup !== undefined ||
    payload.jamBukaPulang !== undefined ||
    payload.jamTutupPulang !== undefined
  ) {
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
    if (payload.jamBukaPulang) {
      dataToUpdate.waktuBukaPulang = combineDateAndTimeWita(baseDate, payload.jamBukaPulang);
    }
    if (payload.jamTutupPulang) {
      dataToUpdate.waktuTutupPulang = combineDateAndTimeWita(baseDate, payload.jamTutupPulang);
    }
    delete dataToUpdate.jamBuka;
    delete dataToUpdate.jamTutup;
    delete dataToUpdate.jamBukaPulang;
    delete dataToUpdate.jamTutupPulang;
  }

  if (typeof payload.waktuBukaAbsen === "string") {
    dataToUpdate.waktuBukaAbsen = new Date(payload.waktuBukaAbsen);
  }
  if (typeof payload.waktuTutupAbsen === "string") {
    dataToUpdate.waktuTutupAbsen = new Date(payload.waktuTutupAbsen);
  }
  if (typeof payload.waktuBukaPulang === "string") {
    dataToUpdate.waktuBukaPulang = new Date(payload.waktuBukaPulang);
  }
  if (typeof payload.waktuTutupPulang === "string") {
    dataToUpdate.waktuTutupPulang = new Date(payload.waktuTutupPulang);
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

  revalidatePath("/dashboard/presensi");
  revalidatePath(`/dashboard/presensi/${id}`);
  revalidatePath("/dashboard/presensi/rekap");
  if (updated.publicToken) {
    revalidatePath(`/p/presensi/${updated.publicToken}`);
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

  revalidatePath("/dashboard/presensi");
  revalidatePath(`/dashboard/presensi/${id}`);
  if (updated.publicToken) {
    revalidatePath(`/p/presensi/${updated.publicToken}`);
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

  revalidatePath("/dashboard/presensi");
  return { success: true };
}

// ==========================================
// 2.5. PUBLIC SELF-INPUT ENDPOINTS (TANPA LOGIN)
// ==========================================

export async function getPublicAgendaByToken(token: string) {
  if (!token) throw new Error("Token tautan presensi tidak valid");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: {
      OR: [
        { publicToken: token },
        { id: token },
      ],
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
      enableCheckOut: true,
      waktuBukaPulang: true,
      waktuTutupPulang: true,
      requireLocation: true,
      requirePhoto: true,
      allowNonPeserta: true,
      targetLatitude: true,
      targetLongitude: true,
      radiusMeter: true,
      isRecurring: true,
      recurringDays: true,
      recurringWeeks: true,
      cancelledSessions: true,
      recurringJamBuka: true,
      recurringJamTutup: true,
      kategori: true,
    },
  });

  if (!agenda) {
    throw new Error("Agenda presensi tidak ditemukan atau telah dihapus");
  }

  const now = new Date();
  let timeStatus: "NOT_STARTED" | "OPEN" | "CLOSED" = "OPEN";
  let isCancelledSession = false;
  let cancelReason = "";

  const todayDateStr = formatWita(now, "yyyy-MM-dd");
  const cancelledList = (agenda.cancelledSessions as any[]) || [];
  const cancelledInfo = cancelledList.find((s) => s && s.tanggal === todayDateStr);

  if (cancelledInfo) {
    isCancelledSession = true;
    cancelReason = cancelledInfo.alasan || "Sesi presensi tanggal ini ditiadakan.";
    timeStatus = "CLOSED";
  } else if (!agenda.isPublicActive) {
    timeStatus = "CLOSED";
  } else if (agenda.isRecurring) {
    // Validasi Pekan ke-X (jika diatur)
    const currentWeekOfMonth = Math.ceil(now.getDate() / 7);
    const allowedWeeks = agenda.recurringWeeks || [];
    if (allowedWeeks.length > 0 && !allowedWeeks.includes(currentWeekOfMonth)) {
      timeStatus = "NOT_STARTED";
    } else {
      // Validasi Hari & Jam untuk Agenda Rutin
      const dayNamesMap: Record<string, string> = {
        Monday: "SENIN",
        Tuesday: "SELASA",
        Wednesday: "RABU",
        Thursday: "KAMIS",
        Friday: "JUMAT",
        Saturday: "SABTU",
        Sunday: "MINGGU",
      };
      const engDay = formatWita(now, "EEEE");
      const currentDay = dayNamesMap[engDay] || engDay.toUpperCase();
      const allowedDays = (agenda.recurringDays || []).map((d) => d.toUpperCase());

      if (allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
        timeStatus = "NOT_STARTED";
      } else {
        const currentWitaTime = formatWita(now, "HH:mm");
        if (agenda.recurringJamBuka && currentWitaTime < agenda.recurringJamBuka) {
          timeStatus = "NOT_STARTED";
        } else if (agenda.recurringJamTutup && currentWitaTime > agenda.recurringJamTutup) {
          timeStatus = "CLOSED";
        } else {
          timeStatus = "OPEN";
        }
      }
    }
  } else if (agenda.waktuBukaAbsen && now < agenda.waktuBukaAbsen) {
    timeStatus = "NOT_STARTED";
  } else if (agenda.waktuTutupAbsen && now > agenda.waktuTutupAbsen) {
    timeStatus = "CLOSED";
  }

  let timeStatusPulang: "NOT_STARTED" | "OPEN" | "CLOSED" = "OPEN";
  if (agenda.enableCheckOut) {
    if (isCancelledSession || !agenda.isPublicActive) {
      timeStatusPulang = "CLOSED";
    } else if (agenda.waktuBukaPulang && now < agenda.waktuBukaPulang) {
      timeStatusPulang = "NOT_STARTED";
    } else if (agenda.waktuTutupPulang && now > agenda.waktuTutupPulang) {
      timeStatusPulang = "CLOSED";
    }
  }

  return {
    ...agenda,
    isCancelledSession,
    cancelReason,
    ...agenda,
    serverTime: now.toISOString(),
    timeStatus,
    timeStatusPulang,
  };
}

export async function getPublicAgendaMonitorData(agendaId: string) {
  if (!agendaId) throw new Error("ID pemantauan tidak valid");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: {
      id: agendaId,
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
      enableCheckOut: true,
      waktuBukaPulang: true,
      waktuTutupPulang: true,
      isRecurring: true,
      recurringDays: true,
      recurringWeeks: true,
      recurringJamBuka: true,
      recurringJamTutup: true,
      kategori: true,
      picNama: true,
      picJabatan: true,
    },
  });

  if (!agenda) {
    throw new Error("Agenda presensi tidak ditemukan atau telah dihapus");
  }

  const now = new Date();
  let rawPeserta;
  let sesiId: string | null = null;
  let tanggalSesi: string | null = null;

  if (agenda.isRecurring) {
    const todayStr = formatWita(now, "yyyy-MM-dd");
    const sesi = await getOrCreateSesiAgenda(agenda.id, todayStr);
    sesiId = sesi.id;
    tanggalSesi = sesi.tanggalSesi ? sesi.tanggalSesi.toISOString() : null;

    rawPeserta = await prisma.kehadiranPeserta.findMany({
      where: {
        sesiId: sesi.id,
      },
      orderBy: [
        { urutan: "asc" },
        { instansi: "asc" },
        { nama: "asc" },
      ],
      select: {
        id: true,
        urutan: true,
        nama: true,
        nip: true,
        jabatan: true,
        instansi: true,
        eselon: true,
        status: true,
        namaPerwakilan: true,
        jabatanPerwakilan: true,
        keterangan: true,
        waktuInput: true,
        waktuPulang: true,
        isSelfInput: true,
        isNonUndangan: true,
        fotoUrl: true,
        fotoPulangUrl: true,
        lokasiText: true,
        distanceMeters: true,
        isInsideRadius: true,
      },
    });
  } else {
    rawPeserta = await prisma.kehadiranPeserta.findMany({
      where: {
        agendaId: agenda.id,
      },
      orderBy: [
        { urutan: "asc" },
        { instansi: "asc" },
        { nama: "asc" },
      ],
      select: {
        id: true,
        urutan: true,
        nama: true,
        nip: true,
        jabatan: true,
        instansi: true,
        eselon: true,
        status: true,
        namaPerwakilan: true,
        jabatanPerwakilan: true,
        keterangan: true,
        waktuInput: true,
        waktuPulang: true,
        isSelfInput: true,
        isNonUndangan: true,
        fotoUrl: true,
        fotoPulangUrl: true,
        lokasiText: true,
        distanceMeters: true,
        isInsideRadius: true,
      },
    });
  }

  // Auto-deduplikasi: bersihkan row duplikat TIDAK_HADIR jika peserta yang sama sudah memiliki record presensi terisi
  const filledPesertaMonitor = rawPeserta.filter((p) => p.status !== "TIDAK_HADIR" || p.waktuInput !== null);
  if (filledPesertaMonitor.length > 0) {
    const duplicateIdsToDelete: string[] = [];
    const filledKeys = new Set(filledPesertaMonitor.map((p) => p.nama.trim().toLowerCase()));

    for (const p of rawPeserta) {
      if (p.status === "TIDAK_HADIR" && !p.waktuInput) {
        const key = p.nama.trim().toLowerCase();
        if (filledKeys.has(key)) {
          duplicateIdsToDelete.push(p.id);
        }
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await prisma.kehadiranPeserta.deleteMany({
        where: { id: { in: duplicateIdsToDelete } },
      }).catch(() => {});
      rawPeserta = rawPeserta.filter((p) => !duplicateIdsToDelete.includes(p.id));
    }
  }

  const total = rawPeserta.length;
  const hadir = rawPeserta.filter((p) => p.status === "HADIR").length;
  const mewakili = rawPeserta.filter((p) => p.status === "MEWAKILI").length;
  const izin = rawPeserta.filter((p) => p.status === "IZIN").length;
  const tidakHadir = rawPeserta.filter((p) => p.status === "TIDAK_HADIR").length;
  const totalMengisi = hadir + mewakili + izin;
  const persentase = total > 0 ? Math.round((totalMengisi / total) * 100) : 0;

  return {
    agenda: {
      ...agenda,
      tanggal: agenda.tanggal ? agenda.tanggal.toISOString() : null,
      waktuBukaAbsen: agenda.waktuBukaAbsen ? agenda.waktuBukaAbsen.toISOString() : null,
      waktuTutupAbsen: agenda.waktuTutupAbsen ? agenda.waktuTutupAbsen.toISOString() : null,
      waktuBukaPulang: agenda.waktuBukaPulang ? agenda.waktuBukaPulang.toISOString() : null,
      waktuTutupPulang: agenda.waktuTutupPulang ? agenda.waktuTutupPulang.toISOString() : null,
    },
    sesi: {
      id: sesiId,
      tanggalSesi: tanggalSesi,
    },
    stats: {
      total,
      hadir,
      mewakili,
      izin,
      tidakHadir,
      totalMengisi,
      persentase,
    },
    peserta: rawPeserta.map((p) => ({
      ...p,
      hasFoto: !!p.fotoUrl,
      hasFotoPulang: !!p.fotoPulangUrl,
      fotoUrl: p.fotoUrl || null,
      fotoPulangUrl: p.fotoPulangUrl || null,
      waktuInput: p.waktuInput ? p.waktuInput.toISOString() : null,
      waktuPulang: p.waktuPulang ? p.waktuPulang.toISOString() : null,
    })),
    lastUpdated: now.toISOString(),
  };
}

export async function searchPublicPesertaAgenda(publicToken: string, query: string) {
  if (!publicToken || !query || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: {
      OR: [
        { publicToken },
        { id: publicToken },
      ],
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!agenda) {
    throw new Error("Agenda presensi tidak ditemukan");
  }

  // 1. Cari dari Daftar Kehadiran Peserta (Prioritas utama karena memuat status kehadiran & waktu absen aktual)
  const kehadiranMatches = await prisma.kehadiranPeserta.findMany({
    where: {
      agendaId: agenda.id,
      OR: [
        { nama: { contains: cleanQuery, mode: "insensitive" } },
        { instansi: { contains: cleanQuery, mode: "insensitive" } },
        { jabatan: { contains: cleanQuery, mode: "insensitive" } },
        { nip: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    orderBy: [
      { waktuInput: "desc" },
      { createdAt: "desc" },
    ],
    take: 15,
  });

  // 2. Cari dari Master Template Undangan Pejabat (Sebagai pelengkap jika belum ada di sesi)
  const templateMatches = await prisma.agendaPesertaTemplate.findMany({
    where: {
      agendaId: agenda.id,
      OR: [
        { nama: { contains: cleanQuery, mode: "insensitive" } },
        { instansi: { contains: cleanQuery, mode: "insensitive" } },
        { jabatan: { contains: cleanQuery, mode: "insensitive" } },
        { nip: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    take: 15,
  });

  // 3. Gabungkan dan deduplikasi (Record kehadiran aktual diutamakan)
  const combinedMap = new Map<string, any>();

  for (const k of kehadiranMatches) {
    const key = k.pegawaiId || `${k.instansi.trim().toLowerCase()}_${k.nama.trim().toLowerCase()}`;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, {
        id: k.id,
        pegawaiId: k.pegawaiId,
        nama: k.nama,
        nip: k.nip,
        jabatan: k.jabatan,
        instansi: k.instansi,
        eselon: k.eselon,
        urutan: k.urutan,
        status: k.status,
        isSelfInput: k.isSelfInput,
        waktuInput: k.waktuInput,
        waktuPulang: k.waktuPulang,
        fotoUrl: k.fotoUrl,
        fotoPulangUrl: k.fotoPulangUrl,
        latitudePulang: k.latitudePulang,
        longitudePulang: k.longitudePulang,
        accuracyPulang: k.accuracyPulang,
        lokasiPulangText: k.lokasiPulangText,
      });
    }
  }

  for (const t of templateMatches) {
    const key = t.pegawaiId || `${t.instansi.trim().toLowerCase()}_${t.nama.trim().toLowerCase()}`;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, {
        id: t.id,
        pegawaiId: t.pegawaiId,
        nama: t.nama,
        nip: t.nip,
        jabatan: t.jabatan,
        instansi: t.instansi,
        eselon: t.eselon,
        urutan: t.urutan,
        status: "TIDAK_HADIR",
        isSelfInput: false,
        waktuInput: null,
        waktuPulang: null,
        fotoUrl: null,
        fotoPulangUrl: null,
        latitudePulang: null,
        longitudePulang: null,
        accuracyPulang: null,
        lokasiPulangText: null,
      });
    }
  }

  return Array.from(combinedMap.values()).slice(0, 10);
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
    where: {
      OR: [
        { publicToken },
        { id: publicToken },
      ],
      isDeleted: false,
    },
  });

  if (!agenda) throw new Error("Agenda presensi tidak ditemukan");

  if (agenda.status === StatusAgendaAbsensi.DIBATALKAN) {
    throw new Error("Presensi tidak dapat dilakukan karena kegiatan telah DIBATALKAN");
  }

  if (!agenda.isPublicActive) {
    throw new Error("Pengisian presensi online saat ini dinonaktifkan oleh Administrator");
  }

  const now = new Date();
  const todayStr = formatWita(now, "yyyy-MM-dd");
  const sessionDate = new Date(`${todayStr}T00:00:00.000Z`);

  const sesi = await getOrCreateSesiAgenda(agenda.id, todayStr);

  if (sesi.status === StatusSesiAgenda.DITIADAKAN) {
    throw new Error(
      `Sesi presensi tanggal ${todayStr} telah DITIADAKAN / DILIBURKAN. Alasan: ${sesi.alasanDitiadakan || "Ditiadakan oleh Administrator"}`
    );
  }

  if (agenda.isRecurring) {
    const currentWeekOfMonth = Math.ceil(now.getDate() / 7);
    const allowedWeeks = agenda.recurringWeeks || [];
    if (allowedWeeks.length > 0 && !allowedWeeks.includes(currentWeekOfMonth)) {
      throw new Error(
        `Presensi agenda rutin ini hanya aktif pada pekan ke-${allowedWeeks.join(" & ke-")} (Hari ini adalah pekan ke-${currentWeekOfMonth})`
      );
    }

    const dayNamesMap: Record<string, string> = {
      Monday: "SENIN",
      Tuesday: "SELASA",
      Wednesday: "RABU",
      Thursday: "KAMIS",
      Friday: "JUMAT",
      Saturday: "SABTU",
      Sunday: "MINGGU",
    };
    const engDay = formatWita(now, "EEEE");
    const currentDay = dayNamesMap[engDay] || engDay.toUpperCase();
    const allowedDays = (agenda.recurringDays || []).map((d) => d.toUpperCase());

    if (allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
      throw new Error(
        `Presensi agenda rutin ini hanya dibuka pada hari: ${agenda.recurringDays.join(", ")} (Hari ini: ${currentDay})`
      );
    }

    const currentWitaTime = formatWita(now, "HH:mm");
    if (agenda.recurringJamBuka && currentWitaTime < agenda.recurringJamBuka) {
      throw new Error(
        `Presensi belum dibuka. Jadwal buka presensi hari ${currentDay} adalah pukul ${agenda.recurringJamBuka} WITA`
      );
    }
    if (agenda.recurringJamTutup && currentWitaTime > agenda.recurringJamTutup) {
      throw new Error(
        `Presensi telah berakhir pada pukul ${agenda.recurringJamTutup} WITA`
      );
    }
  } else {
    if (agenda.waktuBukaAbsen && now < agenda.waktuBukaAbsen) {
      throw new Error(
        `Presensi belum dibuka. Jadwal buka presensi: ${formatWita(agenda.waktuBukaAbsen, "dd MMMM yyyy HH:mm")} WITA`
      );
    }
    if (agenda.waktuTutupAbsen && now > agenda.waktuTutupAbsen) {
      throw new Error(
        `Presensi telah berakhir pada ${formatWita(agenda.waktuTutupAbsen, "dd MMMM yyyy HH:mm")} WITA`
      );
    }
  }

  const isIzin = payload.status === "IZIN";

  if (agenda.requirePhoto && !isIzin && !payload.fotoUrl) {
    throw new Error("Foto selfie bukti presensi wajib diambil dan diunggah");
  }

  if (agenda.requireLocation && !isIzin && (payload.latitude === undefined || payload.longitude === undefined || payload.latitude === null || payload.longitude === null)) {
    throw new Error("Izin lokasi (Geotag/GPS) wajib diaktifkan untuk memastikan kehadiran Anda di lokasi kegiatan");
  }

  let distanceMeters: number | null = null;
  let isInsideRadius: boolean | null = null;

  const targetLat = sesi.targetLatitude ?? agenda.targetLatitude;
  const targetLng = sesi.targetLongitude ?? agenda.targetLongitude;
  const allowedRadius = sesi.radiusMeter ?? agenda.radiusMeter ?? 100;

  if (
    !isIzin &&
    targetLat !== null &&
    targetLat !== undefined &&
    targetLng !== null &&
    targetLng !== undefined &&
    payload.latitude !== null &&
    payload.latitude !== undefined &&
    payload.longitude !== null &&
    payload.longitude !== undefined
  ) {
    distanceMeters = Math.round(
      calculateDistanceMeters(targetLat, targetLng, payload.latitude, payload.longitude)
    );
    isInsideRadius = distanceMeters <= allowedRadius;
  }

  let resultPeserta;

  if (payload.pesertaId) {
    // 1. Cari atau identifikasi target pegawai / template terlebih dahulu
    let targetPegawaiId: string | null = null;
    let targetNama: string = (payload.nama || "").trim();
    let targetNip: string | null = payload.nip ? payload.nip.trim() : null;
    let targetJabatan: string = (payload.jabatan || "").trim();
    let targetInstansi: string = (payload.instansi || "").trim();
    let targetEselon: string = payload.eselon || "II.b";
    let targetUrutan: number = 1;

    // Cari dari template undangan
    const targetTemplate = await prisma.agendaPesertaTemplate.findFirst({
      where: {
        agendaId: agenda.id,
        OR: [
          { id: payload.pesertaId },
          { pegawaiId: payload.pesertaId },
          targetNip ? { nip: targetNip } : undefined,
          targetNama ? { nama: { equals: targetNama, mode: "insensitive" } } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (targetTemplate) {
      targetPegawaiId = targetTemplate.pegawaiId || null;
      targetNama = targetTemplate.nama;
      targetNip = targetTemplate.nip || targetNip;
      targetJabatan = targetTemplate.jabatan;
      targetInstansi = targetTemplate.instansi;
      targetEselon = targetTemplate.eselon || targetEselon;
      targetUrutan = targetTemplate.urutan ?? targetUrutan;
    }

    // Jika pegawaiId belum ketemu, cari di master Pegawai
    if (!targetPegawaiId) {
      const targetPegawai = await prisma.pegawai.findFirst({
        where: {
          teamId: agenda.teamId,
          OR: [
            { id: payload.pesertaId },
            targetNip ? { nip: targetNip } : undefined,
            targetNama ? { nama: { equals: targetNama, mode: "insensitive" } } : undefined,
          ].filter(Boolean) as any,
        },
      });
      if (targetPegawai) {
        targetPegawaiId = targetPegawai.id;
        targetNama = targetNama || targetPegawai.nama;
        targetNip = targetNip || targetPegawai.nip;
        targetJabatan = targetJabatan || targetPegawai.jabatan;
        targetInstansi = targetInstansi || targetPegawai.instansi;
        targetEselon = targetPegawai.eselon || targetEselon;
      }
    }

    // 2. Cari existingRecord di agenda ini dengan seluruh kriteria pencocokan
    let existingRecord = await prisma.kehadiranPeserta.findFirst({
      where: {
        agendaId: agenda.id,
        ...(agenda.isRecurring ? { sesiId: sesi.id } : {}),
        OR: [
          { id: payload.pesertaId },
          { pegawaiId: payload.pesertaId },
          targetPegawaiId ? { pegawaiId: targetPegawaiId } : undefined,
          targetNip ? { nip: targetNip } : undefined,
          targetNama ? { nama: { equals: targetNama, mode: "insensitive" } } : undefined,
        ].filter(Boolean) as any,
      },
    });

    // 3. Jika belum ada sama sekali di agenda/sesi ini, baru buat row baru
    if (!existingRecord) {
      existingRecord = await prisma.kehadiranPeserta.create({
        data: {
          agendaId: agenda.id,
          sesiId: sesi.id,
          pegawaiId: targetPegawaiId,
          tanggalSesi: sessionDate,
          nama: targetNama || "Peserta",
          nip: targetNip,
          jabatan: targetJabatan || "-",
          instansi: targetInstansi || "-",
          eselon: targetEselon,
          urutan: targetUrutan,
          status: StatusKehadiran.TIDAK_HADIR,
          isSelfInput: false,
          isNonUndangan: false,
        },
      });
    }

    // Bersihkan duplicate row TIDAK_HADIR jika ada (dari pengisian sebelumnya)
    if (existingRecord) {
      await prisma.kehadiranPeserta.deleteMany({
        where: {
          agendaId: agenda.id,
          id: { not: existingRecord.id },
          status: StatusKehadiran.TIDAK_HADIR,
          waktuInput: null,
          OR: [
            targetPegawaiId ? { pegawaiId: targetPegawaiId } : undefined,
            targetNip ? { nip: targetNip } : undefined,
            targetNama ? { nama: { equals: targetNama, mode: "insensitive" } } : undefined,
          ].filter(Boolean) as any,
        },
      }).catch(() => {});
    }

    if (existingRecord.fotoUrl && payload.fotoUrl && existingRecord.fotoUrl !== payload.fotoUrl) {
      await deleteFromR2OrLocal(existingRecord.fotoUrl).catch(() => {});
    }

    resultPeserta = await prisma.kehadiranPeserta.update({
      where: { id: existingRecord.id },
      data: {
        sesiId: existingRecord.sesiId || sesi.id,
        tanggalSesi: existingRecord.tanggalSesi || sessionDate,
        nama: targetNama || existingRecord.nama,
        nip: targetNip || existingRecord.nip,
        jabatan: targetJabatan || existingRecord.jabatan,
        instansi: targetInstansi || existingRecord.instansi,
        status: payload.status,
        namaPerwakilan: payload.status === "MEWAKILI" ? payload.namaPerwakilan : null,
        jabatanPerwakilan: payload.status === "MEWAKILI" ? payload.jabatanPerwakilan : null,
        keterangan: payload.keterangan || null,
        fotoUrl: isIzin ? null : (payload.fotoUrl || null),
        latitude: isIzin ? null : (payload.latitude || null),
        longitude: isIzin ? null : (payload.longitude || null),
        accuracy: isIzin ? null : (payload.accuracy || null),
        lokasiText: isIzin ? null : (payload.lokasiText || null),
        distanceMeters: isIzin ? null : distanceMeters,
        isInsideRadius: isIzin ? null : isInsideRadius,
        waktuInput: now,
        isSelfInput: true,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      },
    });
  } else {
    if (agenda.allowNonPeserta === false) {
      throw new Error("Pengisian presensi untuk nama di luar daftar undangan tidak diizinkan pada kegiatan ini.");
    }

    if (!payload.nama || !payload.jabatan || !payload.instansi) {
      throw new Error("Nama, Jabatan, dan Instansi/OPD wajib diisi");
    }

    const matchedPegawai = await prisma.pegawai.findFirst({
      where: {
        teamId: agenda.teamId,
        OR: [
          payload.nip ? { nip: payload.nip } : undefined,
          { nama: { equals: payload.nama, mode: "insensitive" } },
        ].filter(Boolean) as any,
      },
    });

    const currentCount = await prisma.kehadiranPeserta.count({
      where: { sesiId: sesi.id },
    });

    resultPeserta = await prisma.kehadiranPeserta.create({
      data: {
        agendaId: agenda.id,
        sesiId: sesi.id,
        pegawaiId: matchedPegawai ? matchedPegawai.id : null,
        tanggalSesi: sessionDate,
        nama: payload.nama.trim(),
        nip: payload.nip?.trim() || null,
        jabatan: payload.jabatan.trim(),
        instansi: payload.instansi.trim(),
        eselon: payload.eselon || "Umum",
        urutan: currentCount + 1,
        status: payload.status,
        namaPerwakilan: payload.status === "MEWAKILI" ? payload.namaPerwakilan : null,
        jabatanPerwakilan: payload.status === "MEWAKILI" ? payload.jabatanPerwakilan : null,
        keterangan: payload.keterangan || null,
        fotoUrl: isIzin ? null : (payload.fotoUrl || null),
        latitude: isIzin ? null : (payload.latitude || null),
        longitude: isIzin ? null : (payload.longitude || null),
        accuracy: isIzin ? null : (payload.accuracy || null),
        lokasiText: isIzin ? null : (payload.lokasiText || null),
        distanceMeters: isIzin ? null : distanceMeters,
        isInsideRadius: isIzin ? null : isInsideRadius,
        waktuInput: now,
        isSelfInput: true,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
        isNonUndangan: true,
      },
    });
  }

  revalidatePath(`/p/presensi/${publicToken}`);
  revalidatePath(`/dashboard/presensi/${agenda.id}`);
  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/rekap");

  return {
    success: true,
    data: resultPeserta,
  };
}

export async function clearBuktiKehadiranPeserta(kehadiranId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const kehadiran = await prisma.kehadiranPeserta.findUnique({
    where: { id: kehadiranId },
    include: { agenda: true },
  });

  if (!kehadiran || kehadiran.agenda.teamId !== session.user.teamId) {
    throw new Error("Data presensi peserta tidak ditemukan");
  }

  if (kehadiran.fotoUrl) {
    await deleteFromR2OrLocal(kehadiran.fotoUrl).catch(() => {});
  }
  if (kehadiran.fotoPulangUrl) {
    await deleteFromR2OrLocal(kehadiran.fotoPulangUrl).catch(() => {});
  }

  const updated = await prisma.kehadiranPeserta.update({
    where: { id: kehadiranId },
    data: {
      status: StatusKehadiran.TIDAK_HADIR,
      namaPerwakilan: null,
      jabatanPerwakilan: null,
      keterangan: null,
      fotoUrl: null,
      fotoPulangUrl: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      lokasiText: null,
      distanceMeters: null,
      isInsideRadius: null,
      latitudePulang: null,
      longitudePulang: null,
      accuracyPulang: null,
      lokasiPulangText: null,
      distanceMetersPulang: null,
      isInsideRadiusPulang: null,
      waktuInput: null,
      waktuPulang: null,
      isSelfInput: false,
      ipAddress: null,
      userAgent: null,
    },
  });

  revalidatePath(`/dashboard/presensi/${kehadiran.agendaId}`);
  revalidatePath(`/p/presensi/${kehadiran.agenda.publicToken}`);
  revalidatePath("/dashboard/presensi/pejabat");
  revalidatePath("/dashboard/presensi/rekap");

  return {
    success: true,
    message: `Bukti presensi ${kehadiran.nama} berhasil dibersihkan`,
    data: updated,
  };
}

export async function bulkClearBuktiKehadiranPeserta(kehadiranIds: string[]) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const list = await prisma.kehadiranPeserta.findMany({
    where: {
      id: { in: kehadiranIds },
      agenda: { teamId: session.user.teamId },
    },
    include: { agenda: true },
  });

  for (const k of list) {
    if (k.fotoUrl) await deleteFromR2OrLocal(k.fotoUrl).catch(() => {});
    if (k.fotoPulangUrl) await deleteFromR2OrLocal(k.fotoPulangUrl).catch(() => {});
  }

  await prisma.kehadiranPeserta.updateMany({
    where: { id: { in: list.map((k) => k.id) } },
    data: {
      status: StatusKehadiran.TIDAK_HADIR,
      namaPerwakilan: null,
      jabatanPerwakilan: null,
      keterangan: null,
      fotoUrl: null,
      fotoPulangUrl: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      lokasiText: null,
      distanceMeters: null,
      isInsideRadius: null,
      latitudePulang: null,
      longitudePulang: null,
      accuracyPulang: null,
      lokasiPulangText: null,
      distanceMetersPulang: null,
      isInsideRadiusPulang: null,
      waktuInput: null,
      waktuPulang: null,
      isSelfInput: false,
      ipAddress: null,
      userAgent: null,
    },
  });

  if (list.length > 0) {
    revalidatePath(`/dashboard/presensi/${list[0].agendaId}`);
    revalidatePath(`/p/presensi/${list[0].agenda.publicToken}`);
  }
  revalidatePath("/dashboard/presensi/pejabat");
  revalidatePath("/dashboard/presensi/rekap");

  return {
    success: true,
    message: `Bukti presensi ${list.length} peserta berhasil dibersihkan`,
  };
}

export async function submitSelfAbsensiPulang(payload: {
  publicToken: string;
  pesertaId: string;
  fotoPulangUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  lokasiText?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { publicToken, pesertaId } = payload;
  if (!publicToken || !pesertaId) throw new Error("Parameter presensi tidak valid");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: {
      OR: [
        { publicToken },
        { id: publicToken },
      ],
      isDeleted: false,
    },
  });

  if (!agenda) throw new Error("Agenda presensi tidak ditemukan");

  if (!agenda.enableCheckOut) {
    throw new Error("Presensi pulang tidak diaktifkan pada kegiatan ini.");
  }

  if (agenda.status === StatusAgendaAbsensi.DIBATALKAN) {
    throw new Error("Presensi tidak dapat dilakukan karena kegiatan telah DIBATALKAN");
  }

  if (!agenda.isPublicActive) {
    throw new Error("Pengisian presensi online saat ini dinonaktifkan oleh Administrator");
  }

  const now = new Date();

  if (agenda.waktuBukaPulang && now < agenda.waktuBukaPulang) {
    throw new Error(
      `Presensi pulang belum dibuka. Jadwal buka presensi pulang: ${formatWita(agenda.waktuBukaPulang, "dd MMMM yyyy HH:mm")} WITA`
    );
  }

  if (agenda.waktuTutupPulang && now > agenda.waktuTutupPulang) {
    throw new Error(
      `Waktu presensi pulang telah berakhir pada ${formatWita(agenda.waktuTutupPulang, "dd MMMM yyyy HH:mm")} WITA`
    );
  }

  const peserta = await prisma.kehadiranPeserta.findUnique({
    where: { id: pesertaId },
  });

  if (!peserta || peserta.agendaId !== agenda.id) {
    throw new Error("Data peserta tidak ditemukan");
  }

  if (!peserta.waktuInput || peserta.status === StatusKehadiran.TIDAK_HADIR) {
    throw new Error("Anda belum melakukan presensi datang. Silakan isi presensi datang terlebih dahulu.");
  }

  if (agenda.requirePhoto && !payload.fotoPulangUrl) {
    throw new Error("Foto selfie bukti presensi pulang wajib diambil dan diunggah");
  }

  if (
    agenda.requireLocation &&
    (payload.latitude === undefined ||
      payload.longitude === undefined ||
      payload.latitude === null ||
      payload.longitude === null)
  ) {
    throw new Error("Izin lokasi (Geotag/GPS) wajib diaktifkan untuk presensi pulang");
  }

  let distanceMetersPulang: number | null = null;
  let isInsideRadiusPulang: boolean | null = null;

  const targetLat = agenda.targetLatitude;
  const targetLng = agenda.targetLongitude;
  const allowedRadius = agenda.radiusMeter ?? 100;

  if (
    targetLat !== null &&
    targetLat !== undefined &&
    targetLng !== null &&
    targetLng !== undefined &&
    payload.latitude !== null &&
    payload.latitude !== undefined &&
    payload.longitude !== null &&
    payload.longitude !== undefined
  ) {
    distanceMetersPulang = Math.round(
      calculateDistanceMeters(targetLat, targetLng, payload.latitude, payload.longitude)
    );
    isInsideRadiusPulang = distanceMetersPulang <= allowedRadius;
  }

  if (payload.fotoPulangUrl && peserta.fotoPulangUrl && peserta.fotoPulangUrl !== payload.fotoPulangUrl) {
    await deleteFromR2OrLocal(peserta.fotoPulangUrl).catch(() => {});
  }

  const updatedPeserta = await prisma.kehadiranPeserta.update({
    where: { id: pesertaId },
    data: {
      waktuPulang: now,
      fotoPulangUrl: payload.fotoPulangUrl || null,
      latitudePulang: payload.latitude || null,
      longitudePulang: payload.longitude || null,
      accuracyPulang: payload.accuracy || null,
      lokasiPulangText: payload.lokasiText || null,
      distanceMetersPulang,
      isInsideRadiusPulang,
    },
  });

  revalidatePath(`/p/presensi/${publicToken}`);
  revalidatePath(`/dashboard/presensi/${agenda.id}`);
  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/rekap");

  return {
    success: true,
    data: updatedPeserta,
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
    waktuPulang?: Date | string | null;
    isNonUndangan?: boolean;
  }[],
  extraAgendaData?: {
    namaKegiatan?: string;
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
    enableCheckOut?: boolean;
    targetLatitude?: number | null;
    targetLongitude?: number | null;
    radiusMeter?: number | null;
    requireLocation?: boolean;
    requirePhoto?: boolean;
    allowNonPeserta?: boolean;
    targetKategori?: string;
    targetPeserta?: string;
    publicToken?: string;
    picPegawaiId?: string | null;
    picNama?: string | null;
    picNip?: string | null;
    picJabatan?: string | null;
    isRecurring?: boolean;
    recurringDays?: string[];
    recurringWeeks?: number[];
    cancelledSessions?: any;
    recurringJamBuka?: string | null;
    recurringJamTutup?: string | null;
    kategori?: string | null;
  }
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  // Validasi kepemilikan agenda
  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { id: agendaId, teamId: session.user.teamId },
  });
  if (!agenda) throw new Error("Agenda tidak ditemukan");

  await prisma.$transaction(
    async (tx) => {
      if (pesertaList && pesertaList.length > 0) {
        await Promise.all(
          pesertaList.map((item) => {
            const updateData: any = {
              status: item.status,
              namaPerwakilan: item.status === "MEWAKILI" ? item.namaPerwakilan : null,
              jabatanPerwakilan: item.status === "MEWAKILI" ? item.jabatanPerwakilan : null,
              keterangan: item.keterangan || null,
            };
            if (item.waktuPulang !== undefined) {
              updateData.waktuPulang = item.waktuPulang ? new Date(item.waktuPulang) : null;
            }
            if (item.isNonUndangan !== undefined) {
              updateData.isNonUndangan = item.isNonUndangan;
            }
            return tx.kehadiranPeserta.update({
              where: { id: item.id, agendaId },
              data: updateData,
            });
          })
        );
      }

      if (extraAgendaData) {
        const agendaUpdatePayload: any = {};

        if (extraAgendaData.namaKegiatan !== undefined && extraAgendaData.namaKegiatan.trim()) {
          agendaUpdatePayload.namaKegiatan = extraAgendaData.namaKegiatan.trim();
        }

        if (extraAgendaData.enableCheckOut !== undefined) {
          agendaUpdatePayload.enableCheckOut = extraAgendaData.enableCheckOut;
        }

        if (extraAgendaData.targetKategori !== undefined) {
          agendaUpdatePayload.targetKategori = extraAgendaData.targetKategori;
        }
        if (extraAgendaData.targetPeserta !== undefined) {
          agendaUpdatePayload.targetPeserta = extraAgendaData.targetPeserta;
        }

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
        if (extraAgendaData.picPegawaiId !== undefined) {
          agendaUpdatePayload.picPegawaiId = extraAgendaData.picPegawaiId;
        }
        if (extraAgendaData.picNama !== undefined) {
          agendaUpdatePayload.picNama = extraAgendaData.picNama;
        }
        if (extraAgendaData.picNip !== undefined) {
          agendaUpdatePayload.picNip = extraAgendaData.picNip;
        }
        if (extraAgendaData.picJabatan !== undefined) {
          agendaUpdatePayload.picJabatan = extraAgendaData.picJabatan;
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
        if (extraAgendaData.isRecurring !== undefined) {
          agendaUpdatePayload.isRecurring = extraAgendaData.isRecurring;
        }
        if (extraAgendaData.recurringDays !== undefined) {
          agendaUpdatePayload.recurringDays = extraAgendaData.recurringDays;
        }
        if (extraAgendaData.recurringWeeks !== undefined) {
          agendaUpdatePayload.recurringWeeks = extraAgendaData.recurringWeeks;
        }
        if (extraAgendaData.cancelledSessions !== undefined) {
          agendaUpdatePayload.cancelledSessions = extraAgendaData.cancelledSessions;
        }
        if (extraAgendaData.recurringJamBuka !== undefined) {
          agendaUpdatePayload.recurringJamBuka = extraAgendaData.recurringJamBuka;
        }
        if (extraAgendaData.recurringJamTutup !== undefined) {
          agendaUpdatePayload.recurringJamTutup = extraAgendaData.recurringJamTutup;
        }
        if (extraAgendaData.kategori !== undefined) {
          agendaUpdatePayload.kategori = extraAgendaData.kategori;
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
    },
    {
      timeout: 30000,
      maxWait: 10000,
    }
  );

  revalidatePath(`/dashboard/presensi/${agendaId}`);
  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/rekap");
  if (agenda.publicToken) {
    revalidatePath(`/p/presensi/${agenda.publicToken}`);
  }
  return { success: true };
}

export async function toggleCancelRecurringSession(payload: {
  agendaId: string;
  tanggal: string; // "YYYY-MM-DD"
  alasan?: string;
  action: "CANCEL" | "RESTORE";
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const agenda = await prisma.agendaAbsensi.findFirst({
    where: { id: payload.agendaId, teamId: session.user.teamId },
    select: { id: true, cancelledSessions: true, publicToken: true },
  });
  if (!agenda) throw new Error("Agenda tidak ditemukan");

  const parsedDate = new Date(`${payload.tanggal}T00:00:00.000Z`);

  if (payload.action === "CANCEL") {
    await prisma.sesiAgendaAbsensi.upsert({
      where: {
        agendaId_tanggalSesi: {
          agendaId: payload.agendaId,
          tanggalSesi: parsedDate,
        },
      },
      update: {
        status: StatusSesiAgenda.DITIADAKAN,
        alasanDitiadakan: payload.alasan || "Ditiadakan / Diliburkan",
      },
      create: {
        agendaId: payload.agendaId,
        tanggalSesi: parsedDate,
        status: StatusSesiAgenda.DITIADAKAN,
        alasanDitiadakan: payload.alasan || "Ditiadakan / Diliburkan",
      },
    });
  } else {
    // RESTORE
    await prisma.sesiAgendaAbsensi.upsert({
      where: {
        agendaId_tanggalSesi: {
          agendaId: payload.agendaId,
          tanggalSesi: parsedDate,
        },
      },
      update: {
        status: StatusSesiAgenda.AKTIF,
        alasanDitiadakan: null,
      },
      create: {
        agendaId: payload.agendaId,
        tanggalSesi: parsedDate,
        status: StatusSesiAgenda.AKTIF,
      },
    });
  }

  const currentList = Array.isArray(agenda.cancelledSessions) ? [...(agenda.cancelledSessions as any[])] : [];

  if (payload.action === "CANCEL") {
    const existingIdx = currentList.findIndex((item: any) => item && item.tanggal === payload.tanggal);
    const newEntry = {
      tanggal: payload.tanggal,
      alasan: payload.alasan || "Ditiadakan / Diliburkan",
      cancelledAt: new Date().toISOString(),
      cancelledBy: session.user.name || session.user.email || "Administrator",
    };
    if (existingIdx !== -1) {
      currentList[existingIdx] = newEntry;
    } else {
      currentList.push(newEntry);
    }
  } else {
    // RESTORE
    const filtered = currentList.filter((item: any) => item && item.tanggal !== payload.tanggal);
    currentList.length = 0;
    currentList.push(...filtered);
  }

  await prisma.agendaAbsensi.update({
    where: { id: payload.agendaId },
    data: { cancelledSessions: currentList },
  });

  revalidatePath(`/dashboard/presensi/${payload.agendaId}`);
  revalidatePath("/dashboard/presensi");
  revalidatePath("/dashboard/presensi/rekap");
  if (agenda.publicToken) {
    revalidatePath(`/p/presensi/${agenda.publicToken}`);
  }
  return { success: true, cancelledSessions: currentList };
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
      status: payload.status || StatusKehadiran.TIDAK_HADIR,
      namaPerwakilan: payload.namaPerwakilan || null,
      jabatanPerwakilan: payload.jabatanPerwakilan || null,
      keterangan: payload.keterangan || null,
    },
  });

  revalidatePath(`/dashboard/presensi/${agendaId}`);
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

  revalidatePath(`/dashboard/presensi/${agendaId}`);
  return { success: true };
}

export async function bulkDeletePesertaFromAgenda(agendaId: string, pesertaIds: string[]) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (!pesertaIds || pesertaIds.length === 0) {
    return { success: true, count: 0 };
  }

  const pesertas = await prisma.kehadiranPeserta.findMany({
    where: {
      id: { in: pesertaIds },
      agendaId,
    },
    select: { id: true, fotoUrl: true },
  });

  for (const p of pesertas) {
    if (p.fotoUrl) {
      try {
        await deleteFromR2OrLocal(p.fotoUrl);
      } catch (err) {
        console.error("Error deleting foto:", err);
      }
    }
  }

  const res = await prisma.kehadiranPeserta.deleteMany({
    where: {
      id: { in: pesertaIds },
      agendaId,
    },
  });

  revalidatePath(`/dashboard/presensi/${agendaId}`);
  return { success: true, count: res.count };
}

// ==========================================
// 4. REKAPITULASI KEHADIRAN PERANGKAT DAERAH
// ==========================================

export async function getRekapKehadiranOpd(params?: {
  startDate?: string;
  endDate?: string;
  kategoriAgenda?: "ALL" | "RAPAT" | "APEL" | "RUTIN";
}) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const whereAgenda: any = {
    teamId: session.user.teamId,
    isDeleted: false,
    status: { not: StatusAgendaAbsensi.DIBATALKAN },
  };

  if (params?.kategoriAgenda && params.kategoriAgenda !== "ALL") {
    if (params.kategoriAgenda === "RUTIN") {
      whereAgenda.isRecurring = true;
    } else if (params.kategoriAgenda === "RAPAT") {
      whereAgenda.isRecurring = false;
    } else if (params.kategoriAgenda === "APEL") {
      whereAgenda.kategori = "APEL";
    }
  }

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

  type OpdPesertaItem = {
    id: string;
    nama: string;
    nip?: string | null;
    jabatan?: string;
    status: StatusKehadiran;
    keterangan?: string | null;
    namaPerwakilan?: string | null;
    jabatanPerwakilan?: string | null;
    fotoUrl?: string | null;
    fotoPulangUrl?: string | null;
    lokasiText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isSelfInput?: boolean;
    waktuInput?: Date | null;
    waktuPulang?: Date | null;
    distanceMeters?: number | null;
    isInsideRadius?: boolean | null;
    isNonUndangan?: boolean;
  };

  type OpdHistoryRecord = {
    agendaId: string;
    namaKegiatan: string;
    tanggal: Date;
    totalDiundang: number;
    hadir: number;
    hadirValid: number;
    hadirLuarRadius: number;
    hadirTanpaLokasi: number;
    hadirNonUndangan: number;
    mewakili: number;
    izin: number;
    tidakHadir: number;
    persentaseKehadiran: number;
    pesertaList: OpdPesertaItem[];
    isCancelledSession?: boolean;
    cancelReason?: string | null;
  };

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
    waktuPulang?: Date | null;
    fotoPulangUrl?: string | null;
    lokasiPulangText?: string | null;
    latitudePulang?: number | null;
    longitudePulang?: number | null;
    distanceMeters?: number | null;
    isInsideRadius?: boolean | null;
    radiusToleransiMeters?: number | null;
    isNonUndangan?: boolean;
    isCancelledSession?: boolean;
    cancelReason?: string | null;
  };

  // Akumulasi per Instansi / Perangkat Daerah dan Pegawai
  const opdMap: Record<
    string,
    {
      instansi: string;
      jabatanTerdata: string[];
      pegawaiTerdata: string[];
      totalDiundang: number;
      hadir: number;
      hadirValid: number;
      hadirLuarRadius: number;
      hadirTanpaLokasi: number;
      hadirNonUndangan: number;
      totalJarakLuarMeters: number;
      maxJarakLuarMeters: number;
      mewakili: number;
      tidakHadir: number;
      izin: number;
      history: OpdHistoryRecord[];
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
      hadirValid: number;
      hadirLuarRadius: number;
      hadirTanpaLokasi: number;
      hadirNonUndangan: number;
      totalJarakLuarMeters: number;
      maxJarakLuarMeters: number;
      mewakili: number;
      tidakHadir: number;
      izin: number;
      history: HistoryRecord[];
    }
  > = {};

  for (const ag of agendas) {
    // 1. Tentukan Titik Acuan & Radius Toleransi Agenda ini
    const hasVenue = typeof ag.targetLatitude === "number" && typeof ag.targetLongitude === "number";
    let centerLat: number | null = hasVenue ? ag.targetLatitude : null;
    let centerLng: number | null = hasVenue ? ag.targetLongitude : null;
    let radiusMeters: number = hasVenue ? (ag.radiusMeter || 50) : 100;

    if (!hasVenue) {
      const pWithGps = ag.peserta.filter(
        (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
      );
      if (pWithGps.length >= 4) {
        const sumLat = pWithGps.reduce((acc, cur) => acc + cur.latitude!, 0);
        const sumLng = pWithGps.reduce((acc, cur) => acc + cur.longitude!, 0);
        centerLat = sumLat / pWithGps.length;
        centerLng = sumLng / pWithGps.length;
        const distances = pWithGps.map((p) =>
          calculateDistanceMeters(centerLat!, centerLng!, p.latitude!, p.longitude!)
        );
        const meanDist = distances.reduce((a, b) => a + b, 0) / pWithGps.length;
        const variance =
          distances.reduce((acc, d) => acc + Math.pow(d - meanDist, 2), 0) / pWithGps.length;
        const stdDev = Math.sqrt(variance);
        radiusMeters = Math.max(50, Math.min(500, Math.round(meanDist + 2 * stdDev)));
      } else if (pWithGps.length > 0) {
        centerLat = pWithGps[0].latitude!;
        centerLng = pWithGps[0].longitude!;
        radiusMeters = 100;
      }
    }

    let processedPeserta: typeof ag.peserta = [];
    if (!ag.isRecurring) {
      processedPeserta = ag.peserta;
    } else {
      // Agenda Rutin: Evaluasi seluruh template OPD/Pegawai yang diundang pada setiap sesi tanggal aktif
      const cancelledList = (ag.cancelledSessions as any[]) || [];
      const cancelledMap = new Map<string, string>();
      for (const c of cancelledList) {
        if (c && c.tanggal) {
          cancelledMap.set(c.tanggal, c.alasan || "Ditiadakan / Libur");
        }
      }

      const recordedDates = Array.from(
        new Set(
          ag.peserta
            .filter((p) => p.tanggalSesi !== null || p.waktuInput !== null)
            .map((p) => formatWita(p.tanggalSesi || p.waktuInput || ag.tanggal, "yyyy-MM-dd"))
        )
      );

      const allDatesSet = new Set<string>(recordedDates);
      for (const cDate of cancelledMap.keys()) {
        let inRange = true;
        if (params?.startDate && cDate < params.startDate) inRange = false;
        if (params?.endDate && cDate > params.endDate) inRange = false;
        if (inRange) {
          allDatesSet.add(cDate);
        }
      }

      let sessionDates = allDatesSet.size > 0 ? Array.from(allDatesSet).sort((a, b) => b.localeCompare(a)) : [formatWita(ag.tanggal, "yyyy-MM-dd")];

      // Saring berdasarkan recurringWeeks jika diatur (contoh: [1, 3] hanya mengevaluasi pekan 1 dan 3)
      if (ag.recurringWeeks && ag.recurringWeeks.length > 0) {
        sessionDates = sessionDates.filter((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00.000Z`);
          const week = Math.ceil(dObj.getUTCDate() / 7);
          return ag.recurringWeeks.includes(week);
        });
      }

      if (sessionDates.length === 0) {
        continue;
      }

      // Dapatkan template master undangan unik
      const templateMap = new Map<string, typeof ag.peserta[0]>();
      for (const p of ag.peserta) {
        if (!p.isNonUndangan) {
          const key = p.pegawaiId || `${p.instansi}_${p.jabatan}_${p.nama}`;
          if (!templateMap.has(key)) {
            templateMap.set(key, p);
          }
        }
      }

      for (const sessDateStr of sessionDates) {
        const sessDate = new Date(`${sessDateStr}T00:00:00.000Z`);
        const isCancelled = cancelledMap.has(sessDateStr);
        const cancelReason = cancelledMap.get(sessDateStr);

        if (isCancelled) {
          // Masukkan ke riwayat OPD & Pegawai sebagai SESI DITIADAKAN (Bobot 0, tidak menambah total/alpa)
          const opdTemplates: Record<string, typeof ag.peserta> = {};
          for (const t of templateMap.values()) {
            const iKey = t.instansi.trim();
            if (!opdTemplates[iKey]) opdTemplates[iKey] = [];
            opdTemplates[iKey].push(t);
          }

          for (const [instansiKey, tList] of Object.entries(opdTemplates)) {
            if (!opdMap[instansiKey]) {
              opdMap[instansiKey] = {
                instansi: instansiKey,
                jabatanTerdata: [],
                pegawaiTerdata: [],
                totalDiundang: 0,
                hadir: 0,
                hadirValid: 0,
                hadirLuarRadius: 0,
                hadirTanpaLokasi: 0,
                hadirNonUndangan: 0,
                totalJarakLuarMeters: 0,
                maxJarakLuarMeters: 0,
                mewakili: 0,
                tidakHadir: 0,
                izin: 0,
                history: [],
              };
            }
            for (const p of tList) {
              const pegIdentifier = p.pegawaiId || `${p.nama}_${p.nip || ""}`;
              if (pegIdentifier && !opdMap[instansiKey].pegawaiTerdata.includes(pegIdentifier)) {
                opdMap[instansiKey].pegawaiTerdata.push(pegIdentifier);
              }
              if (p.jabatan && !opdMap[instansiKey].jabatanTerdata.includes(p.jabatan)) {
                opdMap[instansiKey].jabatanTerdata.push(p.jabatan);
              }
            }

            opdMap[instansiKey].history.push({
              agendaId: ag.id,
              namaKegiatan: ag.namaKegiatan,
              tanggal: sessDate,
              totalDiundang: 0,
              hadir: 0,
              hadirValid: 0,
              hadirLuarRadius: 0,
              hadirTanpaLokasi: 0,
              hadirNonUndangan: 0,
              mewakili: 0,
              izin: 0,
              tidakHadir: 0,
              persentaseKehadiran: 0,
              pesertaList: [],
              isCancelledSession: true,
              cancelReason,
            });
          }

          for (const t of templateMap.values()) {
            const pKey = t.pegawaiId || `${t.nama}_${t.nip || ""}`;
            if (!pegawaiMap[pKey]) {
              pegawaiMap[pKey] = {
                nama: t.nama,
                nip: t.nip,
                jabatan: t.jabatan,
                instansi: t.instansi,
                totalDiundang: 0,
                hadir: 0,
                hadirValid: 0,
                hadirLuarRadius: 0,
                hadirTanpaLokasi: 0,
                hadirNonUndangan: 0,
                totalJarakLuarMeters: 0,
                maxJarakLuarMeters: 0,
                mewakili: 0,
                tidakHadir: 0,
                izin: 0,
                history: [],
              };
            }
            pegawaiMap[pKey].history.push({
              agendaId: ag.id,
              namaKegiatan: ag.namaKegiatan,
              tanggal: sessDate,
              status: "IZIN",
              isCancelledSession: true,
              cancelReason,
            });
          }
          continue;
        }

        // Evaluasi setiap template undangan pada sesi tanggal aktif ini
        for (const [key, templateP] of templateMap.entries()) {
          const matched = ag.peserta.find((p) => {
            const pKey = p.pegawaiId || `${p.instansi}_${p.jabatan}_${p.nama}`;
            const pDateStr = formatWita(p.tanggalSesi || p.waktuInput || ag.tanggal, "yyyy-MM-dd");
            return pKey === key && pDateStr === sessDateStr && (p.tanggalSesi !== null || p.waktuInput !== null);
          });

          if (matched) {
            processedPeserta.push(matched);
          } else {
            // Belum/tidak hadir pada sesi tanggal ini -> hitung sebagai TIDAK_HADIR pada sesi ini
            processedPeserta.push({
              ...templateP,
              id: `${templateP.id}_${sessDateStr}`,
              tanggalSesi: sessDate,
              status: "TIDAK_HADIR",
              waktuInput: null,
              waktuPulang: null,
              fotoUrl: null,
              fotoPulangUrl: null,
              latitude: null,
              longitude: null,
              accuracy: null,
              lokasiText: null,
              latitudePulang: null,
              longitudePulang: null,
              accuracyPulang: null,
              lokasiPulangText: null,
              isSelfInput: false,
              ipAddress: null,
              userAgent: null,
            });
          }
        }

        // Tambahkan peserta non-undangan pada sesi ini
        const nonUndanganList = ag.peserta.filter((p) => {
          const isNon = Boolean(p.isNonUndangan);
          const pDateStr = formatWita(p.tanggalSesi || p.waktuInput || ag.tanggal, "yyyy-MM-dd");
          return isNon && pDateStr === sessDateStr;
        });
        processedPeserta.push(...nonUndanganList);
      }
    }

    // 1. Kelompokkan peserta per Perangkat Daerah untuk agenda/sesi ini
    const opdGroups: Record<string, typeof processedPeserta> = {};
    for (const p of processedPeserta) {
      const instansiKey = p.instansi.trim();
      if (!opdGroups[instansiKey]) opdGroups[instansiKey] = [];
      opdGroups[instansiKey].push(p);
    }

    for (const [instansiKey, pList] of Object.entries(opdGroups)) {
      if (!opdMap[instansiKey]) {
        opdMap[instansiKey] = {
          instansi: instansiKey,
          jabatanTerdata: [],
          pegawaiTerdata: [],
          totalDiundang: 0,
          hadir: 0,
          hadirValid: 0,
          hadirLuarRadius: 0,
          hadirTanpaLokasi: 0,
          hadirNonUndangan: 0,
          totalJarakLuarMeters: 0,
          maxJarakLuarMeters: 0,
          mewakili: 0,
          tidakHadir: 0,
          izin: 0,
          history: [],
        };
      }

      for (const p of pList) {
        const pegIdentifier = p.pegawaiId || `${p.nama}_${p.nip || ""}`;
        if (pegIdentifier && !opdMap[instansiKey].pegawaiTerdata.includes(pegIdentifier)) {
          opdMap[instansiKey].pegawaiTerdata.push(pegIdentifier);
        }
        if (p.jabatan && !opdMap[instansiKey].jabatanTerdata.includes(p.jabatan)) {
          opdMap[instansiKey].jabatanTerdata.push(p.jabatan);
        }
      }

      const sessionDate = pList[0]?.tanggalSesi || ag.tanggal;
      const sessionDateStr = formatWita(sessionDate, "yyyy-MM-dd");

      // Hitung metrik kehadiran pegawai OPD pada sesi agenda ini
      let pegHadirCount = 0;
      let pegHadirValidCount = 0;
      let pegHadirLuarRadiusCount = 0;
      let pegHadirTanpaLokasiCount = 0;
      let pegHadirNonUndanganCount = 0;
      let pegMewakiliCount = 0;
      let pegIzinCount = 0;
      let pegTidakHadirCount = 0;

      const pesertaDetailList = pList.map((p) => {
        const isNonUndangan = Boolean(p.isNonUndangan);
        let distMeters: number | null = null;
        let isInside: boolean | null = null;

        if (
          p.status === "HADIR" &&
          typeof p.latitude === "number" &&
          typeof p.longitude === "number" &&
          typeof centerLat === "number" &&
          typeof centerLng === "number"
        ) {
          distMeters = calculateDistanceMeters(centerLat, centerLng, p.latitude, p.longitude);
          isInside = distMeters <= radiusMeters;
        }

        if (p.status === "HADIR") {
          pegHadirCount += 1;
          if (isInside === false) {
            pegHadirLuarRadiusCount += 1;
            if (distMeters) {
              opdMap[instansiKey].totalJarakLuarMeters += distMeters;
              opdMap[instansiKey].maxJarakLuarMeters = Math.max(opdMap[instansiKey].maxJarakLuarMeters, distMeters);
            }
          } else if (isInside === true) {
            pegHadirValidCount += 1;
          } else {
            pegHadirTanpaLokasiCount += 1;
          }
        } else if (p.status === "MEWAKILI") {
          pegMewakiliCount += 1;
        } else if (p.status === "IZIN") {
          pegIzinCount += 1;
        } else {
          pegTidakHadirCount += 1;
        }

        if (isNonUndangan && (p.status === "HADIR" || p.status === "MEWAKILI")) {
          pegHadirNonUndanganCount += 1;
        }

        return {
          id: p.id,
          nama: p.nama,
          nip: p.nip,
          jabatan: p.jabatan,
          status: p.status,
          keterangan: p.keterangan,
          namaPerwakilan: p.namaPerwakilan,
          jabatanPerwakilan: p.jabatanPerwakilan,
          fotoUrl: p.fotoUrl,
          fotoPulangUrl: p.fotoPulangUrl,
          lokasiText: p.lokasiText,
          latitude: p.latitude,
          longitude: p.longitude,
          isSelfInput: p.isSelfInput,
          waktuInput: p.waktuInput,
          waktuPulang: p.waktuPulang,
          distanceMeters: distMeters,
          isInsideRadius: isInside,
          isNonUndangan,
        };
      });

      const pegDiundangCount = pList.filter((p) => !p.isNonUndangan).length || pList.length;
      const pegSessionPersentase = pegDiundangCount > 0
        ? Math.round(((pegHadirCount + pegMewakiliCount) / pegDiundangCount) * 100)
        : 0;

      // Pada tingkat Master OPD, dihitung per agenda kegiatan
      let masterHadir = 0;
      let masterHadirValid = 0;
      let masterHadirLuarRadius = 0;
      let masterHadirTanpaLokasi = 0;
      let masterHadirNonUndangan = pegHadirNonUndanganCount > 0 ? 1 : 0;
      let masterMewakili = 0;
      let masterIzin = 0;
      let masterTidakHadir = 0;

      if (pegHadirCount > 0) {
        masterHadir = 1;
        if (pegHadirValidCount > 0) {
          masterHadirValid = 1;
        } else if (pegHadirLuarRadiusCount > 0) {
          masterHadirLuarRadius = 1;
        } else {
          masterHadirTanpaLokasi = 1;
        }
      } else if (pegMewakiliCount > 0) {
        masterMewakili = 1;
      } else if (pegIzinCount > 0) {
        masterIzin = 1;
      } else {
        masterTidakHadir = 1;
      }

      // Akumulasi total Master OPD (1 agenda = 1 penugasan OPD)
      opdMap[instansiKey].totalDiundang += 1;
      opdMap[instansiKey].hadir += pegHadirCount;
      opdMap[instansiKey].mewakili += pegMewakiliCount;
      opdMap[instansiKey].izin += pegIzinCount;
      opdMap[instansiKey].tidakHadir += pegTidakHadirCount;

      opdMap[instansiKey].hadirValid += pegHadirValidCount;
      opdMap[instansiKey].hadirLuarRadius += pegHadirLuarRadiusCount;
      opdMap[instansiKey].hadirTanpaLokasi += pegHadirTanpaLokasiCount;
      opdMap[instansiKey].hadirNonUndangan += pegHadirNonUndanganCount;

      // Tambahkan / update riwayat history agenda OPD (sub-baris merinci kuota penugasan pegawai pada agenda)
      const existingHistoryIndex = opdMap[instansiKey].history.findIndex(
        (h) => h.agendaId === ag.id && formatWita(h.tanggal, "yyyy-MM-dd") === sessionDateStr
      );

      const opdHistoryEntry = {
        agendaId: ag.id,
        namaKegiatan: ag.namaKegiatan,
        tanggal: sessionDate,
        totalDiundang: pegDiundangCount,
        hadir: pegHadirCount,
        hadirValid: pegHadirValidCount,
        hadirLuarRadius: pegHadirLuarRadiusCount,
        hadirTanpaLokasi: pegHadirTanpaLokasiCount,
        hadirNonUndangan: pegHadirNonUndanganCount,
        mewakili: pegMewakiliCount,
        izin: pegIzinCount,
        tidakHadir: pegTidakHadirCount,
        persentaseKehadiran: pegSessionPersentase,
        pesertaList: pesertaDetailList,
      };

      if (existingHistoryIndex !== -1) {
        opdMap[instansiKey].history[existingHistoryIndex] = opdHistoryEntry;
      } else {
        opdMap[instansiKey].history.push(opdHistoryEntry);
      }
    }

    // 2. Logic rekap per pegawai
    for (const p of processedPeserta) {
      const isNonUndangan = Boolean(p.isNonUndangan);
      let distMeters: number | null = null;
      let isInside: boolean | null = null;
      if (
        p.status === "HADIR" &&
        typeof p.latitude === "number" &&
        typeof p.longitude === "number" &&
        typeof centerLat === "number" &&
        typeof centerLng === "number"
      ) {
        distMeters = calculateDistanceMeters(centerLat, centerLng, p.latitude, p.longitude);
        isInside = distMeters <= radiusMeters;
      }

      const recordDate = p.tanggalSesi || ag.tanggal;
      const recordDateStr = formatWita(recordDate, "yyyy-MM-dd");

      const pegawaiKey = p.pegawaiId || `${p.nama}_${p.nip || ""}_${p.jabatan}`;
      if (!pegawaiMap[pegawaiKey]) {
        pegawaiMap[pegawaiKey] = {
          nama: p.nama,
          nip: p.nip,
          jabatan: p.jabatan,
          instansi: p.instansi,
          totalDiundang: 0,
          hadir: 0,
          hadirValid: 0,
          hadirLuarRadius: 0,
          hadirTanpaLokasi: 0,
          hadirNonUndangan: 0,
          totalJarakLuarMeters: 0,
          maxJarakLuarMeters: 0,
          mewakili: 0,
          tidakHadir: 0,
          izin: 0,
          history: [],
        };
      }

      const existingPegHistoryIndex = pegawaiMap[pegawaiKey].history.findIndex(
        (h) => h.agendaId === ag.id && formatWita(h.tanggal, "yyyy-MM-dd") === recordDateStr
      );

      if (existingPegHistoryIndex !== -1) {
        const currentBest = pegawaiMap[pegawaiKey].history[existingPegHistoryIndex].status;
        const candidate = p.status;
        const getWeight = (st: StatusKehadiran) => {
          if (st === "HADIR") return 4;
          if (st === "MEWAKILI") return 3;
          if (st === "IZIN") return 2;
          return 1;
        };

        if (getWeight(candidate) > getWeight(currentBest)) {
          const oldRecord = pegawaiMap[pegawaiKey].history[existingPegHistoryIndex];
          if (oldRecord.status === "HADIR") {
            pegawaiMap[pegawaiKey].hadir -= 1;
            if (oldRecord.isInsideRadius === false) {
              pegawaiMap[pegawaiKey].hadirLuarRadius = Math.max(0, pegawaiMap[pegawaiKey].hadirLuarRadius - 1);
            } else if (oldRecord.isInsideRadius === true) {
              pegawaiMap[pegawaiKey].hadirValid = Math.max(0, pegawaiMap[pegawaiKey].hadirValid - 1);
            } else {
              pegawaiMap[pegawaiKey].hadirTanpaLokasi = Math.max(0, pegawaiMap[pegawaiKey].hadirTanpaLokasi - 1);
            }
          } else if (oldRecord.status === "MEWAKILI") pegawaiMap[pegawaiKey].mewakili -= 1;
          else if (oldRecord.status === "IZIN") pegawaiMap[pegawaiKey].izin -= 1;
          else pegawaiMap[pegawaiKey].tidakHadir -= 1;

          if (oldRecord.isNonUndangan && (oldRecord.status === "HADIR" || oldRecord.status === "MEWAKILI")) {
            pegawaiMap[pegawaiKey].hadirNonUndangan = Math.max(0, pegawaiMap[pegawaiKey].hadirNonUndangan - 1);
          }

          if (candidate === "HADIR") {
            pegawaiMap[pegawaiKey].hadir += 1;
            if (isInside === false) {
              pegawaiMap[pegawaiKey].hadirLuarRadius += 1;
              if (distMeters) {
                pegawaiMap[pegawaiKey].totalJarakLuarMeters += distMeters;
                pegawaiMap[pegawaiKey].maxJarakLuarMeters = Math.max(pegawaiMap[pegawaiKey].maxJarakLuarMeters, distMeters);
              }
            } else {
              pegawaiMap[pegawaiKey].hadirValid += 1;
            }
          } else if (candidate === "MEWAKILI") pegawaiMap[pegawaiKey].mewakili += 1;
          else if (candidate === "IZIN") pegawaiMap[pegawaiKey].izin += 1;
          else pegawaiMap[pegawaiKey].tidakHadir += 1;

          if (isNonUndangan && (candidate === "HADIR" || candidate === "MEWAKILI")) {
            pegawaiMap[pegawaiKey].hadirNonUndangan += 1;
          }

          pegawaiMap[pegawaiKey].history[existingPegHistoryIndex] = {
            agendaId: ag.id,
            namaKegiatan: ag.namaKegiatan,
            tanggal: recordDate,
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
            waktuPulang: p.waktuPulang,
            fotoPulangUrl: p.fotoPulangUrl,
            lokasiPulangText: p.lokasiPulangText,
            latitudePulang: p.latitudePulang,
            longitudePulang: p.longitudePulang,
            distanceMeters: distMeters,
            isInsideRadius: isInside,
            radiusToleransiMeters: radiusMeters,
            isNonUndangan,
          };
        }
      } else {
        pegawaiMap[pegawaiKey].totalDiundang += 1;
        if (p.status === "HADIR") {
          pegawaiMap[pegawaiKey].hadir += 1;
          if (isInside === false) {
            pegawaiMap[pegawaiKey].hadirLuarRadius += 1;
            if (distMeters) {
              pegawaiMap[pegawaiKey].totalJarakLuarMeters += distMeters;
              pegawaiMap[pegawaiKey].maxJarakLuarMeters = Math.max(pegawaiMap[pegawaiKey].maxJarakLuarMeters, distMeters);
            }
          } else {
            pegawaiMap[pegawaiKey].hadirValid += 1;
          }
        } else if (p.status === "MEWAKILI") pegawaiMap[pegawaiKey].mewakili += 1;
        else if (p.status === "IZIN") pegawaiMap[pegawaiKey].izin += 1;
        else pegawaiMap[pegawaiKey].tidakHadir += 1;

        if (isNonUndangan && (p.status === "HADIR" || p.status === "MEWAKILI")) {
          pegawaiMap[pegawaiKey].hadirNonUndangan += 1;
        }

        pegawaiMap[pegawaiKey].history.push({
          agendaId: ag.id,
          namaKegiatan: ag.namaKegiatan,
          tanggal: recordDate,
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
          waktuPulang: p.waktuPulang,
          fotoPulangUrl: p.fotoPulangUrl,
          lokasiPulangText: p.lokasiPulangText,
          latitudePulang: p.latitudePulang,
          longitudePulang: p.longitudePulang,
          distanceMeters: distMeters,
          isInsideRadius: isInside,
          radiusToleransiMeters: radiusMeters,
          isNonUndangan,
        });
      }
    }
  }

  const opdSummary = Object.values(opdMap).map((item) => {
    const totalPegawaiDiundang = item.history.reduce((acc, h) => acc + h.totalDiundang, 0);
    const totalPartisipasi = item.hadir + item.mewakili;
    const persentaseKehadiran =
      totalPegawaiDiundang > 0
        ? Math.round((totalPartisipasi / totalPegawaiDiundang) * 100)
        : 0;

    const persentaseHadirLangsung =
      totalPegawaiDiundang > 0
        ? Math.round((item.hadir / totalPegawaiDiundang) * 100)
        : 0;

    const persentaseValidLokasi =
      item.hadir > 0
        ? Math.round((item.hadirValid / item.hadir) * 100)
        : item.totalDiundang > 0 ? 0 : 100;

    const avgJarakLuarKm =
      item.hadirLuarRadius > 0
        ? Number(((item.totalJarakLuarMeters / item.hadirLuarRadius) / 1000).toFixed(1))
        : 0;
    const maxJarakLuarKm =
      item.hadirLuarRadius > 0
        ? Number((item.maxJarakLuarMeters / 1000).toFixed(1))
        : 0;

    let predikatKepatuhan = "Sangat Tertib";
    let evaluasiSingkat = "Kehadiran disiplin dan seluruhnya terverifikasi tepat di lokasi kegiatan.";

    if (item.totalDiundang === 0) {
      predikatKepatuhan = "-";
      evaluasiSingkat = "Belum ada agenda penugasan resmi.";
    } else if (persentaseKehadiran === 100 && item.hadirLuarRadius === 0) {
      predikatKepatuhan = "Sangat Tertib";
      evaluasiSingkat = `Tingkat kehadiran 100% (${item.hadir} Hadir di lokasi${item.mewakili > 0 ? `, ${item.mewakili} Mewakili` : ""}). Terverifikasi tertib.`;
    } else if (item.hadirLuarRadius > 0) {
      if (persentaseValidLokasi >= 75) {
        predikatKepatuhan = "Tertib (Ada Luar Lokasi)";
        evaluasiSingkat = `Kehadiran ${persentaseKehadiran}%. Terdapat ${item.hadirLuarRadius} presensi di luar radius lokasi (terjauh ${maxJarakLuarKm} km). Perlu klarifikasi tugas lapangan.`;
      } else {
        predikatKepatuhan = "Banyak Luar Lokasi";
        evaluasiSingkat = `Mayoritas presensi (${item.hadirLuarRadius} dari ${item.hadir}) tercatat di luar radius kegiatan (rata-rata ${avgJarakLuarKm} km).`;
      }
    } else if (persentaseKehadiran >= 80) {
      predikatKepatuhan = item.tidakHadir > 0 ? "Tertib (Ada Alpa)" : "Sangat Tertib";
      evaluasiSingkat = `Kehadiran ${persentaseKehadiran}% (${item.hadir} Hadir di lokasi${item.tidakHadir > 0 ? `, ${item.tidakHadir} Alpa` : ""}${item.izin > 0 ? `, ${item.izin} Izin` : ""}). Seluruh kehadiran di lokasi valid.`;
    } else if (persentaseKehadiran >= 60) {
      predikatKepatuhan = "Cukup Tertib";
      evaluasiSingkat = `Kehadiran ${persentaseKehadiran}% (${item.hadir} Hadir, ${item.tidakHadir + item.izin} Absen). Seluruh kehadiran di lokasi valid.`;
    } else {
      predikatKepatuhan = "Perlu Pembinaan";
      evaluasiSingkat = `Tingkat kehadiran rendah (${persentaseKehadiran}%). ${item.tidakHadir + item.izin} dari ${item.totalDiundang} penugasan tidak hadir.`;
    }

    if (item.hadirNonUndangan > 0) {
      evaluasiSingkat += ` (Termasuk ${item.hadirNonUndangan} kehadiran non-undangan).`;
    }

    return {
      ...item,
      totalPartisipasi,
      persentaseKehadiran,
      persentaseHadirLangsung,
      persentaseValidLokasi,
      avgJarakLuarKm,
      maxJarakLuarKm,
      predikatKepatuhan,
      evaluasiSingkat,
    };
  });

  const pegawaiSummary = Object.values(pegawaiMap).map((item) => {
    const totalPartisipasi = item.hadir + item.mewakili;
    const persentaseKehadiran =
      item.totalDiundang > 0
        ? Math.round((totalPartisipasi / item.totalDiundang) * 100)
        : 0;

    const persentaseValidLokasi =
      item.hadir > 0
        ? Math.round((item.hadirValid / item.hadir) * 100)
        : item.totalDiundang > 0 ? 0 : 100;

    const avgJarakLuarKm =
      item.hadirLuarRadius > 0
        ? Number(((item.totalJarakLuarMeters / item.hadirLuarRadius) / 1000).toFixed(1))
        : 0;
    const maxJarakLuarKm =
      item.hadirLuarRadius > 0
        ? Number((item.maxJarakLuarMeters / 1000).toFixed(1))
        : 0;

    let predikatKepatuhan = "Sangat Tertib";
    let evaluasiSingkat = "Kehadiran disiplin dan seluruhnya terverifikasi tepat di lokasi kegiatan.";

    if (item.totalDiundang === 0) {
      predikatKepatuhan = "-";
      evaluasiSingkat = "Belum ada agenda penugasan resmi.";
    } else if (persentaseKehadiran === 100 && item.hadirLuarRadius === 0) {
      predikatKepatuhan = "Sangat Tertib";
      evaluasiSingkat = `Tingkat kehadiran 100% (${item.hadir} Hadir di lokasi${item.mewakili > 0 ? `, ${item.mewakili} Mewakili` : ""}). Terverifikasi tertib.`;
    } else if (item.hadirLuarRadius > 0) {
      if (persentaseValidLokasi >= 75) {
        predikatKepatuhan = "Tertib (Ada Luar Lokasi)";
        evaluasiSingkat = `Kehadiran ${persentaseKehadiran}%. Terdapat ${item.hadirLuarRadius} presensi di luar radius lokasi (terjauh ${maxJarakLuarKm} km). Perlu klarifikasi tugas lapangan.`;
      } else {
        predikatKepatuhan = "Banyak Luar Lokasi";
        evaluasiSingkat = `Mayoritas presensi (${item.hadirLuarRadius} dari ${item.hadir}) tercatat di luar radius kegiatan (rata-rata ${avgJarakLuarKm} km).`;
      }
    } else if (persentaseKehadiran >= 80) {
      predikatKepatuhan = item.tidakHadir > 0 ? "Tertib (Ada Alpa)" : "Sangat Tertib";
      evaluasiSingkat = `Kehadiran ${persentaseKehadiran}% (${item.hadir} Hadir di lokasi${item.tidakHadir > 0 ? `, ${item.tidakHadir} Alpa` : ""}${item.izin > 0 ? `, ${item.izin} Izin` : ""}). Seluruh kehadiran di lokasi valid.`;
    } else if (persentaseKehadiran >= 60) {
      predikatKepatuhan = "Cukup Tertib";
      evaluasiSingkat = `Kehadiran ${persentaseKehadiran}% (${item.hadir} Hadir, ${item.tidakHadir + item.izin} Absen). Seluruh kehadiran di lokasi valid.`;
    } else {
      predikatKepatuhan = "Perlu Pembinaan";
      evaluasiSingkat = `Tingkat kehadiran rendah (${persentaseKehadiran}%). ${item.tidakHadir + item.izin} dari ${item.totalDiundang} penugasan tidak hadir.`;
    }

    if (item.hadirNonUndangan > 0) {
      evaluasiSingkat += ` (Termasuk ${item.hadirNonUndangan} kehadiran non-undangan).`;
    }

    return {
      ...item,
      totalPartisipasi,
      persentaseKehadiran,
      persentaseValidLokasi,
      avgJarakLuarKm,
      maxJarakLuarKm,
      predikatKepatuhan,
      evaluasiSingkat,
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
          status: StatusKehadiran.TIDAK_HADIR,
        },
      })
    )
  );

  revalidatePath(`/dashboard/presensi/${agendaId}`);
  return { success: true };
}

