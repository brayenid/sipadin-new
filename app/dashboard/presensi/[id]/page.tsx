import { getAgendaAbsensiDetail, getAllPegawaiForBinding } from "@/app/actions/absensi";
import ChecklistForm from "./ChecklistForm";
import Link from "next/link";
import { ChevronLeft, Calendar, MapPin, Clock, Users, Camera } from "lucide-react";
import { formatWita } from "@/lib/date-utils";

export const metadata = {
  title: "Kelola Kehadiran Agenda - SIPADIN",
};

export default async function AgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [agenda, allPegawai] = await Promise.all([
    getAgendaAbsensiDetail(id),
    getAllPegawaiForBinding(),
  ]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
          <Link
            href="/dashboard/presensi"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Daftar Agenda
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Checklist Kehadiran</span>
        </div>

        {/* Title & Header Detail */}
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">
            {agenda.namaKegiatan}
          </h1>

          {/* Subjudul: Tag Badges Kebutuhan Validasi (Hanya muncul jika dicentang) */}
          {(agenda.requirePhoto || agenda.requireLocation) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {agenda.requirePhoto && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                  <Camera className="w-3.5 h-3.5" />
                  Wajib Foto Selfie
                </span>
              )}

              {agenda.requireLocation && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <MapPin className="w-3.5 h-3.5" />
                  Wajib Kunci GPS
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <ChecklistForm agenda={agenda as any} allPegawai={allPegawai} />
    </div>
  );
}
