import { getVendors } from "@/app/actions/vendor";
import { auth } from "@/lib/auth";
import VendorList from "./VendorList";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Master Vendor - SIPADIN",
};

export default async function VendorPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const data = await getVendors();

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
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
          <span className="font-medium text-slate-900">Master Vendor</span>
        </div>
        <h1 className="text-xl font-extrabold sm:text-2xl sm:font-bold tracking-tight text-slate-900">Master Vendor (Pihak Ketiga)</h1>
        <p className="text-xs font-medium sm:text-sm sm:font-normal text-slate-500 mt-1">
          Kelola data vendor, rumah makan, atau katering untuk SPJ Makan Minum.
        </p>
      </div>

      <VendorList initialData={data} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
