import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import TahunSelector from "./TahunSelector";
import RekapList, { type RekapItem } from "./RekapList";

export const metadata = {
  title: "Rekap Perjalanan Dinas - SIPADIN",
};

export default async function RekapPerjadinPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // Ambil semua tahun anggaran yang tersedia
  const tahunRows = await prisma.tahunAnggaran.findMany({
    orderBy: { tahun: "desc" },
    select: { id: true, tahun: true },
  });

  // Tentukan tahun aktif: dari query param, atau tahun terbaru
  const selectedTahun = sp?.tahun || tahunRows[0]?.tahun;
  const selectedTahunObj = tahunRows.find((t) => t.tahun === selectedTahun);

  const spjWhereFilter = {
    isDeleted: false,
    jenisSpj: "PERJADIN" as const,
    ...(!isSuperAdmin ? { createdById: session.user.id } : {}),
    ...(selectedTahunObj
      ? {
          kodeRekening: {
            subKegiatan: { kegiatan: { tahunAnggaranId: selectedTahunObj.id } },
          },
        }
      : {}),
  };

  // Ambil semua roster perjadin + detail SPJ-nya (perihal, tujuan, tanggal) + pengeluaran
  const rosterRaw = await prisma.spjRosterItem.findMany({
    where: { spj: spjWhereFilter },
    select: {
      pegawaiId: true,
      pengeluaranDetails: { select: { hargaSatuan: true, faktorPengali: true } },
      spj: {
        select: {
          id: true,
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

  // Hitung total SPJ Perjadin di tahun ini
  const totalSpjPerjadin = await prisma.spj.count({ where: spjWhereFilter });

  // Agregasi manual per pegawai
  const pegawaiMap: Record<
    string,
    {
      count: number;
      totalHari: number;
      totalPengeluaran: bigint;
      trips: {
        spjId: string;
        perihal: string;
        tempatTujuan: string;
        tempatBerangkat: string;
        tglBerangkat: string;
        tglKembali: string;
      }[];
    }
  > = {};

  for (const r of rosterRaw) {
    if (!pegawaiMap[r.pegawaiId]) {
      pegawaiMap[r.pegawaiId] = { count: 0, totalHari: 0, totalPengeluaran: BigInt(0), trips: [] };
    }
    pegawaiMap[r.pegawaiId].count += 1;

    // Hitung pengeluaran
    for (const d of r.pengeluaranDetails) {
      const pengali = (d.faktorPengali as { value: number }[]).reduce(
        (acc, f) => acc * (parseInt(String(f.value)) || 1),
        1
      );
      pegawaiMap[r.pegawaiId].totalPengeluaran +=
        BigInt(d.hargaSatuan.toString()) * BigInt(pengali);
    }

    // Simpan trip + hitung hari
    if (r.spj.perjadinDetail) {
      const tglB = r.spj.perjadinDetail.tglBerangkat;
      const tglK = r.spj.perjadinDetail.tglKembali;
      const hari = Math.round((tglK.getTime() - tglB.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      pegawaiMap[r.pegawaiId].totalHari += hari;
      pegawaiMap[r.pegawaiId].trips.push({
        spjId: r.spj.id,
        perihal: r.spj.perihal || "",
        tempatBerangkat: r.spj.perjadinDetail.tempatBerangkat || "",
        tempatTujuan: r.spj.perjadinDetail.tempatTujuan || "",
        tglBerangkat: tglB.toISOString(),
        tglKembali: tglK.toISOString(),
      });
    }
  }

  const pegawaiIds = Object.keys(pegawaiMap);
  const pegawaiList = await prisma.pegawai.findMany({
    where: { id: { in: pegawaiIds } },
    select: { id: true, nama: true, jabatan: true, nip: true },
  });

  const rekapList: RekapItem[] = Object.entries(pegawaiMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([pegId, data], idx) => {
      const peg = pegawaiList.find((p) => p.id === pegId);
      return {
        rank: idx + 1,
        pegawaiId: pegId,
        nama: peg?.nama || "Pegawai Tidak Dikenal",
        jabatan: peg?.jabatan,
        nip: peg?.nip,
        count: data.count,
        totalHari: data.totalHari,
        totalPengeluaran: data.totalPengeluaran.toString(),
        trips: data.trips,
      };
    });

  const formatRupiah = (val: bigint) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(val));

  const totalPengeluaranPerjadin = Object.values(pegawaiMap).reduce(
    (acc, r) => acc + r.totalPengeluaran,
    BigInt(0)
  );

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
            Rekap Perjalanan Dinas
          </h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
            Rangkuman frekuensi &amp; pengeluaran perjalanan dinas per pegawai.
          </p>
        </div>
        <div className="shrink-0">
          <TahunSelector
            tahunList={tahunRows.map((t) => t.tahun)}
            selected={selectedTahun}
          />
        </div>
      </div>

      {/* Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="border-slate-200/60 py-4 shadow-none">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Total SPJ Perjadin</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalSpjPerjadin}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">TA {selectedTahun || "-"}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 py-4 shadow-none">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Total Pegawai Terlibat</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{rekapList.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">pegawai unik</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/60 py-4 shadow-none col-span-2 sm:col-span-1">
          <CardContent className="px-4 pb-0">
            <p className="text-xs text-slate-500 font-medium">Total Pengeluaran</p>
            <p className="text-lg font-black text-slate-900 mt-1 leading-tight">
              {formatRupiah(totalPengeluaranPerjadin)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">TA {selectedTahun || "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Rekap */}
      <Card className="border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden py-0 gap-0">
        <CardHeader className="pt-4 pb-4 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            Distribusi Keaktifan Pegawai
          </CardTitle>
          <CardDescription className="text-xs">
            Klik baris untuk melihat riwayat perjalanan dinas pegawai - TA {selectedTahun || "Semua"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <RekapList items={rekapList} />
        </CardContent>
      </Card>
    </div>
  );
}
