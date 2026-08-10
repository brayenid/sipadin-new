"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  FolderKanban,
  ChevronDown,
  FileText,
  Calendar,
  Eye,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";

export type NaskahItem = {
  id: string;
  jenisNaskah: string;
  nomorSurat: string | null;
  tanggal: string;
  perihal: string | null;
  createdByName?: string;
};

export type AgendaGroup = {
  namaAgenda: string;
  totalBerkas: number;
  latestTanggal: string;
  jenisBreakdown: Record<string, number>;
  berkasList: NaskahItem[];
};

function getBadgeColor(jenis: string) {
  switch (jenis) {
    case "SURAT_TUGAS":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "TELAAHAN_STAF":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "SURAT_PERINTAH":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "SURAT_EDARAN_SEKDA":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "SURAT_EDARAN_BUPATI":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "SURAT_UMUM":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getJenisLabel(jenis: string) {
  switch (jenis) {
    case "SURAT_TUGAS":
      return "Surat Tugas";
    case "TELAAHAN_STAF":
      return "Telaahan Staf";
    case "SURAT_PERINTAH":
      return "Surat Perintah";
    case "SURAT_EDARAN_SEKDA":
      return "Surat Edaran Sekda";
    case "SURAT_EDARAN_BUPATI":
      return "Surat Edaran Bupati";
    case "SURAT_UMUM":
      return "Surat Umum";
    default:
      return jenis;
  }
}

export default function AgendaAccordionList({ groups }: { groups: AgendaGroup[] }) {
  const [openAgenda, setOpenAgenda] = useState<string | null>(null);

  if (groups.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200/60 rounded-xl">
        <FolderKanban className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-semibold text-slate-700">Belum ada agenda kegiatan.</p>
        <p className="text-xs text-slate-400 mt-1">
          Beri tag &quot;Agenda Kegiatan&quot; saat membuat atau mengedit naskah dinas untuk mengelompokkannya.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = openAgenda === group.namaAgenda;

        return (
          <Card
            key={group.namaAgenda}
            className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] transition-all"
          >
            {/* Header Accordion Baris Agenda */}
            <button
              onClick={() => setOpenAgenda(isOpen ? null : group.namaAgenda)}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/70 transition-colors gap-3"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5 sm:mt-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                      {group.namaAgenda}
                    </h3>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200/60 text-[10px] sm:text-xs font-bold px-2 py-0">
                      {group.totalBerkas} berkas
                    </Badge>
                  </div>
                  {/* Breakdown Jenis Naskah */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {Object.entries(group.jenisBreakdown).map(([jenis, count]) => (
                      <span
                        key={jenis}
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold border ${getBadgeColor(
                          jenis
                        )}`}
                      >
                        {count}× {getJenisLabel(jenis)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tanggal Terakhir & Chevron */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Update: {formatWita(new Date(group.latestTanggal))}</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>
            </button>

            {/* Accordion Content: Daftar Berkas di dalam Agenda */}
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Daftar Berkas Terkait ({group.berkasList.length})
                  </p>
                  <Link
                    href={`/dashboard/naskah-dinas?agenda=${encodeURIComponent(group.namaAgenda)}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                  >
                    Buka di Tabel Utama <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-200/60 bg-white border border-slate-200/60 rounded-lg overflow-hidden">
                  {group.berkasList.map((berkas) => (
                    <div
                      key={berkas.id}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold border ${getBadgeColor(
                              berkas.jenisNaskah
                            )}`}
                          >
                            {getJenisLabel(berkas.jenisNaskah)}
                          </span>
                          <span className="text-xs font-mono font-medium text-slate-500">
                            {berkas.nomorSurat || "Tanpa Nomor"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • {formatWita(new Date(berkas.tanggal))}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-900 line-clamp-2">
                          {berkas.perihal || "Tanpa Perihal"}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                        <Link href={`/dashboard/naskah-dinas/${berkas.id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5">
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> Detail / Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
