import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { ShieldCheck, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const initials =
    session.user.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "??";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-slate-900 font-bold text-base leading-tight">SIPADIN</p>
            <p className="text-slate-500 text-[10px] leading-tight">SPJ Elektronik v2</p>
          </div>
        </div>

        {/* Nav — Client component untuk usePathname */}
        <DashboardNav role={session.user.role} />

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-slate-500 text-xs truncate">{session.user.teamName}</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-slate-500 hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div>
            <p className="text-slate-900 font-semibold text-lg">SIPADIN</p>
            <p className="text-slate-500 text-sm">
              Selamat datang, {session.user.name?.split(" ")[0]}
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/20 text-primary bg-primary/5 text-xs font-medium"
          >
            {session.user.role === "SUPER_ADMIN" ? "Super Admin" : "Tim Kerja"}
          </Badge>
        </header>

        {/* Page content */}
        {children}
      </main>
    </div>
  );
}
