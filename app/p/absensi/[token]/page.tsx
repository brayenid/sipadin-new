import { getPublicAgendaByToken } from "@/app/actions/absensi";
import PublicAbsensiForm from "./PublicAbsensiForm";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;
    const agenda = await getPublicAgendaByToken(token);
    return {
      title: `Presensi: ${agenda.namaKegiatan} - SIPADIN Kubar`,
      description: `Form presensi mandiri kegiatan ${agenda.namaKegiatan} Pemerintah Kabupaten Kutai Barat.`,
    };
  } catch {
    return {
      title: "Presensi Kegiatan - SIPADIN",
    };
  }
}

export default async function PublicAbsensiPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let agendaData;
  try {
    agendaData = await getPublicAgendaByToken(token);
  } catch (error: any) {
    console.error("Error loading public agenda:", error);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 text-center shadow-lg border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Tautan Presensi Tidak Valid
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {error.message || "Tautan presensi ini mungkin sudah kedaluwarsa atau tidak ditemukan."}
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return <PublicAbsensiForm agenda={agendaData as any} />;
}
