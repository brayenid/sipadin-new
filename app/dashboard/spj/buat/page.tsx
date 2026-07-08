import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SpjWizard from "./SpjWizard";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Buat SPJ Baru - SIPADIN",
};

export default async function BuatSpjPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch data master yang dibutuhkan untuk form
  const [pegawais, vendors, tahunAnggarans, teams] = await Promise.all([
    prisma.pegawai.findMany({
      where: session.user.role === "SUPER_ADMIN" ? undefined : { teamId: session.user.teamId },
      orderBy: { nama: "asc" },
    }),
    prisma.vendorPihakKetiga.findMany({
      where: session.user.role === "SUPER_ADMIN" ? undefined : { teamId: session.user.teamId },
      orderBy: { namaVendor: "asc" },
    }),
    prisma.tahunAnggaran.findMany({
      include: {
        kegiatan: {
          include: {
            subKegiatan: {
              where: session.user.role === "SUPER_ADMIN" ? undefined : {
                users: { some: { id: session.user.id } }
              },
              include: {
                rekening: true,
                users: { select: { id: true, teamId: true } }
              }
            },
          }
        }
      },
      orderBy: { tahun: "desc" },
    }),
    session.user.role === "SUPER_ADMIN" ? prisma.user.findMany({ where: { role: 'TIM_KERJA' }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-1">
            <Link
              href="/dashboard/spj"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              SPJ
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Buat Baru</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Buat SPJ Baru</h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">Formulir terpadu untuk perekaman transaksi Surat Pertanggungjawaban.</p>
        </div>
      </div>
      
      <SpjWizard 
        pegawais={pegawais} 
        vendors={vendors} 
        tahunAnggarans={tahunAnggarans} 
        teams={teams}
        userRole={session.user.role}
        userTeamId={session.user.teamId}
        userId={session.user.id}
      />
    </div>
  );
}
