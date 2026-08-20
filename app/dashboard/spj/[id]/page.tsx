import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import SpjDetailTabs from "./SpjDetailTabs";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { serializeBigInt } from "@/lib/utils";
import { formatWita } from "@/lib/date-utils";

export const metadata = {
  title: "Detail SPJ - SIPADIN",
};

export default async function SpjDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session) redirect("/login");

  const spj = await prisma.spj.findFirst({
    where: { 
      id: params.id,
      teamId: session.user.teamId
    },
    include: {
      kodeRekening: {
        include: {
          subKegiatan: {
            include: {
              kegiatan: {
                include: {
                  tahunAnggaran: true
                }
              }
            }
          }
        }
      },
      perjadinDetail: true,
      maminDetail: {
        include: {
          vendor: true
        }
      },
      roster: {
        include: {
          pegawai: true,
          pengeluaranDetails: true // Load DOPD per personel
        },
        orderBy: { order: "asc" }
      },
      pengeluaranDetails: {
        where: { spjRosterItemId: null } // Load pengeluaran umum yang tidak nempel di personel
      }
    }
  });

  // Hanya pegawai Tim Internal yang dimuat untuk dropdown/penandatangan SPJ
  const pegawaiList = await prisma.pegawai.findMany({
    where: { teamId: session.user.teamId, timInternal: true },
    orderBy: { nama: "asc" }
  }).then(async (internalList) => {
    if (internalList.length > 0) return internalList;
    return prisma.pegawai.findMany({
      where: { teamId: session.user.teamId },
      orderBy: { nama: "asc" }
    });
  });
  
  const vendorList = await prisma.vendorPihakKetiga.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { namaVendor: "asc" }
  });

  const tahunAnggarans = await prisma.tahunAnggaran.findMany({
    include: {
      kegiatan: {
        include: {
          subKegiatan: {
            where: session.user.role === "SUPER_ADMIN" ? undefined : {
              users: { some: { id: session.user.id } }
            },
            include: {
              rekening: true
            }
          }
        }
      }
    },
    orderBy: { tahun: "desc" }
  });

  if (!spj) notFound();

  // Serialisasikan data yang memiliki tipe BigInt agar aman dikirim ke Client Components
  const serializedSpj = serializeBigInt(spj);
  const serializedPegawaiList = serializeBigInt(pegawaiList);
  const serializedVendorList = serializeBigInt(vendorList);
  const serializedTahunAnggarans = serializeBigInt(tahunAnggarans);

  return (
    <div className="p-4 sm:p-8 space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <Link
          href="/dashboard/spj"
          className="hover:text-slate-900 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          SPJ
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-900">Rincian</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-white p-3 sm:p-5 rounded-lg border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-sm font-extrabold sm:text-lg sm:font-semibold text-slate-800">Detail SPJ</h2>
            <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 sm:px-2.5 sm:py-0.5 text-slate-500 bg-slate-50">{spj.jenisSpj === 'MAKAN_MINUM' ? 'Makan/Minum Rapat & ATK' : (spj.jenisSpj === 'PERJADIN' ? 'Perjalanan Dinas' : spj.jenisSpj)}</Badge>
          </div>
          {spj.perihal && (
            <p className="text-[10px] font-medium sm:text-sm text-slate-700 mt-0.5 sm:mt-1">Perihal: {spj.perihal}</p>
          )}
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1.5">
            {formatWita(spj.tanggalSpj, "dd MMMM yyyy")}
          </p>
        </div>
        <div className="text-left sm:text-right bg-slate-50 py-1.5 px-3 sm:py-2 sm:px-4 rounded-md border border-slate-200/60 w-full md:w-auto flex justify-between sm:block items-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0 sm:mb-0.5">Total Pengajuan</p>
          <p className="text-base font-extrabold sm:text-lg sm:font-bold text-slate-900">
            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(spj.totalPengeluaran))}
          </p>
        </div>
      </div>

      <SpjDetailTabs 
        spj={serializedSpj} 
        pegawaiList={serializedPegawaiList} 
        vendorList={serializedVendorList} 
        tahunAnggarans={serializedTahunAnggarans} 
      />
    </div>
  );
}
