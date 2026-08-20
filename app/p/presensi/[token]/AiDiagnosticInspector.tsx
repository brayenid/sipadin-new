"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Cpu,
  Eye,
  Sliders,
  Copy,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";

export type DetectorConfig = {
  scoreThreshold: number;
  inputSize: number;
  requireLandmarks: boolean;
  minBoxRatio: number;
  backend: "webgl" | "cpu";
};

export type AiDetailedLog = {
  browserInfo: string;
  tfBackend: string;
  tinyLoaded: boolean;
  landmarkLoaded: boolean;
  recogLoaded: boolean;
  videoReady: number;
  videoRes: string;
  fps: number;
  inferenceTimeMs: number;
  rawCount: number;
  rawScores: number[];
  rawBoxes: { x: number; y: number; width: number; height: number; score: number }[];
  distinctCount: number;
  smoothedCount: number;
  landmarkCheckResults: { faceIdx: number; passed: boolean; pointsCount: number; detail?: string }[];
  descriptorStatus: string;
  lastError: string;
  timestamp: string;
};

export default function AiDiagnosticInspector({
  isOpen,
  onClose,
  log,
  config,
  onUpdateConfig,
  onSwitchBackend,
}: {
  isOpen: boolean;
  onClose: () => void;
  log: AiDetailedLog;
  config: DetectorConfig;
  onUpdateConfig: (newConfig: Partial<DetectorConfig>) => void;
  onSwitchBackend: (backend: "webgl" | "cpu") => Promise<void>;
  extractedDescriptor?: number[] | null;
}) {
  const [copied, setCopied] = useState(false);
  const [switchingBackend, setSwitchingBackend] = useState(false);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      browser: log.browserInfo,
      tensorFlow: {
        backend: log.tfBackend,
        models: {
          tinyFaceDetector: log.tinyLoaded ? "READY" : "NOT_LOADED",
          tinyLandmarks68: log.landmarkLoaded ? "READY" : "NOT_LOADED",
          faceRecognitionNet: log.recogLoaded ? "READY" : "NOT_LOADED",
        },
      },
      currentConfig: config,
      videoMetrics: {
        resolution: log.videoRes,
        readyState: log.videoReady,
        latencyMs: log.inferenceTimeMs,
        fps: log.fps,
      },
      detectionAnalysis: {
        rawProposalsCount: log.rawCount,
        rawScores: log.rawScores,
        rawBoxes: log.rawBoxes,
        landmarkValidation: log.landmarkCheckResults,
        distinctFacesAfterNMS: log.distinctCount,
        smoothedFinalCount: log.smoothedCount,
      },
      biometricStatus: log.descriptorStatus,
      lastError: log.lastError,
    };

    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    setCopied(true);
    toast.success("Laporan diagnostik berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBackendChange = async (target: "webgl" | "cpu") => {
    if (target === config.backend || switchingBackend) return;
    setSwitchingBackend(true);
    try {
      await onSwitchBackend(target);
      onUpdateConfig({ backend: target });
      toast.success(`Backend AI diubah ke: ${target.toUpperCase()}`);
    } catch (e: any) {
      toast.error(`Gagal mengubah backend: ${e?.message || e}`);
    } finally {
      setSwitchingBackend(false);
    }
  };

  return (
    <div className="fixed inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[480px] max-h-[85vh] overflow-y-auto z-50 bg-slate-950/95 text-slate-100 backdrop-blur-md rounded-2xl border border-indigo-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.6)] font-mono text-[11px] p-4 space-y-3.5 animate-in fade-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-900/60 text-indigo-400 border border-indigo-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
              AI Biometric Inspector
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h4>
            <p className="text-[9.5px] text-slate-400 font-sans">
              Diagnostik real-time kamera & deteksi wajah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyReport}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold text-[10.5px] transition flex items-center gap-1 shadow-sm cursor-pointer"
            title="Salin laporan lengkap dalam format JSON untuk dibagikan"
          >
            {copied ? <CheckCircle className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            {copied ? "Tersalin!" : "Salin JSON"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[10px]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Grid 1: Status Environment & Performance */}
      <div className="grid grid-cols-2 gap-2 text-[10.5px]">
        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" /> Engine & Backend
          </div>
          <div className="text-white font-bold flex items-center gap-1.5">
            <span className="text-cyan-300">{log.tfBackend.toUpperCase()}</span>
            <span className="text-[9px] text-slate-400 font-normal">
              ({log.inferenceTimeMs}ms • {log.fps} FPS)
            </span>
          </div>
          <div className="text-[9px] text-slate-400 truncate" title={log.browserInfo}>
            Browser: {log.browserInfo.split(" ")[0]}
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-1">
          <div className="text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3 text-emerald-400" /> Live Detection Status
          </div>
          <div className="text-white font-bold flex items-center gap-1.5">
            <span
              className={
                log.smoothedCount === 1
                  ? "text-emerald-400"
                  : log.smoothedCount > 1
                  ? "text-rose-400"
                  : "text-amber-400"
              }
            >
              {log.smoothedCount} Orang
            </span>
            <span className="text-[9px] text-slate-400 font-normal">
              (Raw: {log.rawCount} proposals)
            </span>
          </div>
          <div className="text-[9px] text-slate-400">
            Res: {log.videoRes} (State: {log.videoReady})
          </div>
        </div>
      </div>

      {/* Grid 2: Model Readiness Badges */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            log.tinyLoaded
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              : "bg-amber-950/60 text-amber-300 border-amber-800"
          }`}
        >
          {log.tinyLoaded ? "✓ TinyDetector" : "⌛ TinyDetector"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            log.landmarkLoaded
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          {log.landmarkLoaded ? "✓ Landmarks (68-pt)" : "⌛ Landmarks"}
        </span>
        <span
          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
            log.recogLoaded
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
              : "bg-slate-800 text-slate-400 border-slate-700"
          }`}
        >
          {log.recogLoaded ? "✓ RecognitionNet" : "⌛ RecogNet"}
        </span>
      </div>

      {/* Raw Detection Details (Proposal Boxes & Scores) */}
      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
        <div className="text-slate-400 text-[10px] flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Terminal className="w-3 h-3 text-indigo-400" /> Analisis Kotak Wajah Terdeteksi
          </span>
          <span className="text-slate-500 font-sans text-[9.5px]">
            {log.rawBoxes.length} box mentah
          </span>
        </div>

        {log.rawBoxes.length === 0 ? (
          <div className="text-slate-500 text-[10px] italic py-1">
            (Tidak ada proposal kotak wajah terdeteksi di frame ini)
          </div>
        ) : (
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            {log.rawBoxes.map((b, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded text-[9.5px] border border-slate-800/80"
              >
                <span className="text-slate-300 font-semibold">
                  Face #{idx + 1}: {(b.score * 100).toFixed(1)}% score
                </span>
                <span className="text-slate-400">
                  {Math.round(b.width)}x{Math.round(b.height)} px @ ({Math.round(b.x)}, {Math.round(b.y)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Live Tuning Controls */}
      <div className="bg-slate-900/90 p-3 rounded-xl border border-indigo-900/40 space-y-2.5">
        <div className="flex items-center justify-between text-indigo-300 font-bold text-[10.5px]">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Pengaturan Ambang Batas Real-time
          </span>
          <span className="text-[9px] text-slate-400 font-normal">
            (Ubah langsung di layar)
          </span>
        </div>

        {/* 1. Score Threshold Selector */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Score Threshold:</span>
            <span className="text-cyan-300 font-bold">{(config.scoreThreshold * 100).toFixed(0)}%</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {[0.35, 0.45, 0.55, 0.60, 0.65, 0.70].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onUpdateConfig({ scoreThreshold: val })}
                className={`py-1 rounded text-[9.5px] font-semibold transition cursor-pointer ${
                  Math.abs(config.scoreThreshold - val) < 0.01
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {(val * 100).toFixed(0)}%
              </button>
            ))}
          </div>
        </div>

        {/* 2. Input Size Selector */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Input Resolution Tensor:</span>
            <span className="text-cyan-300 font-bold">{config.inputSize} px</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[160, 224, 320, 416].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onUpdateConfig({ inputSize: size })}
                className={`py-1 rounded text-[9.5px] font-semibold transition cursor-pointer ${
                  config.inputSize === size
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* 3. Toggles: Require Landmarks & Switch Backend */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onUpdateConfig({ requireLandmarks: !config.requireLandmarks })}
            className={`py-1.5 px-2 rounded-lg text-[9.5px] font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
              config.requireLandmarks
                ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300"
                : "bg-slate-800/80 border-slate-700 text-slate-400"
            }`}
          >
            <Zap className="w-3 h-3" />
            Landmark Check: {config.requireLandmarks ? "AKTIF" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => handleBackendChange(config.backend === "webgl" ? "cpu" : "webgl")}
            disabled={switchingBackend}
            className="py-1.5 px-2 rounded-lg text-[9.5px] font-semibold border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${switchingBackend ? "animate-spin" : ""}`} />
            Backend: {config.backend.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {log.lastError && log.lastError !== "-" && (
        <div className="bg-rose-950/70 p-2.5 rounded-xl border border-rose-800/60 text-[10px] text-rose-300 break-all flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Error Terakhir:</span> {log.lastError}
          </div>
        </div>
      )}
    </div>
  );
}
