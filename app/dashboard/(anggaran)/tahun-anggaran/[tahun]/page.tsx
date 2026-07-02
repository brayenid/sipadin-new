import { getTahunAnggaranDetail, getAllTimKerja } from "@/app/actions/anggaran";
import AnggaranDetailView from "./AnggaranDetailView";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Detail Tahun Anggaran - SIPADIN",
};

export default async function DetailTahunAnggaranPage({ params }: { params: Promise<{ tahun: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { tahun } = await params;
  const data = await getTahunAnggaranDetail(tahun);

  let timKerja: any[] = [];
  if (session.user.role === "SUPER_ADMIN") {
    timKerja = await getAllTimKerja();
  }

  return (
    <div className="p-4 sm:p-8">
      <AnggaranDetailView 
        tahunData={data as any} 
        session={session} 
        allTimKerja={timKerja}
      />
    </div>
  );
}
