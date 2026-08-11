import { getAgendaAbsensiDetail, getAllPegawaiForBinding } from "@/app/actions/absensi";
import ChecklistForm from "./ChecklistForm";
import Link from "next/link";
import { ChevronLeft, Calendar, MapPin, Clock, Users } from "lucide-react";
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
            href="/dashboard/absensi"
            className="hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Daftar Agenda
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-900">Checklist Kehadiran</span>
        </div>

        {/* Title & Header Detail */}
        <div className="space-y-2">
          <h1 className="text-xl font-black sm:text-2xl tracking-tight text-slate-900">
            {agenda.namaKegiatan}
          </h1>
        </div>
      </div>

      <ChecklistForm agenda={agenda as any} allPegawai={allPegawai} />
    </div>
  );
}
