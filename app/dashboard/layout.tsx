import { Sidebar } from '@/components/shared/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
      <Sidebar userEmail={user.email!} />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
        <div className="relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
