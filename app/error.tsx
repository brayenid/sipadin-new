"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-8 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 p-4 bg-red-50 rounded-full inline-block relative">
            <div className="absolute inset-0 border-2 border-red-100 rounded-full animate-ping opacity-20"></div>
            <Image
              src="/sipadin.png"
              alt="SIPADIN Logo"
              width={80}
              height={80}
              className="relative z-10 drop-shadow-md grayscale opacity-80"
              priority
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Oops! Terjadi Kesalahan</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[280px] mx-auto">
              Sistem SIPADIN menghadapi masalah teknis saat memproses permintaan Anda.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 relative z-10">
          <Button
            onClick={() => reset()}
            className="flex-1 rounded-xl h-12 shadow-sm font-medium"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
          <Link href="/dashboard" className="flex-1">
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 border-slate-200 text-slate-600 hover:text-slate-900 font-medium"
            >
              <Home className="w-4 h-4 mr-2" />
              Ke Beranda
            </Button>
          </Link>
        </div>
        
        <div className="pt-6 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-mono">
            Error Digest: {error.digest || "UNKNOWN_ERROR"}
          </p>
        </div>
      </div>
    </div>
  );
}
