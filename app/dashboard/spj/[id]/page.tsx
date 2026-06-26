import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import SpjDetailTabs from "./SpjDetailTabs";

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
      subKegiatan: {
        include: {
          kegiatan: {
            include: {
              tahunAnggaran: true
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

  const pegawaiList = await prisma.pegawai.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { nama: "asc" }
  });

  if (!spj) notFound();

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Detail Surat Pertanggungjawaban</h2>
            <Badge variant="outline" className="text-slate-500 bg-slate-50">{spj.jenisSpj}</Badge>
          </div>
          {spj.perihal && (
            <p className="text-base font-semibold text-slate-700 mt-1">"{spj.perihal}"</p>
          )}
          <p className="text-sm text-slate-500 mt-1">
            {spj.nomorBku ? `No. BKU: ${spj.nomorBku}` : "Belum ada No. BKU"} • {new Intl.DateTimeFormat("id-ID", {
              day: "2-digit", month: "long", year: "numeric"
            }).format(spj.tanggalSpj)}
          </p>
        </div>
        <div className="text-right bg-slate-50 py-2 px-4 rounded-md border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Pengajuan SPJ</p>
          <p className="text-xl font-black text-slate-900">
            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(spj.totalPengeluaran))}
          </p>
        </div>
      </div>

      <SpjDetailTabs spj={spj} pegawaiList={pegawaiList} />
    </div>
  );
}
