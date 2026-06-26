import { getPegawais } from "@/app/actions/pegawai";
import PegawaiList from "./PegawaiList";

export const metadata = {
  title: "Master Pegawai - SIPADIN",
};

export default async function PegawaiPage() {
  const data = await getPegawais();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Master Pegawai</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola data pegawai untuk dicantumkan dalam SPJ (Perjalanan Dinas, Honor, dll).
        </p>
      </div>

      <PegawaiList initialData={data} />
    </div>
  );
}
