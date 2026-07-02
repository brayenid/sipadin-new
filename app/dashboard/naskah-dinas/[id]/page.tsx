import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import NaskahDinasDeleteButton from '../NaskahDinasDeleteButton'
import FormSuratTugas from './FormSuratTugas'
import FormTelaahanStaf from './FormTelaahanStaf'
import FormSuratPerintah from './FormSuratPerintah'
import FormSuratEdaran from './FormSuratEdaran'
import FormSuratEdaranBupati from './FormSuratEdaranBupati'

export const metadata = {
  title: 'Edit Naskah Dinas - SIPADIN'
}

export default async function NaskahDinasDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const naskah = await prisma.naskahDinas.findFirst({
    where: { id, teamId: session.user.teamId }
  })

  if (!naskah) {
    redirect('/dashboard/naskah-dinas')
  }

  const pegawais = await prisma.pegawai.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { nama: 'asc' }
  })

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
            <Link
              href="/dashboard/naskah-dinas"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Tata Naskah Dinas
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Edit</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Edit {naskah.jenisNaskah
              .replace(/[^a-zA-Z]/g, ' ')
              .split(' ')
              .filter(Boolean)
              .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')}
          </h2>
          <p className="text-slate-500 mt-1">Lengkapi data untuk menghasilkan dokumen PDF yang sesuai.</p>
        </div>
        <NaskahDinasDeleteButton id={naskah.id} />
      </div>

      {(() => {
        switch (naskah.jenisNaskah) {
          case 'SURAT_TUGAS':
            return <FormSuratTugas naskah={naskah} pegawaiList={pegawais} />
          case 'TELAAHAN_STAF':
            return <FormTelaahanStaf naskah={naskah} pegawaiList={pegawais} />
          case 'SURAT_PERINTAH':
            return <FormSuratPerintah naskah={naskah} pegawaiList={pegawais} />
          case 'SURAT_EDARAN':
          case 'SURAT_EDARAN_SEKDA':
            return <FormSuratEdaran naskah={naskah} pegawaiList={pegawais} />
          case 'SURAT_EDARAN_BUPATI':
            return <FormSuratEdaranBupati naskah={naskah} pegawaiList={pegawais} />
          default:
            return null
        }
      })()}
    </div>
  )
}
