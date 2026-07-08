import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NaskahDinasWizard from './NaskahDinasWizard'

import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export const metadata = {
  title: 'Buat Naskah Dinas Baru - SIPADIN'
}

export default async function NaskahDinasBuatPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="p-4 sm:p-8 space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 mb-1">
            <Link
              href="/dashboard/naskah-dinas"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Tata Naskah Dinas
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-900">Buat Baru</span>
          </div>
          <h2 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Buat Naskah Dinas Baru</h2>
          <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">Formulir untuk membuat Surat Tugas atau Telaahan Staf.</p>
        </div>
      </div>
      
      <NaskahDinasWizard />
    </div>
  )
}
