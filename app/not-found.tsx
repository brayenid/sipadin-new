import { Button } from "@/components/ui/button";
import { ArrowLeft, SearchX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-8 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 p-4 bg-slate-50 rounded-full inline-block relative">
            <div className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-sm border border-slate-100 z-20">
              <SearchX className="w-6 h-6 text-slate-400" />
            </div>
            <Image
              src="/sipadin.png"
              alt="SIPADIN Logo"
              width={80}
              height={80}
              className="relative z-10 drop-shadow-sm opacity-90"
              priority
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Halaman Tidak Ditemukan</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
              Maaf, alamat atau sumber daya yang Anda tuju di dalam sistem SIPADIN tidak dapat ditemukan atau Anda tidak memiliki akses.
            </p>
          </div>
        </div>

        <div className="pt-4 flex justify-center relative z-10">
          <Link href="/dashboard" className="w-full">
            <Button
              className="w-full rounded-xl h-12 shadow-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
