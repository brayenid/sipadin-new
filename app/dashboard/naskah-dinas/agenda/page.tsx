import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AgendaSearch from "./AgendaSearch";
import AgendaAccordionList, { type AgendaGroup } from "./AgendaAccordionList";

export const metadata = {
  title: "Cari Berdasarkan Agenda - SIPADIN",
};

function getVisiblePages(current: number, total: number) {
  const pages: (number | string)[] = [];
  const delta = 1;

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      pages.push(i);
    } else if (
      (i === current - delta - 1 && i > 1) ||
      (i === current + delta + 1 && i < total)
    ) {
      pages.push("...");
    }
  }

  return pages.filter((item, index, arr) => item !== "..." || arr[index - 1] !== "...");
}

export default async function AgendaNaskahDinasPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const resolvedSearchParams = await props.searchParams;
  const page = Number(resolvedSearchParams?.page) || 1;
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";

  const limit = 8; // 8 agenda cards per page

  // Ambil seluruh naskah dinas yang memiliki agenda dan tidak terhapus untuk team ini
  const naskahRaw = await prisma.naskahDinas.findMany({
    where: {
      teamId: session.user.teamId,
      isDeleted: false,
      agenda: { not: null },
      ...(q ? { agenda: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      jenisNaskah: true,
      nomorSurat: true,
      tanggal: true,
      perihal: true,
      agenda: true,
      createdAt: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Kelompokkan secara in-memory per nama agenda
  const agendaMap: Record<string, AgendaGroup> = {};

  for (const n of naskahRaw) {
    const agendaName = n.agenda?.trim();
    if (!agendaName) continue;

    if (!agendaMap[agendaName]) {
      agendaMap[agendaName] = {
        namaAgenda: agendaName,
        totalBerkas: 0,
        latestTanggal: n.tanggal.toISOString(),
        jenisBreakdown: {},
        berkasList: [],
      };
    }

    agendaMap[agendaName].totalBerkas += 1;

    // Breakdown jenis naskah
    const jenis = n.jenisNaskah;
    agendaMap[agendaName].jenisBreakdown[jenis] =
      (agendaMap[agendaName].jenisBreakdown[jenis] || 0) + 1;

    // Tambahkan berkas
    agendaMap[agendaName].berkasList.push({
      id: n.id,
      jenisNaskah: n.jenisNaskah,
      nomorSurat: n.nomorSurat,
      tanggal: n.tanggal.toISOString(),
      perihal: n.perihal,
      createdByName: n.createdBy?.name,
    });
  }

  // Ubah ke array dan urutkan berdasarkan berkas terbaru
  const allGroups = Object.values(agendaMap).sort(
    (a, b) => new Date(b.latestTanggal).getTime() - new Date(a.latestTanggal).getTime()
  );

  const totalAgendas = allGroups.length;
  const totalPages = Math.ceil(totalAgendas / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedGroups = allGroups.slice(startIndex, startIndex + limit);

  const createPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("page", targetPage.toString());
    if (q) params.set("q", q);
    return `/dashboard/naskah-dinas/agenda?${params.toString()}`;
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-24 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
            <Link
              href="/dashboard"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <span>/</span>
            <Link
              href="/dashboard/naskah-dinas"
              className="hover:text-slate-900 transition-colors"
            >
              Naskah Dinas
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Cari Berdasarkan Agenda</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">
            Agenda Kegiatan
          </h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
            Telusuri dan kelola seluruh berkas naskah dinas yang terkelompok berdasarkan agenda kegiatan.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href="/dashboard/naskah-dinas/buat">
            <Button className="h-9 text-xs sm:text-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Buat Naskah Dinas
            </Button>
          </Link>
        </div>
      </div>

      {/* Bar Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <AgendaSearch initialQuery={q} />
        <div className="text-xs text-slate-500 font-medium">
          Ditemukan <span className="font-bold text-slate-900">{totalAgendas}</span> agenda kegiatan
        </div>
      </div>

      {/* Accordion List Agenda */}
      <AgendaAccordionList groups={paginatedGroups} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-slate-500">
            Menampilkan agenda{" "}
            <span className="font-medium text-slate-900">{startIndex + 1}</span>-
            <span className="font-medium text-slate-900">
              {Math.min(startIndex + limit, totalAgendas)}
            </span>{" "}
            dari <span className="font-medium text-slate-900">{totalAgendas}</span>
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href={createPageUrl(page > 1 ? page - 1 : 1)}>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                className="h-8 px-2 sm:px-3 text-xs"
              >
                <span className="hidden sm:inline">Sebelumnya</span>
                <span className="sm:hidden">&laquo;</span>
              </Button>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {getVisiblePages(page, totalPages).map((p, idx) => {
                if (p === "...") {
                  return (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-slate-400 text-xs font-bold"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <Link key={`page-${p}`} href={createPageUrl(p as number)}>
                    <Button
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs ${
                        p !== page ? "text-slate-600 hover:text-slate-900" : ""
                      }`}
                    >
                      {p}
                    </Button>
                  </Link>
                );
              })}
            </div>
            <div className="flex sm:hidden items-center justify-center px-2 text-xs font-medium text-slate-600">
              {page} / {totalPages}
            </div>
            <Link href={createPageUrl(page < totalPages ? page + 1 : totalPages)}>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                className="h-8 px-2 sm:px-3 text-xs"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <span className="sm:hidden">&raquo;</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
