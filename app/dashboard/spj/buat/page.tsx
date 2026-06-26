import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SpjWizard from "./SpjWizard";

export const metadata = {
  title: "Buat SPJ Baru - SIPADIN",
};

export default async function BuatSpjPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch data master yang dibutuhkan untuk form
  const [pegawais, vendors, tahunAnggarans] = await Promise.all([
    prisma.pegawai.findMany({
      where: { teamId: session.user.teamId },
      orderBy: { nama: "asc" },
    }),
    prisma.vendorPihakKetiga.findMany({
      where: { teamId: session.user.teamId },
      orderBy: { namaVendor: "asc" },
    }),
    prisma.tahunAnggaran.findMany({
      where: { teamId: session.user.teamId },
      include: {
        kegiatan: {
          include: {
            subKegiatan: true,
          }
        }
      },
      orderBy: { tahun: "desc" },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Buat SPJ Baru</h2>
          <p className="text-slate-500 mt-1">Formulir terpadu untuk perekaman transaksi Surat Pertanggungjawaban.</p>
        </div>
      </div>
      
      <SpjWizard 
        pegawais={pegawais} 
        vendors={vendors} 
        tahunAnggarans={tahunAnggarans} 
      />
    </div>
  );
}
