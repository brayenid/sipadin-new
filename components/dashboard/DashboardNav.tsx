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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navMain = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/spj/buat", label: "Buat SPJ", icon: PlusCircle },
  { href: "/dashboard/spj", label: "Daftar SPJ", icon: FileText, exact: true },
  { href: "/dashboard/tahun-anggaran", label: "Tahun Anggaran", icon: Calendar },
];

const navMaster = [
  { href: "/dashboard/pegawai", label: "Master Pegawai", icon: Users },
  { href: "/dashboard/vendor", label: "Master Vendor", icon: Store },
];

export default function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
        Menu Utama
      </p>
      {navMain.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors font-medium ${
            isActive(item.href, item.exact)
              ? "bg-primary/10 text-primary"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </Link>
      ))}

      <Separator className="my-3 bg-slate-100" />

      <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
        Data Master
      </p>
      {navMaster.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors font-medium ${
            isActive(item.href)
              ? "bg-primary/10 text-primary"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
