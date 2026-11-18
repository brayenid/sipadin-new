import { getPublicRekapMonitorData } from "@/app/actions/absensi";
import PublicRekapMonitorClient from "./PublicRekapMonitorClient";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;
    const res = await getPublicRekapMonitorData(token);
    const title = res.config.title
      ? `${res.config.title} - Monitor Presensi Pimpinan`
      : `Live Monitor Rekapitulasi Presensi - SIPADIN`;
    const description = `Live monitor dan infografis eksekutif kehadiran perangkat daerah Pemkab Kutai Barat (${res.config.startDate} s/d ${res.config.endDate}).`;

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
      title: "Live Monitor Rekapitulasi Presensi - SIPADIN",
      description: "Pemantauan infografis presensi pimpinan.",
      robots: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  }
}

export default async function PublicRekapMonitorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let initialData;
  try {
    initialData = await getPublicRekapMonitorData(token);
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl p-6 text-center shadow-xs border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-3 text-base font-bold font-mono">
            !
          </div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Tautan Monitor Tidak Dapat Dibuka
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            {error.message || "Tautan monitor tidak valid, kedaluwarsa, atau telah dinonaktifkan oleh administrator."}
          </p>
          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 font-mono">
            SIPADIN • Pemerintah Kabupaten Kutai Barat
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicRekapMonitorClient
      token={token}
      initialConfig={initialData.config}
      initialRekapData={initialData.rekapData}
    />
  );
}
