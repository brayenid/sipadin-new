"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, BarChart2, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import SpjExportModal from "./SpjExportModal";

export default function SpjMobileNav() {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <>
      <MobileBottomNav
        primaryAction={
          <Link href="/dashboard/spj/buat" className="block w-full">
            <Button className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Buat SPJ Baru
            </Button>
          </Link>
        }
        secondaryDrawer={{
          title: "Opsi & Laporan SPJ",
          description: "Akses rekapitulasi perjalanan dinas dan ekspor data",
          children: (close) => (
            <>
              <Link
                href="/dashboard/rekap-perjadin"
                onClick={close}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                      Rekap Perjalanan Dinas
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Lihat statistik keaktifan dan akumulasi pengeluaran
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  close();
                  setIsExportOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
                      Ekspor Data SPJ
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Unduh laporan data SPJ ke dalam format spreadsheet Excel
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>
            </>
          ),
        }}
      />

      {/* Modal Ekspor Data SPJ terpisah dari Drawer */}
      <SpjExportModal open={isExportOpen} onOpenChange={setIsExportOpen} />
    </>
  );
}
