"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { KategoriAgenda, StatusAgenda } from "@prisma/client";
import { formatWita } from "@/lib/date-utils";

export interface HolidayItem {
  date: string; // YYYY-MM-DD
  name: string;
  isCutiBersama: boolean;
}

export interface AgendaItemDTO {
  id: string;
  judul: string;
  kategori: KategoriAgenda;
  tanggalMulai: string; // YYYY-MM-DD atau ISO
  tanggalSelesai: string | null;
  waktuMulai: string | null;
  waktuSelesai: string | null;
  lokasi: string | null;
  deskripsi: string | null;
  pic: string | null;
  status: StatusAgenda;
  isReadOnly?: boolean;
  sourceType?: "MANUAL" | "SPJ_PERJADIN";
  spjId?: string;
  spjMeta?: {
    tempatBerangkat: string;
    tempatTujuan: string;
    lamaPerjalanan: number;
    alatAngkut: string;
    perihal: string;
    rosterNames: string[];
    kodeRekening?: string;
    totalPengeluaran?: number;
    terbayar?: boolean;
  };
}

// Fallback Resmi SKB 3 Menteri (2025 & 2026) untuk resiliensi jika API publik sedang gangguan
const SKB_HOLIDAYS_FALLBACK: Record<number, HolidayItem[]> = {
  2025: [
    { date: "2025-01-01", name: "Tahun Baru 2025 Masehi", isCutiBersama: false },
    { date: "2025-01-27", name: "Isra Mikraj Nabi Muhammad SAW", isCutiBersama: false },
    { date: "2025-01-28", name: "Cuti Bersama Tahun Baru Imlek", isCutiBersama: true },
    { date: "2025-01-29", name: "Tahun Baru Imlek 2576 Kongzili", isCutiBersama: false },
    { date: "2025-03-28", name: "Cuti Bersama Hari Suci Nyepi", isCutiBersama: true },
    { date: "2025-03-29", name: "Hari Suci Nyepi (Tahun Baru Saka 1947)", isCutiBersama: false },
    { date: "2025-03-31", name: "Hari Raya Idulfitri 1446 H", isCutiBersama: false },
    { date: "2025-04-01", name: "Hari Raya Idulfitri 1446 H", isCutiBersama: false },
    { date: "2025-04-02", name: "Cuti Bersama Idulfitri 1446 H", isCutiBersama: true },
    { date: "2025-04-03", name: "Cuti Bersama Idulfitri 1446 H", isCutiBersama: true },
    { date: "2025-04-04", name: "Cuti Bersama Idulfitri 1446 H", isCutiBersama: true },
    { date: "2025-04-07", name: "Cuti Bersama Idulfitri 1446 H", isCutiBersama: true },
    { date: "2025-04-18", name: "Wafat Yesus Kristus", isCutiBersama: false },
    { date: "2025-04-20", name: "Kebangkitan Yesus Kristus (Paskah)", isCutiBersama: false },
    { date: "2025-05-01", name: "Hari Buruh Internasional", isCutiBersama: false },
    { date: "2025-05-12", name: "Hari Raya Waisak 2569 BE", isCutiBersama: false },
    { date: "2025-05-13", name: "Cuti Bersama Hari Raya Waisak", isCutiBersama: true },
    { date: "2025-05-29", name: "Kenaikan Yesus Kristus", isCutiBersama: false },
    { date: "2025-05-30", name: "Cuti Bersama Kenaikan Yesus Kristus", isCutiBersama: true },
    { date: "2025-06-01", name: "Hari Lahir Pancasila", isCutiBersama: false },
    { date: "2025-06-06", name: "Hari Raya Iduladha 1446 H", isCutiBersama: false },
    { date: "2025-06-09", name: "Cuti Bersama Iduladha 1446 H", isCutiBersama: true },
    { date: "2025-06-27", name: "1 Muharam Tahun Baru Islam 1447 H", isCutiBersama: false },
    { date: "2025-08-17", name: "Proklamasi Kemerdekaan RI", isCutiBersama: false },
    { date: "2025-08-18", name: "Cuti Bersama Kemerdekaan RI", isCutiBersama: true },
    { date: "2025-09-05", name: "Maulid Nabi Muhammad SAW", isCutiBersama: false },
    { date: "2025-12-25", name: "Kelahiran Yesus Kristus (Natal)", isCutiBersama: false },
    { date: "2025-12-26", name: "Cuti Bersama Kelahiran Yesus Kristus", isCutiBersama: true },
  ],
  2026: [
    { date: "2026-01-01", name: "Tahun Baru 2026 Masehi", isCutiBersama: false },
    { date: "2026-01-16", name: "Isra Mikraj Nabi Muhammad SAW", isCutiBersama: false },
    { date: "2026-02-16", name: "Cuti Bersama Tahun Baru Imlek", isCutiBersama: true },
    { date: "2026-02-17", name: "Tahun Baru Imlek 2577 Kongzili", isCutiBersama: false },
    { date: "2026-03-18", name: "Cuti Bersama Hari Suci Nyepi", isCutiBersama: true },
    { date: "2026-03-19", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)", isCutiBersama: false },
    { date: "2026-03-20", name: "Hari Raya Idulfitri 1447 H", isCutiBersama: false },
    { date: "2026-03-21", name: "Hari Raya Idulfitri 1447 H", isCutiBersama: false },
    { date: "2026-03-23", name: "Cuti Bersama Idulfitri 1447 H", isCutiBersama: true },
    { date: "2026-03-24", name: "Cuti Bersama Idulfitri 1447 H", isCutiBersama: true },
    { date: "2026-03-25", name: "Cuti Bersama Idulfitri 1447 H", isCutiBersama: true },
    { date: "2026-04-03", name: "Wafat Yesus Kristus", isCutiBersama: false },
    { date: "2026-04-05", name: "Kebangkitan Yesus Kristus (Paskah)", isCutiBersama: false },
    { date: "2026-05-01", name: "Hari Buruh Internasional", isCutiBersama: false },
    { date: "2026-05-14", name: "Kenaikan Yesus Kristus", isCutiBersama: false },
    { date: "2026-05-15", name: "Cuti Bersama Kenaikan Yesus Kristus", isCutiBersama: true },
    { date: "2026-05-27", name: "Hari Raya Iduladha 1447 H", isCutiBersama: false },
    { date: "2026-05-28", name: "Cuti Bersama Iduladha 1447 H", isCutiBersama: true },
    { date: "2026-05-31", name: "Hari Raya Waisak 2570 BE", isCutiBersama: false },
    { date: "2026-06-01", name: "Hari Lahir Pancasila", isCutiBersama: false },
    { date: "2026-06-16", name: "1 Muharam Tahun Baru Islam 1448 H", isCutiBersama: false },
    { date: "2026-08-17", name: "Proklamasi Kemerdekaan RI", isCutiBersama: false },
    { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW", isCutiBersama: false },
    { date: "2026-12-24", name: "Cuti Bersama Kelahiran Yesus Kristus", isCutiBersama: true },
    { date: "2026-12-25", name: "Kelahiran Yesus Kristus (Natal)", isCutiBersama: false },
  ],
};

function normalizeDateKey(raw: string): string {
  const parts = raw.trim().split("T")[0].split("-");
  if (parts.length !== 3) return raw;
  const [y, m, d] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export async function getNationalHolidays(year: number): Promise<{
  holidays: HolidayItem[];
  source: string;
}> {
  const mergedMap = new Map<string, HolidayItem>();

  // 1. Muat basis data SKB 3 Menteri jika tersedia untuk tahun tersebut
  const skbList = SKB_HOLIDAYS_FALLBACK[year] || [];
  for (const item of skbList) {
    mergedMap.set(item.date, item);
  }

  let apiSource = "";

  // 2. Fetch dari API Publik Hari Libur Nasional Indonesia (api-harilibur.vercel.app)
  try {
    const res = await fetch(`https://api-harilibur.vercel.app/api?year=${year}`, {
      next: { revalidate: 86400 }, // Cache 24 jam
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          if (!item.holiday_date || !item.holiday_name) continue;
          if (item.is_national_holiday === false) continue;
          const dateKey = normalizeDateKey(String(item.holiday_date));
          const nameStr = String(item.holiday_name);
          const isCuti = nameStr.toLowerCase().includes("cuti bersama");
          mergedMap.set(dateKey, {
            date: dateKey,
            name: nameStr,
            isCutiBersama: isCuti,
          });
        }
        apiSource = "api-harilibur.vercel.app";
      }
    }
  } catch {
    // Lanjut ke cadangan API kedua bila timeout
  }

  // 3. Cadangan API Publik kedua (Nager.Date Public Holidays ID) jika belum terhubung
  if (!apiSource) {
    try {
      const res2 = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`, {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(3500),
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (Array.isArray(data2) && data2.length > 0) {
          for (const item of data2) {
            if (!item.date || !item.localName) continue;
            const dateKey = normalizeDateKey(String(item.date));
            const nameStr = String(item.localName);
            const isCuti = nameStr.toLowerCase().includes("cuti bersama");
            if (!mergedMap.has(dateKey)) {
              mergedMap.set(dateKey, {
                date: dateKey,
                name: nameStr,
                isCutiBersama: isCuti,
              });
            }
          }
          apiSource = "date.nager.at (ID)";
        }
      }
    } catch {
      // Gunakan data SKB fallback sepenuhnya
    }
  }

  const holidays = Array.from(mergedMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    holidays,
    source: apiSource ? `API (${apiSource}) + SKB 3 Menteri` : "SKB 3 Menteri (Lokal)",
  };
}

export async function getAgendaList(): Promise<AgendaItemDTO[]> {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Unauthorized");
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const todayStr = formatWita(new Date(), "yyyy-MM-dd");

  const [agendas, spjPerjadins] = await Promise.all([
    prisma.agendaTim.findMany({
      where: {
        teamId: session.user.teamId,
        isDeleted: false,
      },
      orderBy: { tanggalMulai: "asc" },
    }),
    prisma.spj.findMany({
      where: {
        isDeleted: false,
        jenisSpj: "PERJADIN",
        ...(isSuperAdmin ? {} : { teamId: session.user.teamId }),
        perjadinDetail: {
          isNot: null,
        },
      },
      include: {
        perjadinDetail: true,
        roster: {
          orderBy: { order: "asc" },
        },
        kodeRekening: true,
      },
      orderBy: { tanggalSpj: "desc" },
    }),
  ]);

  const manualItems: AgendaItemDTO[] = agendas.map((a) => ({
    id: a.id,
    judul: a.judul,
    kategori: a.kategori,
    tanggalMulai: formatWita(a.tanggalMulai, "yyyy-MM-dd"),
    tanggalSelesai: a.tanggalSelesai ? formatWita(a.tanggalSelesai, "yyyy-MM-dd") : null,
    waktuMulai: a.waktuMulai,
    waktuSelesai: a.waktuSelesai,
    lokasi: a.lokasi,
    deskripsi: a.deskripsi,
    pic: a.pic,
    status: a.status,
    isReadOnly: false,
    sourceType: "MANUAL",
  }));

  const perjadinItems: AgendaItemDTO[] = spjPerjadins
    .filter((spj) => spj.perjadinDetail !== null)
    .map((spj) => {
      const pd = spj.perjadinDetail!;
      const startStr = formatWita(pd.tglBerangkat, "yyyy-MM-dd");
      const endStr = formatWita(pd.tglKembali, "yyyy-MM-dd");

      const rosterNames = spj.roster.map((r) => r.nama);
      const rosterShort = spj.roster
        .slice(0, 3)
        .map((r) => r.nama.split(" ")[0])
        .join(", ");
      const extraRoster = spj.roster.length > 3 ? ` +${spj.roster.length - 3}` : "";

      let computedStatus: StatusAgenda = "DIRENCANAKAN";
      if (todayStr > endStr) {
        computedStatus = "SELESAI";
      } else if (todayStr >= startStr && todayStr <= endStr) {
        computedStatus = "BERLANGSUNG";
      }

      return {
        id: `spj-perjadin-${spj.id}`,
        spjId: spj.id,
        judul: `${pd.tempatTujuan}${rosterShort ? ` — ${rosterShort}${extraRoster}` : ""}`,
        kategori: "PERJALANAN_DINAS",
        tanggalMulai: startStr,
        tanggalSelesai: endStr,
        waktuMulai: null,
        waktuSelesai: null,
        lokasi: `${pd.tempatBerangkat} → ${pd.tempatTujuan}`,
        deskripsi: spj.perihal || "Perjalanan Dinas",
        pic: rosterNames.length > 0 ? rosterNames.join(", ") : null,
        status: computedStatus,
        isReadOnly: true,
        sourceType: "SPJ_PERJADIN",
        spjMeta: {
          tempatBerangkat: pd.tempatBerangkat,
          tempatTujuan: pd.tempatTujuan,
          lamaPerjalanan: pd.lamaPerjalanan,
          alatAngkut: pd.alatAngkut,
          perihal: spj.perihal || "-",
          rosterNames,
          kodeRekening: spj.kodeRekening
            ? `${spj.kodeRekening.kodeRekening} - ${spj.kodeRekening.judulRekening}`
            : undefined,
          totalPengeluaran: Number(spj.totalPengeluaran || 0),
          terbayar: spj.terbayar,
        },
      };
    });

  return [...perjadinItems, ...manualItems];
}

export async function createAgenda(formData: {
  judul: string;
  kategori: KategoriAgenda;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  pic?: string | null;
  status?: StatusAgenda;
}) {
  const session = await auth();
  if (!session?.user?.teamId || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const created = await prisma.agendaTim.create({
    data: {
      judul: formData.judul,
      kategori: formData.kategori || "RAPAT",
      tanggalMulai: new Date(formData.tanggalMulai),
      tanggalSelesai: formData.tanggalSelesai ? new Date(formData.tanggalSelesai) : null,
      waktuMulai: formData.waktuMulai || null,
      waktuSelesai: formData.waktuSelesai || null,
      lokasi: formData.lokasi || null,
      deskripsi: formData.deskripsi || null,
      pic: formData.pic || null,
      status: formData.status || "DIRENCANAKAN",
      teamId: session.user.teamId,
      createdById: session.user.id,
    },
  });

  revalidatePath("/dashboard/agenda");
  return { success: true, id: created.id };
}

export async function updateAgenda(
  id: string,
  formData: {
    judul: string;
    kategori: KategoriAgenda;
    tanggalMulai: string;
    tanggalSelesai?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    lokasi?: string | null;
    deskripsi?: string | null;
    pic?: string | null;
    status?: StatusAgenda;
  }
) {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Unauthorized");
  }

  await prisma.agendaTim.update({
    where: { id, teamId: session.user.teamId },
    data: {
      judul: formData.judul,
      kategori: formData.kategori,
      tanggalMulai: new Date(formData.tanggalMulai),
      tanggalSelesai: formData.tanggalSelesai ? new Date(formData.tanggalSelesai) : null,
      waktuMulai: formWaktuMulaiSafe(formData.waktuMulai),
      waktuSelesai: formWaktuMulaiSafe(formData.waktuSelesai),
      lokasi: formData.lokasi || null,
      deskripsi: formData.deskripsi || null,
      pic: formData.pic || null,
      status: formData.status || "DIRENCANAKAN",
    },
  });

  revalidatePath("/dashboard/agenda");
  return { success: true };
}

function formWaktuMulaiSafe(val?: string | null) {
  return val || null;
}

export async function deleteAgenda(id: string) {
  const session = await auth();
  if (!session?.user?.teamId) {
    throw new Error("Unauthorized");
  }

  await prisma.agendaTim.update({
    where: { id, teamId: session.user.teamId },
    data: { isDeleted: true },
  });

  revalidatePath("/dashboard/agenda");
  return { success: true };
}

export async function bulkSaveAgendas(payload: {
  updates: Array<{
    id: string;
    judul: string;
    kategori: KategoriAgenda;
    tanggalMulai: string;
    tanggalSelesai?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    lokasi?: string | null;
    deskripsi?: string | null;
    pic?: string | null;
    status?: StatusAgenda;
  }>;
  creates: Array<{
    judul: string;
    kategori: KategoriAgenda;
    tanggalMulai: string;
    tanggalSelesai?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    lokasi?: string | null;
    deskripsi?: string | null;
    pic?: string | null;
    status?: StatusAgenda;
  }>;
  deletes: string[];
}): Promise<{ success: boolean; message?: string; allAgendas?: AgendaItemDTO[] }> {
  const session = await auth();
  if (!session?.user?.teamId || !session.user.id) {
    throw new Error("Unauthorized");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Soft-delete
    if (payload.deletes.length > 0) {
      await tx.agendaTim.updateMany({
        where: {
          id: { in: payload.deletes },
          teamId: session.user.teamId,
        },
        data: { isDeleted: true },
      });
    }

    // 2. Updates
    for (const item of payload.updates) {
      await tx.agendaTim.update({
        where: { id: item.id, teamId: session.user.teamId },
        data: {
          judul: item.judul.trim(),
          kategori: item.kategori,
          tanggalMulai: new Date(item.tanggalMulai),
          tanggalSelesai: item.tanggalSelesai ? new Date(item.tanggalSelesai) : null,
          waktuMulai: item.waktuMulai || null,
          waktuSelesai: item.waktuSelesai || null,
          lokasi: item.lokasi || null,
          deskripsi: item.deskripsi || null,
          pic: item.pic || null,
          status: item.status || "DIRENCANAKAN",
        },
      });
    }

    // 3. Creates
    if (payload.creates.length > 0) {
      const validCreates = payload.creates
        .filter((c) => c.judul && c.tanggalMulai)
        .map((c) => ({
          judul: c.judul.trim(),
          kategori: c.kategori || "RAPAT",
          tanggalMulai: new Date(c.tanggalMulai),
          tanggalSelesai: c.tanggalSelesai ? new Date(c.tanggalSelesai) : null,
          waktuMulai: c.waktuMulai || null,
          waktuSelesai: c.waktuSelesai || null,
          lokasi: c.lokasi || null,
          deskripsi: c.deskripsi || null,
          pic: c.pic || null,
          status: c.status || "DIRENCANAKAN",
          teamId: session.user.teamId,
          createdById: session.user.id,
        }));

      if (validCreates.length > 0) {
        await tx.agendaTim.createMany({
          data: validCreates,
        });
      }
    }
  });

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard/agenda/edit-cepat");
  const allAgendas = await getAgendaList();
  return { success: true, allAgendas };
}

export async function importAgendasFromExcel(
  items: Array<{
    judul: string;
    kategori?: string;
    tanggalMulai: string;
    tanggalSelesai?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    lokasi?: string | null;
    deskripsi?: string | null;
    pic?: string | null;
    status?: string;
  }>
) {
  const session = await auth();
  if (!session?.user?.teamId || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const validCategories: Record<string, KategoriAgenda> = {
    RAPAT: "RAPAT",
    PERJALANAN_DINAS: "PERJALANAN_DINAS",
    "PERJALANAN DINAS": "PERJALANAN_DINAS",
    PERJADIN: "PERJALANAN_DINAS",
    SOSIALISASI: "SOSIALISASI",
    "SOSIALISASI / BIMTEK": "SOSIALISASI",
    BIMTEK: "SOSIALISASI",
    MONITORING_EVALUASI: "MONITORING_EVALUASI",
    "MONITORING EVALUASI": "MONITORING_EVALUASI",
    MONEV: "MONITORING_EVALUASI",
    ACARA_INTERNAL: "ACARA_INTERNAL",
    "ACARA INTERNAL": "ACARA_INTERNAL",
    PENGINGAT: "PENGINGAT",
    LAINNYA: "LAINNYA",
  };

  const validStatuses: Record<string, StatusAgenda> = {
    DIRENCANAKAN: "DIRENCANAKAN",
    BERLANGSUNG: "BERLANGSUNG",
    "SEDANG BERLANGSUNG": "BERLANGSUNG",
    SELESAI: "SELESAI",
    DIBATALKAN: "DIBATALKAN",
  };

  const dataToInsert = items
    .filter((item) => item.judul && item.tanggalMulai)
    .map((item) => {
      const katKey = (item.kategori || "PENGINGAT").toUpperCase().trim();
      const kategori: KategoriAgenda = validCategories[katKey] || "PENGINGAT";

      const stKey = (item.status || "DIRENCANAKAN").toUpperCase().trim();
      const status: StatusAgenda = validStatuses[stKey] || "DIRENCANAKAN";

      return {
        judul: item.judul.trim(),
        kategori,
        tanggalMulai: new Date(item.tanggalMulai),
        tanggalSelesai: item.tanggalSelesai ? new Date(item.tanggalSelesai) : null,
        waktuMulai: item.waktuMulai || null,
        waktuSelesai: item.waktuSelesai || null,
        lokasi: item.lokasi || null,
        deskripsi: item.deskripsi || null,
        pic: item.pic || null,
        status,
        teamId: session.user.teamId,
        createdById: session.user.id,
      };
    });

  if (dataToInsert.length === 0) {
    return { success: false, count: 0, message: "Tidak ada baris data valid yang dapat diimpor." };
  }

  // Batch insert
  await prisma.agendaTim.createMany({
    data: dataToInsert,
  });

  revalidatePath("/dashboard/agenda");
  return { success: true, count: dataToInsert.length };
}
