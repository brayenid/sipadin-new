"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Store,
  Calendar,
  PlusCircle,
  PenBox,
  Info,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "./SidebarProvider";

const navMain = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/spj/buat", label: "Buat SPJ", icon: PlusCircle },
  { href: "/dashboard/spj", label: "Daftar SPJ", icon: FileText, exact: true },
  { href: "/dashboard/tahun-anggaran", label: "Tahun Anggaran", icon: Calendar },
];

const navTambahan = [
  { href: "/dashboard/naskah-dinas", label: "Naskah Dinas", icon: PenBox },
];

const navInformasi = [
  { href: "/dashboard/tentang", label: "Tentang Aplikasi", icon: Info, exact: true },
];

const navMaster = [
  { href: "/dashboard/pegawai", label: "Master Pegawai", icon: Users },
  { href: "/dashboard/vendor", label: "Master Vendor", icon: Store },
];

import { Trash2 } from "lucide-react";

const navSuperAdmin = [
  { href: "/dashboard/akun", label: "Master Akun", icon: Users },
  { href: "/dashboard/recycle-bin", label: "Recycle Bin", icon: Trash2 },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact = false,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const { close } = useSidebar();

  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={close}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors font-medium ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

export default function DashboardNav({ role }: { role: string }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
        Menu Utama
      </p>
      {navMain.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <Separator className="my-3 bg-slate-100" />

      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
        Menu Tambahan
      </p>
      {navTambahan.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <Separator className="my-3 bg-slate-100" />

      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
        Data Master
      </p>
      {navMaster.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <Separator className="my-3 bg-slate-100" />

      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
        Informasi
      </p>
      {navInformasi.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      {role === "SUPER_ADMIN" && (
        <>
          <Separator className="my-3 bg-slate-100" />
          <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
            Super Admin
          </p>
          {navSuperAdmin.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </>
      )}
    </nav>
  );
}
