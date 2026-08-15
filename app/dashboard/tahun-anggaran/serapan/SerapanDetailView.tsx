"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";

type RekeningData = {
  id: string;
  kodeRekening: string;
  judulRekening: string;
  saldoAwal: number | bigint;
  sisaSaldo: number | bigint;
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
  kegiatan: KegiatanData[];
};

export default function SerapanDetailView({ 
  initialData, 
}: { 
  tahunList: string[], 
  initialData: TahunDetailData | null,
  initialTahun: string 
}) {
  const [data, setData] = useState<TahunDetailData | null>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(initialData);
    setLoading(false);
  }, [initialData]);

  return (
    <Card className="p-0 overflow-hidden">
      <CardContent className="p-4 sm:p-6 bg-white min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-500 font-medium">Memuat rincian...</p>
          </div>
        ) : !data || data.kegiatan.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p>Tidak ada data kegiatan untuk tahun ini.</p>
          </div>
        ) : (
          <div className="space-y-8 w-full pb-10">
            {data.kegiatan.map((keg) => {
              let kPagu = BigInt(0);
              let kSisa = BigInt(0);
              keg.subKegiatan.forEach((s) => {
                s.rekening.forEach((r) => {
                  kPagu += BigInt(r.saldoAwal);
                  kSisa += BigInt(r.sisaSaldo);
                });
              });
              const kRealisasi = kPagu - kSisa;
              const kPercent = kPagu > BigInt(0) ? Number((kRealisasi * BigInt(100)) / kPagu) : 0;

              return (
                <div key={keg.id} className="mb-12">
                  {/* Header Kegiatan */}
                  <div className="pb-4 mb-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <Badge variant="outline" className="mb-3 text-[10px] uppercase font-semibold text-slate-500 border-slate-200">
                        Kegiatan
                      </Badge>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {keg.judulKegiatan}
                      </h3>
                      <p className="text-xs font-mono text-slate-500 mt-1">{keg.kodeKegiatan}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 bg-slate-50 px-3 sm:px-4 py-2 rounded-lg border border-slate-100 w-full md:w-auto">
                      <div className="flex flex-col items-start sm:items-end flex-1 sm:flex-none overflow-hidden">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Pagu Kegiatan</span>
                        <span className="text-xs sm:text-sm font-bold text-slate-700 truncate w-full text-left sm:text-right">{formatCurrency(kPagu.toString())}</span>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Terserap</span>
                        <span className={`text-xs sm:text-sm font-bold ${kPercent < 50 ? 'text-red-600' : kPercent < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>{kPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* List Sub Kegiatan */}
                  <div className="space-y-6">
                    {keg.subKegiatan.map((sub) => {
                      let sPagu = BigInt(0);
                      let sSisa = BigInt(0);
                      sub.rekening.forEach((r) => {
                        sPagu += BigInt(r.saldoAwal);
                        sSisa += BigInt(r.sisaSaldo);
                      });
                      const sRealisasi = sPagu - sSisa;

                      const chartData = [
                        { name: "Realisasi", value: Number(sRealisasi), fill: "#6366f1" },
                        { name: "Sisa Saldo", value: Number(sSisa), fill: "#10b981" },
                      ];

                      const chartConfig = {
                        realisasi: { label: "Realisasi", color: "#6366f1" },
                        sisa: { label: "Sisa Saldo", color: "#10b981" },
                      };

                      return (
                        <div key={sub.id} className="border border-slate-200 rounded-xl bg-white p-4 sm:p-5 flex flex-col xl:flex-row gap-6">
                          {/* Kiri: Info & Chart */}
                          <div className="flex flex-col w-full xl:w-80 shrink-0">
                            <Badge variant="secondary" className="w-fit mb-3 text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-50 uppercase font-semibold">
                              Sub Kegiatan
                            </Badge>
                            <div className="mb-4">
                              <h4 className="font-semibold text-slate-800 text-sm leading-snug">
                                {sub.judulSub}
                              </h4>
                              <p className="text-xs font-mono text-slate-500 mt-1">{sub.kodeSub}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5">
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 overflow-hidden">
                                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Total Pagu</p>
                                <p className="text-xs sm:text-sm font-bold text-slate-700 truncate" title={formatCurrency(sPagu.toString())}>{formatCurrency(sPagu.toString())}</p>
                              </div>
                              <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50 overflow-hidden">
                                <p className="text-[10px] sm:text-[11px] text-indigo-500 font-medium">Realisasi</p>
                                <p className="text-xs sm:text-sm font-bold text-indigo-700 truncate" title={formatCurrency(sRealisasi.toString())}>{formatCurrency(sRealisasi.toString())}</p>
                              </div>
                            </div>

                            {/* Chart Serapan */}
                            <div className="flex-1 min-h-[220px] bg-slate-50/50 rounded-xl border border-slate-100 p-2 sm:p-4 flex flex-col justify-center">
                              {sPagu > BigInt(0) ? (
                                <ChartContainer config={chartConfig} className="w-full h-[200px] mx-auto">
                                  <PieChart>
                                    <Pie
                                      data={chartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={45}
                                      outerRadius={70}
                                      paddingAngle={2}
                                      dataKey="value"
                                    >
                                      {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                      ))}
                                    </Pie>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                  </PieChart>
                                </ChartContainer>
                              ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                  Belum ada pagu dana.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Kanan: List Rekening */}
                          <div className="flex-1 min-w-0 flex flex-col">
                            <h5 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                              Rincian Rekening
                            </h5>
                            <div className="space-y-2 flex-1">
                              {sub.rekening.length === 0 ? (
                                <div className="text-sm text-slate-400 italic py-6 text-center border border-dashed rounded-lg">Belum ada rekening.</div>
                              ) : (
                                sub.rekening.map((rek) => {
                                  const rPagu = BigInt(rek.saldoAwal);
                                  const rSisa = BigInt(rek.sisaSaldo);
                                  const rRealisasi = rPagu - rSisa;
                                  const rPercent = rPagu > BigInt(0) ? Number((rRealisasi * BigInt(100)) / rPagu) : 0;
                                  
                                  return (
                                    <div key={rek.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition-colors gap-3">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={rek.judulRekening}>{rek.judulRekening}</p>
                                        <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 mt-0.5">{rek.kodeRekening}</p>
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 border-t md:border-0 border-slate-200/60 pt-2.5 md:pt-0">
                                        <div className="text-left sm:text-right shrink-0">
                                          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Pagu Awal</p>
                                          <p className="text-[11px] sm:text-xs font-semibold text-slate-600">{formatCurrency(rPagu.toString())}</p>
                                        </div>
                                        <div className="text-left sm:text-right shrink-0">
                                          <p className="text-[10px] text-indigo-500 font-medium mb-0.5">Realisasi</p>
                                          <p className="text-[11px] sm:text-xs font-bold text-indigo-600">{formatCurrency(rRealisasi.toString())}</p>
                                        </div>
                                        <div className="text-left sm:text-right shrink-0">
                                          <p className="text-[10px] text-emerald-500 font-medium mb-0.5">Sisa Saldo</p>
                                          <p className="text-[11px] sm:text-xs font-bold text-emerald-600">{formatCurrency(rSisa.toString())}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-end min-w-[36px] sm:min-w-[42px]">
                                          <div className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${rPercent < 50 ? 'bg-red-100 text-red-700' : rPercent < 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {rPercent.toFixed(0)}%
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {keg.subKegiatan.length === 0 && (
                      <div className="px-4 py-8 text-sm text-center text-slate-400 border border-dashed rounded-lg bg-white">
                        Belum ada sub kegiatan.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
