"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DopdTab from "./DopdTab";
import PersonelTab from "./PersonelTab";

export default function SpjDetailTabs({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const [activeTab, setActiveTab] = useState("ringkasan");

  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD: Total Pengajuan DOPD (seperti di screenshot) */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm border flex items-center justify-center text-slate-500">
              {/* Icon Kalkulator placeholder */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calculator"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Pengajuan SPJ</p>
              <h3 className="text-3xl font-black text-slate-900">{formatRupiah(spj.totalPengeluaran)}</h3>
            </div>
          </div>
          {/* Opsional Print PDF Button placeholder */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-slate-500">{spj.jenisSpj}</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* SCROLLABLE TABS */}
        <div className="border-b overflow-x-auto no-scrollbar mb-6">
          <TabsList className="bg-transparent border-none w-max h-12 p-0 justify-start gap-6">
            <TabsTrigger value="ringkasan" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Ringkasan</TabsTrigger>
            <TabsTrigger value="personel" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Personel</TabsTrigger>
            
            {/* Hanya tampilkan DOPD jika Perjadin */}
            {spj.jenisSpj === "PERJADIN" && (
              <TabsTrigger value="dopd" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">DOPD</TabsTrigger>
            )}
            
            <TabsTrigger value="kuitansi" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Kuitansi</TabsTrigger>
            
            {spj.jenisSpj === "PERJADIN" && (
              <>
                <TabsTrigger value="surat-tugas" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">Surat Tugas</TabsTrigger>
                <TabsTrigger value="spd" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full text-sm font-medium">SPD</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* TAB RINGKASAN */}
        <TabsContent value="ringkasan" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Sub-Kegiatan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Tahun Anggaran</p>
                  <p className="font-medium">{spj.subKegiatan.kegiatan.tahunAnggaran.tahun}</p>
                </div>
                <div>
                  <p className="text-slate-500">Judul Kegiatan</p>
                  <p className="font-medium">{spj.subKegiatan.kegiatan.judulKegiatan}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Judul Sub-Kegiatan</p>
                  <p className="font-medium">{spj.subKegiatan.judulSub}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {spj.jenisSpj === "PERJADIN" && spj.perjadinDetail && (
            <Card>
              <CardHeader>
                <CardTitle>Rute Perjalanan Dinas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Tempat Berangkat</p>
                    <p className="font-medium">{spj.perjadinDetail.tempatBerangkat}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tempat Tujuan</p>
                    <p className="font-medium">{spj.perjadinDetail.tempatTujuan}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tanggal Perjalanan</p>
                    <p className="font-medium">
                      {new Intl.DateTimeFormat("id-ID").format(new Date(spj.perjadinDetail.tglBerangkat))} 
                      {" "}s/d{" "} 
                      {new Intl.DateTimeFormat("id-ID").format(new Date(spj.perjadinDetail.tglKembali))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Lama Perjalanan</p>
                    <p className="font-medium">{spj.perjadinDetail.lamaPerjalanan} Hari</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB PERSONEL */}
        <TabsContent value="personel">
          <PersonelTab spj={spj} pegawaiList={pegawaiList} />
        </TabsContent>

        {/* TAB DOPD (KHUSUS PERJADIN) */}
        {spj.jenisSpj === "PERJADIN" && (
          <TabsContent value="dopd">
            <DopdTab spj={spj} />
          </TabsContent>
        )}

        {/* TABS LAINNYA (PLACEHOLDER) */}
        <TabsContent value="kuitansi">
          <Card><CardContent className="py-12 text-center text-slate-500">Fitur Kuitansi akan hadir di tahap selanjutnya.</CardContent></Card>
        </TabsContent>
        <TabsContent value="surat-tugas">
          <Card><CardContent className="py-12 text-center text-slate-500">Fitur Surat Tugas akan hadir di tahap selanjutnya.</CardContent></Card>
        </TabsContent>
        <TabsContent value="spd">
          <Card><CardContent className="py-12 text-center text-slate-500">Fitur Surat Perjalanan Dinas akan hadir di tahap selanjutnya.</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
