import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import PeriodeFilterSelector from "./PeriodeFilterSelector";
import { NAMA_BULAN, SHORT_MONTH_NAMES } from "./constants";
import RekapList, { type RekapItem, type MonthStat } from "./RekapList";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";

export const metadata = {
  title: "Rekap Perjalanan Dinas - SIPADIN",
};

export default async function RekapPerjadinPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; bulan?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const userTeamId = session.user.teamId;

  // Ambil semua tahun anggaran yang tersedia
  const tahunRows = await prisma.tahunAnggaran.findMany({
    orderBy: { tahun: "desc" },
    select: { id: true, tahun: true },
  });

  // Tentukan tahun aktif
  const selectedTahun = sp?.tahun || tahunRows[0]?.tahun;
  const selectedTahunObj = tahunRows.find((t) => t.tahun === selectedTahun);

  // Tentukan filter bulan (1 - 12 atau undefined untuk 'all')
  const rawBulan = sp?.bulan;
  const selectedBulan = rawBulan && rawBulan !== "all" ? parseInt(rawBulan, 10) : null;
  const bulanLabel = selectedBulan
    ? NAMA_BULAN.find((b) => b.value === String(selectedBulan))?.label || `Bulan ${selectedBulan}`
    : "Semua Bulan (Jan - Des)";

  // Filter SPJ dasar
  const spjWhereFilter: any = {
    isDeleted: false,
    jenisSpj: "PERJADIN" as const,
    ...(isSuperAdmin ? {} : { teamId: userTeamId }),
    ...(!isSuperAdmin ? { createdById: session.user.id } : {}),
    ...(selectedTahunObj
      ? {
          kodeRekening: {
            subKegiatan: { kegiatan: { tahunAnggaranId: selectedTahunObj.id } },
          },
        }
      : {}),
  };

  // Ambil semua pegawai internal di tim ini (atau semua tim jika super admin)
  const allInternalPegawai = await prisma.pegawai.findMany({
    where: isSuperAdmin
      ? { timInternal: true }
      : { teamId: userTeamId, timInternal: true },
    select: {
      id: true,
      nama: true,
      jabatan: true,
      nip: true,
      timInternal: true,
    },
    orderBy: { nama: "asc" },
  });

  // Ambil seluruh roster perjadin beserta detail SPJ & pengeluarannya
  const rosterRaw = await prisma.spjRosterItem.findMany({
    where: { spj: spjWhereFilter },
    select: {
      pegawaiId: true,
      pengeluaranDetails: { select: { kategori: true, hargaSatuan: true, faktorPengali: true } },
      spj: {
        select: {
          id: true,
          tanggalSpj: true,
          perihal: true,
          perjadinDetail: {
            select: {
              tempatBerangkat: true,
              tempatTujuan: true,
              tglBerangkat: true,
              tglKembali: true,
            },
          },
        },
      },
    },
    orderBy: { spj: { tanggalSpj: "asc" } },
  });

  // Hitung total SPJ Perjadin
  const totalSpjPerjadin = await prisma.spj.count({ where: spjWhereFilter });

  // Map agregasi per pegawai
  type PegawaiAgg = {
    countTotal: number;
    totalHari: number;
    totalPengeluaran: bigint;
    totalUangHarian: bigint;
    monthlyData: {
      [month: number]: {
        count: number;
        totalHari: number;
        totalPengeluaran: bigint;
        totalUangHarian: bigint;
        trips: {
          spjId: string;
          perihal: string;
          tempatTujuan: string;
          tempatBerangkat: string;
          tglBerangkat: string;
          tglKembali: string;
          month: number;
        }[];
      };
    };
  };

  const createEmptyMonthlyData = () => {
    const res: PegawaiAgg["monthlyData"] = {};
    for (let m = 1; m <= 12; m++) {
      res[m] = {
        count: 0,
        totalHari: 0,
        totalPengeluaran: BigInt(0),
        totalUangHarian: BigInt(0),
        trips: [],
      };
    }
    return res;
  };

  const pegawaiMap: Record<string, PegawaiAgg> = {};

  // Inisialisasi semua pegawai internal ke map dengan 0 data
  for (const peg of allInternalPegawai) {
    pegawaiMap[peg.id] = {
      countTotal: 0,
      totalHari: 0,
      totalPengeluaran: BigInt(0),
      totalUangHarian: BigInt(0),
      monthlyData: createEmptyMonthlyData(),
    };
  }

  // Iterasi roster data
  for (const r of rosterRaw) {
    if (!pegawaiMap[r.pegawaiId]) {
      pegawaiMap[r.pegawaiId] = {
        countTotal: 0,
        totalHari: 0,
        totalPengeluaran: BigInt(0),
        totalUangHarian: BigInt(0),
        monthlyData: createEmptyMonthlyData(),
      };
    }

    // Tentukan bulan berdasarkan tglBerangkat (atau tanggalSpj jika detail null)
    let tripDate = r.spj.tanggalSpj;
    if (r.spj.perjadinDetail?.tglBerangkat) {
      tripDate = r.spj.perjadinDetail.tglBerangkat;
    }
    const month = tripDate.getMonth() + 1; // 1 - 12

    // Hitung pengeluaran item ini
    let tripPengeluaran = BigInt(0);
    let tripUangHarian = BigInt(0);

    for (const d of r.pengeluaranDetails) {
      const pengali = (d.faktorPengali as { value: number }[]).reduce(
        (acc, f) => acc * (parseInt(String(f.value)) || 1),
        1
      );
      const subtotal = BigInt(d.hargaSatuan.toString()) * BigInt(pengali);
      tripPengeluaran += subtotal;

      const katLower = d.kategori?.trim().toLowerCase() || "";
      if (katLower.includes("harian")) {
        tripUangHarian += subtotal;
      }
    }

    // Hitung lama hari
    let hari = 1;
    if (r.spj.perjadinDetail) {
      const tglB = r.spj.perjadinDetail.tglBerangkat;
      const tglK = r.spj.perjadinDetail.tglKembali;
      hari = Math.round((tglK.getTime() - tglB.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Tambah ke total tahunan
    pegawaiMap[r.pegawaiId].countTotal += 1;
    pegawaiMap[r.pegawaiId].totalHari += hari;
    pegawaiMap[r.pegawaiId].totalPengeluaran += tripPengeluaran;
    pegawaiMap[r.pegawaiId].totalUangHarian += tripUangHarian;

    // Tambah ke bulanan
    if (pegawaiMap[r.pegawaiId].monthlyData[month]) {
      const mData = pegawaiMap[r.pegawaiId].monthlyData[month];
      mData.count += 1;
      mData.totalHari += hari;
      mData.totalPengeluaran += tripPengeluaran;
      mData.totalUangHarian += tripUangHarian;
      mData.trips.push({
        spjId: r.spj.id,
        perihal: r.spj.perihal || "",
        tempatBerangkat: r.spj.perjadinDetail?.tempatBerangkat || "Sendawar",
        tempatTujuan: r.spj.perjadinDetail?.tempatTujuan || "-",
        tglBerangkat: (r.spj.perjadinDetail?.tglBerangkat || r.spj.tanggalSpj).toISOString(),
        tglKembali: (r.spj.perjadinDetail?.tglKembali || r.spj.tanggalSpj).toISOString(),
        month,
      });
    }
  }

  // Ambil pegawai luar yang ikut perjadin tapi bukan internal
  const allPegawaiIds = Object.keys(pegawaiMap);
  const extraPegawais = await prisma.pegawai.findMany({
    where: {
      id: { in: allPegawaiIds },
      timInternal: false,
    },
    select: { id: true, nama: true, jabatan: true, nip: true, timInternal: true },
  });

  const fullPegawaiList = [...allInternalPegawai, ...extraPegawais];

  // Susun data rekap sesuai filter bulan aktif
  const rekapList: RekapItem[] = Object.entries(pegawaiMap).map(([pegId, data]) => {
    const peg = fullPegawaiList.find((p) => p.id === pegId);

    // Buat monthlyStats (12 bulan)
    const monthlyStats: MonthStat[] = [];
    for (let m = 1; m <= 12; m++) {
      const mCount = data.monthlyData[m]?.count || 0;
      monthlyStats.push({
        month: m,
        monthName: SHORT_MONTH_NAMES[m - 1],
        count: mCount,
        totalHari: data.monthlyData[m]?.totalHari || 0,
        isOverLimit: mCount > 15,
      });
    }

    // Tentukan count & trips berdasarkan filter bulan aktif
    let activeCount = data.countTotal;
    let activeHari = data.totalHari;
    let activePengeluaran = data.totalPengeluaran;
    let activeUangHarian = data.totalUangHarian;
    let activeTrips = Object.values(data.monthlyData).flatMap((m) => m.trips);
    let isOverLimit = monthlyStats.some((m) => m.isOverLimit);

    if (selectedBulan) {
      const mData = data.monthlyData[selectedBulan];
      activeCount = mData?.count || 0;
      activeHari = mData?.totalHari || 0;
      activePengeluaran = mData?.totalPengeluaran || BigInt(0);
      activeUangHarian = mData?.totalUangHarian || BigInt(0);
      activeTrips = mData?.trips || [];
      isOverLimit = activeCount > 15;
    }

    return {
      rank: 0, // nanti disort
      pegawaiId: pegId,
      nama: peg?.nama || "Pegawai Tidak Dikenal",
      jabatan: peg?.jabatan,
      nip: peg?.nip,
      timInternal: peg?.timInternal ?? true,
      count: activeCount,
      totalHari: activeHari,
      totalPengeluaran: activePengeluaran.toString(),
      totalUangHarian: activeUangHarian.toString(),
      isOverLimit,
      monthlyStats,
      trips: activeTrips,
    };
  });

  // Sort default: frekuensi terbanyak
  rekapList.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.totalHari - a.totalHari;
  });

  // Assign ranking
  rekapList.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  const formatRupiah = (val: bigint) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(val));

  const totalPengeluaranAktif = rekapList.reduce(
    (acc, r) => acc + BigInt(r.totalPengeluaran),
    BigInt(0)
  );

  const totalPegawaiOverLimit = rekapList.filter((r) => r.isOverLimit).length;

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-24 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
            <Link
              href="/dashboard"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Rekap Perjalanan Dinas</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">
            Rekap Perjalanan Dinas Pegawai
          </h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
            Rangkuman frekuensi &amp; hari perjalanan dinas per bulan dengan batasan maksimal 15×/bulan.
          </p>
        </div>

        {/* Filter Toolbar (Compact Single Component) */}
        <div className="shrink-0">
          <PeriodeFilterSelector
            tahunList={tahunRows.map((t) => t.tahun)}
            selectedTahun={selectedTahun}
            selectedBulan={selectedBulan ? String(selectedBulan) : "all"}
          />
        </div>
      </div>

      {/* Over Limit Alert Banner jika ada pegawai > 15x */}
      {totalPegawaiOverLimit > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-medium">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <span>
              Perhatian: Ditemukan <strong>{totalPegawaiOverLimit} pegawai</strong> yang melakukan perjalanan dinas lebih dari <strong>15×</strong> dalam sebulan.
            </span>
          </div>
        </div>
      )}

      {/* Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200/60 py-4 shadow-none">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Total SPJ Perjadin</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalSpjPerjadin}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">TA {selectedTahun || "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 py-4 shadow-none">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Pegawai Internal</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allInternalPegawai.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">personil terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 py-4 shadow-none">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Over Limit (&gt;15×)</p>
            <p className={`text-2xl font-black mt-1 ${totalPegawaiOverLimit > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {totalPegawaiOverLimit}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedBulan ? bulanLabel : "sepanjang tahun"}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 py-4 shadow-none col-span-2 sm:col-span-1">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Total Pengeluaran</p>
            <p className="text-base sm:text-lg font-black text-slate-900 mt-1 leading-tight">
              {formatRupiah(totalPengeluaranAktif)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedBulan ? bulanLabel : `TA ${selectedTahun || "-"}`}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Rekap */}
      <Card className="border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden py-0 gap-0">
        <CardHeader className="pt-4 pb-4 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Distribusi &amp; Frekuensi Perjalanan Pegawai
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Periode: <strong className="text-slate-700">{bulanLabel}</strong> (Tahun Anggaran {selectedTahun || "-"}) &bull; Limit: 15×/bulan.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <RekapList items={rekapList} isMonthFiltered={Boolean(selectedBulan)} selectedBulanNumber={selectedBulan} />
        </CardContent>
      </Card>

      <MobileBottomNav />
    </div>
  );
}
