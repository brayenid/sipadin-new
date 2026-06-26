import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Detail Surat Pertanggungjawaban</h2>
          <p className="text-slate-500 mt-1">
            {spj.nomorBku ? `Nomor BKU: ${spj.nomorBku}` : "Belum ada Nomor BKU"} • {new Intl.DateTimeFormat("id-ID", {
              day: "2-digit", month: "long", year: "numeric"
            }).format(spj.tanggalSpj)}
          </p>
        </div>
      </div>

      <SpjDetailTabs spj={spj} pegawaiList={pegawaiList} />
    </div>
  );
}
