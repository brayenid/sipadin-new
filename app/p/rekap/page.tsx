import { getPublicRekapMonitorData } from "@/app/actions/absensi";
import PublicRekapMonitorClient from "./PublicRekapMonitorClient";
import { Metadata } from "next";

function extractToken(raw?: string | string[]): string {
  if (Array.isArray(raw)) return (raw[0] || "").trim();
  return (raw || "").trim();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const token = extractToken(sp.token);

  if (!token) {
    return {
      title: "Akses Ditolak - Live Monitor SIPADIN",
      description: "Token akses diperlukan untuk membuka halaman Live Monitor.",
      robots: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  }

  try {
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

function MonitorErrorCard({
  title,
  message,
  code,
}: {
  title: string;
  message: string;
  code: string;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-xl p-6 text-center shadow-sm border border-slate-300">
        <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-700 border border-rose-300 flex items-center justify-center mx-auto mb-3 text-sm font-extrabold tabular-nums">
          {code}
        </div>
        <h1 className="text-base font-bold text-slate-950 mb-1.5">{title}</h1>
        <p className="text-xs text-slate-700 leading-relaxed mb-4">{message}</p>
        <div className="text-[11px] font-semibold text-slate-500 border-t border-slate-200 pt-3">
          SIPADIN • Pemerintah Kabupaten Kutai Barat
        </div>
      </div>
    </div>
  );
}

export default async function PublicRekapMonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const token = extractToken(sp.token);

  if (!token) {
    return (
      <MonitorErrorCard
        code="401"
        title="Akses Ditolak: Token Diperlukan"
        message="Halaman Live Monitor hanya dapat diakses menggunakan tautan resmi yang menyertakan query token (?token=...) yang aktif."
      />
    );
  }

  let initialData;
  try {
    initialData = await getPublicRekapMonitorData(token);
  } catch (error: any) {
    return (
      <MonitorErrorCard
        code="403"
        title="Tautan Monitor Tidak Valid"
        message={
          error?.message ||
          "Token monitor tidak ditemukan, kedaluwarsa, atau telah dinonaktifkan oleh administrator."
        }
      />
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
