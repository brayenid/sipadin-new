import { getPublicAgendaMonitorData } from "@/app/actions/absensi";
import PublicMonitorClient from "./PublicMonitorClient";
import { Metadata } from "next";
import { formatWita } from "@/lib/date-utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;
    const data = await getPublicAgendaMonitorData(token);
    const tanggalText = data.agenda.tanggal ? formatWita(data.agenda.tanggal, "dd MMMM yyyy") : "";
    const title = `Pantau Presensi: ${data.agenda.namaKegiatan} - SIPADIN`;
    const description = `Pemantauan langsung kehadiran kegiatan "${data.agenda.namaKegiatan}" (${tanggalText}) - Pemerintah Kabupaten Kutai Barat.`;

    return {
      title,
      description,
      robots: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  } catch {
    return {
      title: "Pantau Presensi Kegiatan - SIPADIN",
      description: "Pemantauan kehadiran kegiatan resmi Pemkab Kutai Barat.",
      robots: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  }
}

export default async function PublicMonitorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let initialData;
  try {
    initialData = await getPublicAgendaMonitorData(token);
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 text-center shadow-lg border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-xl">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">
            Tautan Pemantauan Tidak Valid
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {error.message || "Agenda presensi ini mungkin sudah kedaluwarsa atau tidak ditemukan."}
          </p>
          <a
            href="/login"
            className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return (
    <PublicMonitorClient
      token={token}
      initialData={initialData}
    />
  );
}
