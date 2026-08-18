import { getPublicAgendaByToken } from "@/app/actions/absensi";
import PublicAbsensiForm from "./PublicAbsensiForm";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { formatWita } from "@/lib/date-utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  try {
    const { token } = await params;
    const agenda = await getPublicAgendaByToken(token);
    const tanggalText = agenda.tanggal ? formatWita(agenda.tanggal, "dd MMMM yyyy") : "";
    const tempatText = agenda.tempat ? ` di ${agenda.tempat}` : "";
    const title = `Presensi: ${agenda.namaKegiatan} - SIPADIN`;
    const description = `Form pengisian daftar hadir mandiri elektronik untuk kegiatan "${agenda.namaKegiatan}" (${tanggalText}${tempatText}) - Pemerintah Kabupaten Kutai Barat.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "SIPADIN - Pemkab Kutai Barat",
        images: [
          {
            url: "/sipadin.png",
            width: 800,
            height: 600,
            alt: "SIPADIN - Sistem Informasi Presensi & Perjalanan Dinas Elektronik",
          },
        ],
      },
      twitter: {
        card: "summary",
        title,
        description,
        images: ["/sipadin.png"],
      },
    };
  } catch {
    return {
      title: "Presensi Kegiatan - SIPADIN",
      description: "Sistem Informasi Presensi Elektronik Pemerintah Kabupaten Kutai Barat.",
      openGraph: {
        title: "Presensi Kegiatan - SIPADIN",
        description: "Sistem Informasi Presensi Elektronik Pemerintah Kabupaten Kutai Barat.",
        images: [
          {
            url: "/sipadin.png",
            alt: "SIPADIN",
          },
        ],
      },
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
