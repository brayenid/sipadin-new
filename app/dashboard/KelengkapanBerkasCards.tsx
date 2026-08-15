"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";

interface KelengkapanStatProps {
  title: string;
  description: string;
  percent: number;
  completedCount: number;
  pendingCount: number;
  totalCount: number;
  unitLabel: string;
  completedLabel: string;
  pendingLabel: string;
  actionHref: string;
  actionText: string;
}

function ProgressCircleCard({
  title,
  description,
  percent,
  completedCount,
  pendingCount,
  totalCount,
  unitLabel,
  completedLabel,
  pendingLabel,
  actionHref,
  actionText,
}: KelengkapanStatProps) {
  const safePercent = Math.min(Math.max(percent, 0), 100);
  const strokeColorClass =
    safePercent >= 80
      ? "text-emerald-500"
      : safePercent >= 50
      ? "text-indigo-500"
      : safePercent > 0
      ? "text-amber-500"
      : "text-slate-300";

  const badgeBgClass =
    safePercent >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : safePercent >= 50
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : safePercent > 0
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <Card className="border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden py-0 gap-0">
      <CardHeader className="pt-3 pb-3 sm:pt-4 sm:pb-4 bg-slate-50 border-b border-slate-100">
        <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold text-slate-900">
          {title}
        </CardTitle>
        <CardDescription className="text-[10px] font-medium sm:text-xs sm:font-normal">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between pt-4 pb-4 sm:pt-5 sm:pb-5 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          {/* Circular Gauge */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100"
              />
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={238.76}
                strokeDashoffset={238.76 - (238.76 * safePercent) / 100}
                strokeLinecap="round"
                className={`${strokeColorClass} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {safePercent.toFixed(0)}%
              </span>
              <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                Lengkap
              </span>
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {completedLabel}
              </span>
              <span className="font-bold text-slate-900">
                {completedCount} <span className="font-normal text-slate-500 text-[11px]">{unitLabel}</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {pendingLabel}
              </span>
              <span className="font-bold text-slate-900">
                {pendingCount} <span className="font-normal text-slate-500 text-[11px]">{unitLabel}</span>
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-500">
              <span>Total Keseluruhan</span>
              <span className="font-semibold text-slate-700">
                {totalCount} {unitLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <Link href={actionHref}>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-slate-600 hover:text-slate-900 hover:bg-slate-50 h-8 text-xs font-medium justify-center group"
            >
              <span>{actionText}</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KelengkapanBerkasCards({
  spjData,
  naskahData,
  activeTahun,
}: {
  spjData: {
    total: number;
    withDrive: number;
    withoutDrive: number;
    percent: number;
  };
  naskahData: {
    total: number;
    withScan: number;
    withoutScan: number;
    percent: number;
  };
  activeTahun: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ProgressCircleCard
        title="Data Dukung SPJ"
        description={`Kelengkapan tautan Google Drive TA ${activeTahun}.`}
        percent={spjData.percent}
        completedCount={spjData.withDrive}
        pendingCount={spjData.withoutDrive}
        totalCount={spjData.total}
        unitLabel="berkas"
        completedLabel="Ada Tautan Drive"
        pendingLabel="Belum Ada Tautan"
        actionHref="/dashboard/spj"
        actionText="Kelola Berkas SPJ"
      />

      <ProgressCircleCard
        title="Bukti Scan Naskah Dinas"
        description="Kelengkapan tautan berkas fisik / scan naskah dinas."
        percent={naskahData.percent}
        completedCount={naskahData.withScan}
        pendingCount={naskahData.withoutScan}
        totalCount={naskahData.total}
        unitLabel="dokumen"
        completedLabel="Ada Bukti Scan"
        pendingLabel="Belum Ada Scan"
        actionHref="/dashboard/naskah-dinas"
        actionText="Kelola Naskah Dinas"
      />
    </div>
  );
}
