import { Card, CardContent } from "@/components/ui/card";
import { Info, Code2, Cpu, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Tentang Aplikasi - SIPADIN",
};

export default function TentangPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 sm:p-8 bg-slate-50/50">
      <div className="w-full max-w-md mx-auto">
        <Card className="border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden bg-white">
          <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center">
            
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-5">
              <img 
                src="/web-app-manifest-192x192.png" 
                alt="Logo SIPADIN" 
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-1">
              SIPADIN
            </h1>
            
            <p className="text-xs font-medium text-slate-500 mb-4">
              Versi 2.0.0
            </p>

            <div className="text-sm text-slate-600 mb-3 max-w-[250px] font-medium flex flex-col items-center gap-0.5">
              <span>Sistem Pengarsipan Dinas</span>
              <span className="text-[10px] text-slate-400 font-normal italic">a.k.a</span>
              <span>Si Paling Dinas</span>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mb-8 w-full max-w-[320px] sm:max-w-sm">
              <p className="text-xs text-slate-500 leading-relaxed text-center">
                Sistem ini dibangun sebagai media arsip dan perhitungan penggunaan anggaran Tim PPTL dengan tambahan fitur pembuatan naskah dinas. Dalam penggunaannya, dimungkinkan untuk digunakan secara luas dalam lingkup bagian organisasi, namun masih dalam pengembangan.
              </p>
            </div>

            <div className="w-full h-px bg-slate-100 mb-6" />

            <div className="space-y-1">
              <p className="text-xs text-slate-500">Dikembangkan oleh</p>
              <p className="text-sm font-semibold text-slate-900">Tim PPTL</p>
              <p className="text-[11px] text-slate-400 mt-2 italic">"Dibangun tanpa anggaran, murni memudahkan"</p>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
