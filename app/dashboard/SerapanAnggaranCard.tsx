"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getTahunAnggaranDetail } from "@/app/actions/anggaran";
import { Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

type RekeningData = {
  id: string;
  kodeRekening: string;
  judulRekening: string;
  saldoAwal: bigint;
  sisaSaldo: bigint;
};

type SubKegiatanData = {
  id: string;
  kodeSub: string;
  judulSub: string;
  rekening: RekeningData[];
};

type KegiatanData = {
  id: string;
  kodeKegiatan: string;
  judulKegiatan: string;
  subKegiatan: SubKegiatanData[];
};

type TahunDetailData = {
  id: string;
  tahun: string;
  kegiatan: KegiatanData[];
};

export default function SerapanAnggaranCard({
  tahunList,
  initialData,
}: {
  tahunList: string[];
  initialData: any;
}) {
  const [selectedTahun, setSelectedTahun] = useState<string>(
    tahunList.length > 0 ? tahunList[0] : ""
  );
  
  const [data, setData] = useState<TahunDetailData | null>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!selectedTahun) return;
      
      // Jika tahun yang dipilih sama dengan initialData, tidak perlu fetch ulang
      if (initialData && initialData.tahun === selectedTahun) {
        setData(initialData);
        return;
      }

      setLoading(true);
      try {
        const detail = await getTahunAnggaranDetail(selectedTahun);
        setData(detail as unknown as TahunDetailData);
      } catch (error) {
        console.error("Gagal memuat detail tahun:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedTahun, initialData]);

  // Kalkulasi agregasi
  let totalPagu = BigInt(0);
  let totalSisaSaldo = BigInt(0);

  if (data) {
    data.kegiatan.forEach((k) => {
      k.subKegiatan.forEach((s) => {
        s.rekening.forEach((r) => {
          totalPagu += BigInt(r.saldoAwal);
          totalSisaSaldo += BigInt(r.sisaSaldo);
        });
      });
    });
  }

  const totalPengeluaran = totalPagu - totalSisaSaldo;
  const absPercent = totalPagu > BigInt(0) ? Number((totalPengeluaran * BigInt(100)) / totalPagu) : 0;
  const isOver = absPercent >= 100;
  const barColorClass = absPercent < 50 ? 'text-red-500' : absPercent < 70 ? 'text-amber-500' : 'text-emerald-500';

  if (tahunList.length === 0) {
    return (
      <Card className="border-slate-200/60 lg:col-span-1 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden py-0 gap-0">
        <CardHeader className="pt-4 pb-4 sm:pt-5 sm:pb-5 bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Serapan Anggaran</CardTitle>
          <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal">Belum ada data Tahun Anggaran yang tersedia.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center pt-6 pb-6 px-6 text-slate-400 text-sm">
          Tidak ada data.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-slate-200/60 lg:col-span-1 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden py-0 gap-0 relative">
        <CardHeader className="pt-4 pb-4 sm:pt-5 sm:pb-5 bg-slate-50 border-b border-slate-100 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Serapan Anggaran</CardTitle>
            <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal mt-1">
              Status realisasi pagu dana.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTahun} onValueChange={(val) => { if (val) setSelectedTahun(val); }} disabled={loading}>
              <SelectTrigger className="h-8 text-xs font-medium w-[80px]">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {tahunList.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link 
              href={`/dashboard/tahun-anggaran/serapan?tahun=${selectedTahun}`}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors shrink-0"
              title="Lihat Rincian Detail"
            >
              <Maximize2 className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center pt-6 pb-6 px-6 relative min-h-[250px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
              <span className="text-xs text-slate-500 font-medium">Memuat data...</span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Circle display */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    fill="transparent" stroke="currentColor" strokeWidth="8" 
                    strokeDasharray={251.2} 
                    strokeDashoffset={251.2 - (251.2 * Math.min(absPercent, 100)) / 100} 
                    strokeLinecap="round"
                    className={`${barColorClass} transition-all duration-1000 ease-out`} 
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-900">{absPercent.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-500 font-medium">Terserap</span>
                </div>
              </div>
              
              <div className="w-full space-y-2 mt-6">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500">Pagu Dana</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(totalPagu.toString())}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-slate-500">Realisasi</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totalPengeluaran.toString())}</span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Sisa Saldo</span>
                  <span className={`font-bold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(totalSisaSaldo.toString())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}
