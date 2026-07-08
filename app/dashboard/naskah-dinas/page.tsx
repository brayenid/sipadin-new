import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatWita } from '@/lib/date-utils'
import NaskahDinasDeleteButton from './NaskahDinasDeleteButton'
import NaskahDinasSearch from './NaskahDinasSearch'

export const metadata = {
  title: 'Tata Naskah Dinas - SIPADIN'
}

export default async function NaskahDinasListPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const resolvedSearchParams = await props.searchParams
  const page = Number(resolvedSearchParams?.page) || 1
  const q = typeof resolvedSearchParams?.q === 'string' ? resolvedSearchParams.q : ''
  const jenis = typeof resolvedSearchParams?.jenis === 'string' ? resolvedSearchParams.jenis : 'all'

  const limit = 10
  const skip = (page - 1) * limit

  const whereClause: any = { teamId: session.user.teamId, isDeleted: false }

  if (q) {
    whereClause.OR = [
      { perihal: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (jenis && jenis !== 'all') {
    whereClause.jenis = jenis
  }

  const [list, totalData] = await Promise.all([
    prisma.naskahDinas.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { createdBy: { select: { name: true } } }
    }),
    prisma.naskahDinas.count({
      where: whereClause
    })
  ])

  const totalPages = Math.ceil(totalData / limit)

  const createPageUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (targetPage > 1) params.set('page', targetPage.toString())
    if (q) params.set('q', q)
    if (jenis && jenis !== 'all') params.set('jenis', jenis)
    return `/dashboard/naskah-dinas?${params.toString()}`
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
            <span className="font-medium text-slate-900">Naskah Dinas</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Naskah Dinas</h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">Kelola pembuatan naskah dinas.</p>
        </div>
        <Link href="/dashboard/naskah-dinas/buat" className="shrink-0">
          <Button className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            Buat Naskah Baru
          </Button>
        </Link>
      </div>

      <NaskahDinasSearch />

      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[180px]">Jenis Naskah</TableHead>
                  <TableHead>Nomor / Perihal</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pembuat</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      Belum ada naskah dinas.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/80">
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.jenisNaskah.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{item.nomorSurat || '-'}</div>
                        <div className="text-sm text-slate-500 mt-1 line-clamp-2">{item.perihal || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {formatWita(item.tanggal, 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600">{item.createdBy.name}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/dashboard/naskah-dinas/${item.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:text-primary/80 hover:bg-primary/5" title="Lihat Detail">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <NaskahDinasDeleteButton id={item.id} />
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link key={p} href={createPageUrl(p)}>
                      <Button
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        className={`h-8 w-8 p-0 ${p !== page ? 'text-slate-600 hover:text-slate-900' : ''}`}>
                        {p}
                      </Button>
                    </Link>
                  ))}
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)]">
        <Link href="/dashboard/naskah-dinas/buat">
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Buat Naskah Baru
          </Button>
        </Link>
      </div>
    </div>
  )
}
