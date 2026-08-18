import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { ShieldCheck, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import DashboardNav from "@/components/dashboard/DashboardNav";
import MobileSidebarShell from "@/components/dashboard/MobileSidebarShell";
import { SidebarProvider } from "@/components/dashboard/SidebarProvider";
import { PrivacyModeProvider } from "@/components/dashboard/PrivacyModeProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const initials =
    session.user.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "??";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-center px-5 border-b border-border flex-shrink-0">
        <Link href="/dashboard" className="flex items-center justify-center w-24 h-16 shrink-0 hover:opacity-80 transition-opacity">
          <img src="/sipadin.png" alt="SIPADIN Logo" className="w-full h-full object-contain drop-shadow-sm" />
        </Link>
      </div>

      {/* Nav */}
      <DashboardNav role={session.user.role} />

      {/* User info + logout */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-3 lg:mb-4 px-1.5">
          <Avatar className="w-8 h-8 lg:w-9 lg:h-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs lg:text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-semibold truncate">{session.user.name}</p>
            <p className="text-muted-foreground text-xs truncate">{session.user.teamName}</p>
          </div>
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 lg:py-0.5 border-primary/20 text-primary bg-primary/5 shrink-0"
          >
            {session.user.role === "SUPER_ADMIN" ? "Admin" : "Tim"}
          </Badge>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 px-3 py-2 lg:py-2.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors text-sm font-semibold mt-3"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </form>
      </div>
    </>
  );

  return (
    <SidebarProvider>
      <div className="h-screen overflow-hidden bg-slate-50/50 flex">
        {/* Desktop Sidebar — always visible on lg+ */}
        <aside className="hidden lg:flex w-60 flex-shrink-0 border-r border-border bg-card flex-col h-full overflow-y-auto">
          {sidebarContent}
        </aside>

        {/* Mobile sidebar drawer + overlay */}
        <MobileSidebarShell sidebarContent={sidebarContent} />

        {/* Main content area — pt-14 on mobile to clear the fixed top bar */}
        <main className="flex-1 h-full overflow-y-auto bg-slate-50/50 flex flex-col pt-14 lg:pt-0">
          <PrivacyModeProvider>
            {children}
          </PrivacyModeProvider>
        </main>
      </div>
    </SidebarProvider>
  );
}
