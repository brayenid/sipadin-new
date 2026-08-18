"use client";

import React from "react";
import { usePrivacyMode } from "@/components/dashboard/PrivacyModeProvider";
import { Eye, EyeOff } from "lucide-react";

export default function PrivacyModeControl() {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <button
      type="button"
      onClick={togglePrivacyMode}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition shadow-xs cursor-pointer ${
        isPrivacyMode
          ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
          : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
      }`}
      title="Klik untuk menyalakan/mematikan sensor angka keuangan"
    >
      {isPrivacyMode ? (
        <>
          <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
          <span>Mode Presentasi: Aktif</span>
        </>
      ) : (
        <>
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Mode Presentasi: Nonaktif</span>
        </>
      )}
    </button>
  );
}
