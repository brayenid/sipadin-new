import { getTahunAnggaran } from "@/app/actions/anggaran";
import AnggaranList from "./AnggaranList";

export const metadata = {
  title: "Tahun Anggaran - SIPADIN",
};

export default async function TahunAnggaranPage() {
  const data = await getTahunAnggaran();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Manajemen Anggaran</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola Tahun Anggaran, Kegiatan, dan Pagu Sub-Kegiatan untuk tim Anda.
        </p>
      </div>

      <AnggaranList initialData={data} />
    </div>
  );
}
