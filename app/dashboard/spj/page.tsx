import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, ChevronLeft, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SpjFilters from './SpjFilters'
import SpjDeleteButton from './SpjDeleteButton'
import SpjDuplicateButton from './SpjDuplicateButton'
import SpjExportModal from './SpjExportModal'
import { Prisma } from '@prisma/client'

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

  // Menghapus elipsis ganda berturut-turut jika ada
  return pages.filter((item, index, arr) => item !== "..." || arr[index - 1] !== "...");
}

export const metadata = {
  title: 'Daftar SPJ - SIPADIN'
}

export default async function SpjListPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string; jenis?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const sp = await searchParams

  const page = Number(sp?.page) || 1
  const limit = 10
  const skip = (page - 1) * limit
  const searchQuery = sp?.search || ''
  const jenisQuery = sp?.jenis || ''

  const whereClause: Prisma.SpjWhereInput = {
    isDeleted: false,
    ...(session.user.role === 'SUPER_ADMIN' ? {} : { createdById: session.user.id }),
    ...(jenisQuery ? { jenisSpj: jenisQuery as any } : {}),
    ...(searchQuery
      ? {
          OR: [
            { kodeRekening: { judulRekening: { contains: searchQuery, mode: 'insensitive' } } },
            { roster: { some: { nama: { contains: searchQuery, mode: 'insensitive' } } } },
            { perihal: { contains: searchQuery, mode: 'insensitive' } },
            { perjadinDetail: { tempatTujuan: { contains: searchQuery, mode: 'insensitive' } } },
            { maminDetail: { vendor: { namaVendor: { contains: searchQuery, mode: 'insensitive' } } } }
          ]
        }
      : {})
  }

  const [spjList, totalData] = await Promise.all([
    prisma.spj.findMany({
      where: whereClause,
      include: {
        kodeRekening: true,
        perjadinDetail: true,
        maminDetail: { include: { vendor: true } },
        roster: true
      },
      orderBy: [
        { tanggalSpj: 'desc' },
        { createdAt: 'desc' }
      ],
      skip,
      take: limit
    }),
    prisma.spj.count({
      where: whereClause
    })
  ])

  const totalPages = Math.ceil(totalData / limit)

  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
      Number(val)
    )
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  }

  const renderTanggalRange = (spj: any) => {
    if (spj.jenisSpj === 'PERJADIN' && spj.perjadinDetail) {
      const start = formatDate(spj.perjadinDetail.tglBerangkat);
      const end = formatDate(spj.perjadinDetail.tglKembali);
      
      // Jika bulannya sama, persingkat (misal: 12 - 15 Okt 2026)
      const startParts = start.split(' ');
      const endParts = end.split(' ');
      
      if (startParts[1] === endParts[1] && startParts[2] === endParts[2]) {
        return `${startParts[0]} - ${end}`;
      }
      return `${start} - ${end}`;
    }
    
    return formatDate(spj.tanggalSpj);
  }

  const getJenisBadge = (jenis: string) => {
    switch (jenis) {
      case 'PERJADIN':
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200/60 font-medium">
            Perjalanan Dinas
          </Badge>
        )
      case 'MAKAN_MINUM':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200/60 font-medium">
            Makan/Minum Rapat & ATK
          </Badge>
        )
      case 'HONORARIUM':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200/60 font-medium">
            Honorarium
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200/60 font-medium">
            {jenis}
          </Badge>
        )
    }
  }

  const createPageUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (targetPage > 1) params.set('page', targetPage.toString())
    if (searchQuery) params.set('search', searchQuery)
    if (jenisQuery) params.set('jenis', jenisQuery)
    return `/dashboard/spj?${params.toString()}`
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-3">
            <Link
              href="/dashboard"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Daftar SPJ</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Daftar SPJ</h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">Kelola dan pantau seluruh Surat Pertanggungjawaban.</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Link href="/dashboard/rekap-perjadin" className="hidden lg:block">
            <Button variant="outline" className="text-slate-600">
              <BarChart2 className="w-4 h-4 mr-2" />
              Rekap Perjadin
            </Button>
          </Link>
          <div className="hidden lg:block">
            <SpjExportModal />
          </div>
          <Link href="/dashboard/spj/buat">
            <Button className="hidden lg:flex">
              <Plus className="w-4 h-4 mr-2" />
              Buat SPJ Baru
            </Button>
          </Link>
        </div>
      </div>

      <SpjFilters />

      <Card className="p-0 overflow-hidden">

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Total Biaya</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spjList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      Belum ada SPJ yang dibuat.
                    </TableCell>
                  </TableRow>
                ) : (
                  spjList.map((spj) => (
                    <TableRow key={spj.id}>
                      <TableCell className="font-medium">
                        {renderTanggalRange(spj)}
                      </TableCell>
                      <TableCell>
                        <div>{getJenisBadge(spj.jenisSpj)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600 flex flex-col gap-1">
                          {spj.jenisSpj === 'MAKAN_MINUM' ? (
                            <div className="flex flex-col gap-0.5 max-w-[250px]">
                              <span className="font-medium text-slate-700 truncate" title={spj.perihal || ''}>{spj.perihal || '-'}</span>
                              <span className="text-xs text-slate-500 truncate" title={spj.maminDetail?.vendor?.namaVendor || ''}>Vendor: {spj.maminDetail?.vendor?.namaVendor || '-'}</span>
                            </div>
                          ) : spj.jenisSpj === 'HONORARIUM' ? (
                            <div className="flex flex-col gap-0.5 max-w-[250px]">
                              <span className="font-medium text-slate-700 truncate block" title={spj.perihal || ''}>{spj.perihal || '-'}</span>
                              <span className="text-xs text-slate-500 truncate block capitalize">
                                Narasumber: {((spj.metaDokumen as any)?.daftarHadirNarasumber?.narasumber || []).length > 0 
                                  ? ((spj.metaDokumen as any)?.daftarHadirNarasumber?.narasumber as any[]).map(n => (n.nama || '').split(' ')[0].toLowerCase()).join(', ') 
                                  : '-'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5 max-w-[250px]">
                              <span className="font-medium text-slate-700 truncate block capitalize" title={spj.roster?.map(r => r.nama).join(', ').toLowerCase()}>
                                {spj.roster && spj.roster.length > 0
                                  ? spj.roster.map((r) => r.nama.split(' ')[0].toLowerCase()).join(', ')
                                  : '-'}
                              </span>
                              <span className="text-xs text-slate-600 truncate block" title={spj.perihal || ''}>
                                {spj.perihal || '-'}
                              </span>
                              {spj.jenisSpj === 'PERJADIN' && spj.perjadinDetail && (
                                <span className="text-xs text-slate-500 truncate block">
                                  Tujuan: {spj.perjadinDetail.tempatTujuan}
                                </span>
                              )}
                            </div>
                          )}
                          {spj.kodeRekening && (
                            <span 
                              className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100/60 rounded px-1.5 py-0.5 font-semibold w-fit block truncate max-w-[250px]" 
                              title={`${spj.kodeRekening.kodeRekening} - ${spj.kodeRekening.judulRekening}`}
                            >
                              Rek: {spj.kodeRekening.kodeRekening}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-slate-900 font-medium">
                        {formatRupiah(spj.totalPengeluaran)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/dashboard/spj/${spj.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:text-primary/80 hover:bg-primary/5" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <SpjDuplicateButton spjId={spj.id} />
                          <SpjDeleteButton spjId={spj.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalData > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-slate-100">
              <p className="text-[10px] sm:text-sm text-slate-500">
                Menampilkan <span className="font-medium text-slate-900">{skip + 1}</span>-<span className="font-medium text-slate-900">{Math.min(skip + limit, totalData)}</span> dari <span className="font-medium text-slate-900">{totalData}</span>
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <Link href={createPageUrl(page > 1 ? page - 1 : 1)}>
                  <Button variant="outline" size="sm" disabled={page <= 1} className="h-8 px-2 sm:px-3">
                    <span className="hidden sm:inline">Sebelumnya</span>
                    <span className="sm:hidden">&laquo;</span>
                  </Button>
                </Link>
                <div className="hidden sm:flex items-center gap-1">
                  {getVisiblePages(page, totalPages).map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs font-bold">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Link key={`page-${p}`} href={createPageUrl(p as number)}>
                        <Button
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          className={`h-8 w-8 p-0 ${p !== page ? 'text-slate-600 hover:text-slate-900' : ''}`}
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
                  <Button variant="outline" size="sm" disabled={page >= totalPages} className="h-8 px-2 sm:px-3">
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <span className="sm:hidden">&raquo;</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile bottom action bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] flex gap-2">
        <SpjExportModal />
        <Link href="/dashboard/spj/buat" className="flex-1">
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Buat SPJ Baru
          </Button>
        </Link>
      </div>
    </div>
  )
}
