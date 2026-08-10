'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Users, Settings, LogOut, Wallet } from 'lucide-react'

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/pegawai/spj', label: 'Manajemen SPJ', icon: FileText },
    { href: '/dashboard/admin/anggaran', label: 'Pagu Anggaran', icon: Wallet },
    { href: '/dashboard/admin/master', label: 'Data Master', icon: Users },
  ]

  return (
    <div className="w-72 bg-slate-900/50 border-r border-slate-800 backdrop-blur-xl flex flex-col h-full shadow-2xl z-20">
      <div className="p-6">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tight">
          SIPADIN <span className="text-sm text-indigo-500">v2</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide">Multi-Tenant SPJ Engine</p>
      </div>

      <div className="flex-1 px-4 py-6 space-y-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
          Menu Utama
        </div>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
          const Icon = link.icon
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-indigo-500/10 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="font-medium text-sm">{link.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="p-6 mt-auto border-t border-slate-800 bg-slate-900/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-bold text-sm">{userEmail.charAt(0).toUpperCase()}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">{userEmail}</p>
            <p className="text-xs text-slate-500 truncate">Tim Kerja</p>
          </div>
        </div>
        
        <form action="/auth/signout" method="POST">
          <button type="submit" className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm font-medium transition-colors w-full px-2 py-2 rounded-lg hover:bg-red-500/10">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}
