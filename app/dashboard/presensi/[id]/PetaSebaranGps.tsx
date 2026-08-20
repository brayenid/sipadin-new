"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Navigation,
  Crosshair,
  Maximize2,
  Users,
  Search,
  Camera,
  Layers,
  Satellite,
  Map,
  RefreshCw,
} from "lucide-react";
import { formatWita } from "@/lib/date-utils";
import { calculateDistanceMeters, formatDistance, isWithinRadius } from "@/lib/geo-utils";
import "leaflet/dist/leaflet.css";

// Dynamic Import Leaflet Components to Avoid Next.js SSR Issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

interface PesertaWithGps {
  id: string;
  nama: string;
  nip: string | null;
  jabatan: string;
  instansi: string;
  status: string;
  namaPerwakilan?: string | null;
  waktuInput: Date | string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  fotoUrl: string | null;
}

interface AgendaVenueInfo {
  id: string;
  namaKegiatan: string;
  tempat: string;
  tanggal: Date | string;
  targetLatitude: number | null;
  targetLongitude: number | null;
  radiusMeter: number | null;
}

// Auto Fit Bounds Helper
const ChangeMapView = dynamic(
  () =>
    Promise.resolve(({ points }: { points: [number, number][] }) => {
      const { useMap } = require("react-leaflet");
      const map = useMap();

      useEffect(() => {
        if (points.length > 0 && typeof window !== "undefined") {
          const L = require("leaflet");
          if (points.length === 1) {
            map.setView(points[0], 16);
          } else {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
          }
        }
      }, [points, map]);

      return null;
    }),
  { ssr: false }
);

// Pan To Selected Target Helper
const PanToSelectedPerson = dynamic(
  () =>
    Promise.resolve(({ targetCoord }: { targetCoord: [number, number] | null }) => {
      const { useMap } = require("react-leaflet");
      const map = useMap();

      useEffect(() => {
        if (targetCoord && typeof window !== "undefined") {
          map.flyTo(targetCoord, 17, {
            duration: 0.8,
            easeLinearity: 0.25,
          });
        }
      }, [targetCoord, map]);

      return null;
    }),
  { ssr: false }
);

export default function PetaSebaranGps({
  agenda,
  pesertaList,
  initialSelectedPersonId,
}: {
  agenda: AgendaVenueInfo;
  pesertaList: PesertaWithGps[];
  initialSelectedPersonId?: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRadius, setFilterRadius] = useState<"ALL" | "INSIDE" | "OUTSIDE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);
  const [mapLayer, setMapLayer] = useState<"ESRI" | "OSM">("ESRI");
  const [showCentroidAnalysis, setShowCentroidAnalysis] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Responsif terhadap perpindahan dari tab daftar hadir untuk auto-focus ke marker peserta
  useEffect(() => {
    if (initialSelectedPersonId) {
      setSelectedPersonId(initialSelectedPersonId);
      const target = pesertaList.find((p) => p.id === initialSelectedPersonId);
      if (target && typeof target.latitude === "number" && typeof target.longitude === "number") {
        setPanTarget([target.latitude, target.longitude]);
      }
    }
  }, [initialSelectedPersonId, pesertaList]);

  // Auto-scroll pada daftar kanan saat marker di peta di-hover / di-select
  useEffect(() => {
    const targetId = hoveredPersonId || selectedPersonId;
    if (targetId && typeof document !== "undefined") {
      const el = document.getElementById(`peserta-card-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [hoveredPersonId, selectedPersonId]);

  const hasVenue =
    typeof agenda.targetLatitude === "number" &&
    typeof agenda.targetLongitude === "number";
  const venueRadius = agenda.radiusMeter || 100;

  // 1. Filter peserta yang memiliki koordinat GPS valid
  const pesertaWithGps = pesertaList.filter(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
  );
  const totalGps = pesertaWithGps.length;

  // 2. STATISTIK: Hitung Rata-Rata Posisi Geografis (Centroid) Peserta & Standar Deviasi
  const MIN_SAMPLE_SIZE = 4;
  const hasSufficientData = totalGps >= MIN_SAMPLE_SIZE;

  let centroidLat: number | null = null;
  let centroidLng: number | null = null;
  let meanDistanceToCentroid = 0;
  let stdDevMeters = 0;
  let estimatedRadiusMeter = 100; // Default radius sebelum data mencapai N=4

  if (totalGps > 0) {
    const sumLat = pesertaWithGps.reduce((acc, p) => acc + (p.latitude || 0), 0);
    const sumLng = pesertaWithGps.reduce((acc, p) => acc + (p.longitude || 0), 0);
    centroidLat = sumLat / totalGps;
    centroidLng = sumLng / totalGps;

    // Hitung jarak setiap peserta ke titik rata-rata (Centroid)
    const distancesFromCentroid = pesertaWithGps.map((p) =>
      calculateDistanceMeters(centroidLat!, centroidLng!, p.latitude!, p.longitude!)
    );

    meanDistanceToCentroid =
      distancesFromCentroid.reduce((a, b) => a + b, 0) / totalGps;

    // Hitung Standar Deviasi Jarak (Dispersion)
    const variance =
      distancesFromCentroid.reduce(
        (acc, dist) => acc + Math.pow(dist - meanDistanceToCentroid, 2),
        0
      ) / totalGps;
    stdDevMeters = Math.sqrt(variance);

    if (hasSufficientData) {
      // Radius Toleransi Estimasi = Mean Distance + (2 * Standar Deviasi), batas wajar 50m - 500m
      estimatedRadiusMeter = Math.max(
        50,
        Math.min(500, Math.round(meanDistanceToCentroid + 2 * stdDevMeters))
      );
    } else {
      // Jika N < 4, gunakan batas default aman 100m agar tidak terjadi bias sebaran semu
      estimatedRadiusMeter = 100;
    }
  }

  // 3. Tentukan Titik Acuan Pusat & Radius Efektif
  // Jika Titik Acara Diterapkan: Gunakan pengaturan manual titik kegiatan.
  // Jika Titik Acara TIDAK Diterapkan: Gunakan estimasi rata-rata (Centroid) + Standar Deviasi (jika N >= 4).
  const effectiveCenterLat = hasVenue ? agenda.targetLatitude! : centroidLat;
  const effectiveCenterLng = hasVenue ? agenda.targetLongitude! : centroidLng;
  const effectiveRadius = hasVenue ? venueRadius : estimatedRadiusMeter;
  const hasReferencePoint =
    typeof effectiveCenterLat === "number" &&
    typeof effectiveCenterLng === "number";

  // 4. Perhitungan Jarak & Status Kesesuaian Lokasi Peserta
  const calculatedPeserta = pesertaWithGps.map((p) => {
    let distance: number | null = null;
    let distanceToCentroid: number | null = null;
    let inRadius = true;
    let isAnomaly = false;

    if (centroidLat !== null && centroidLng !== null && p.latitude && p.longitude) {
      distanceToCentroid = calculateDistanceMeters(
        centroidLat,
        centroidLng,
        p.latitude,
        p.longitude
      );
    }

    if (hasReferencePoint && p.latitude && p.longitude) {
      distance = calculateDistanceMeters(
        effectiveCenterLat!,
        effectiveCenterLng!,
        p.latitude,
        p.longitude
      );
      inRadius = isWithinRadius(distance, effectiveRadius);

      if (hasVenue) {
        // Jika titik acara disetel: anomali adalah di luar radius titik kegiatan
        isAnomaly = !inRadius;
      } else {
        // Jika titik acara tidak disetel: anomali adalah di luar radius estimasi
        isAnomaly = !inRadius;
      }
    }

    return {
      ...p,
      distanceMeters: distance,
      distanceToCentroid,
      isInsideRadius: inRadius,
      isAnomaly,
    };
  });

  // Filter data berdasarkan tombol filter & pencarian
  const filteredPeserta = calculatedPeserta.filter((p) => {
    if (filterRadius === "INSIDE" && !p.isInsideRadius) return false;
    if (filterRadius === "OUTSIDE" && p.isInsideRadius) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.nama.toLowerCase().includes(q) ||
        p.instansi.toLowerCase().includes(q) ||
        p.jabatan.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Summary Metrics
  const countInside = calculatedPeserta.filter((p) => p.isInsideRadius).length;
  const countOutside = totalGps - countInside;
  const countAnomaly = calculatedPeserta.filter((p) => p.isAnomaly).length;

  // Kumpulan Semua Titik Koordinat untuk Auto-Zoom Bounds
  const allCoordinates: [number, number][] = [];
  if (hasReferencePoint) {
    allCoordinates.push([effectiveCenterLat!, effectiveCenterLng!]);
  }
  pesertaWithGps.forEach((p) => {
    if (p.latitude && p.longitude) {
      allCoordinates.push([p.latitude, p.longitude]);
    }
  });

  // Default Center Peta
  const defaultCenter: [number, number] = hasReferencePoint
    ? [effectiveCenterLat!, effectiveCenterLng!]
    : [-0.236517, 115.69641]; // Sendawar, Kutai Barat

  // Custom DivIcon Helpers
  const createVenueIcon = () => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    return L.divIcon({
      className: "custom-venue-icon",
      html: `
        <div style="
          background-color: #dc2626;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4v18"/>
            <path d="M19 21V11l-6-4"/>
            <path d="M9 9h1"/>
            <path d="M9 13h1"/>
            <path d="M9 17h1"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });
  };

  const createCentroidIcon = () => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    return L.divIcon({
      className: "custom-centroid-icon",
      html: `
        <div style="
          background-color: #4f46e5;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 14px rgba(79, 70, 229, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="22" y1="12" x2="18" y2="12"/>
            <line x1="6" y1="12" x2="2" y2="12"/>
            <line x1="12" y1="6" x2="12" y2="2"/>
            <line x1="12" y1="22" x2="12" y2="18"/>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20],
    });
  };

  const createPersonIcon = (isInside: boolean, isAnomaly: boolean, isHovered: boolean = false) => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    let bg = "#10b981"; // Green (normal inside)
    let shadow = "rgba(16, 185, 129, 0.4)";

    if (isAnomaly) {
      bg = "#ef4444"; // Red warning (anomaly / far off)
      shadow = "rgba(239, 68, 68, 0.5)";
    } else if (!isInside) {
      bg = "#f59e0b"; // Amber (outside radius)
      shadow = "rgba(245, 158, 11, 0.4)";
    }

    if (isHovered) {
      return L.divIcon({
        className: "custom-person-icon-hovered",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="
              position: absolute;
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background-color: ${bg};
              opacity: 0.45;
              animation: leaflet-ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              background-color: ${bg};
              width: 38px;
              height: 38px;
              border-radius: 50%;
              border: 3.5px solid white;
              box-shadow: 0 0 0 3px ${bg}, 0 6px 18px rgba(0, 0, 0, 0.45);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              transform: scale(1.1);
              transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
              <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        popupAnchor: [0, -25],
      });
    }

    return L.divIcon({
      className: "custom-person-icon",
      html: `
        <div style="
          background-color: ${bg};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 3px 10px ${shadow};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s ease;
        ">
          <svg style="width: 15px; height: 15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -18],
    });
  };

  if (!mounted) {
    return (
      <div className="h-96 w-full rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs animate-pulse">
        Memuat Antarmuka Peta...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metric Cards - Horizontal Scroll pada Mobile, Grid 4 Kolom pada Desktop */}
      <div className="flex sm:grid sm:grid-cols-4 gap-3 overflow-x-auto sm:overflow-visible pb-1.5 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Card 1: Total Rekap GPS */}
        <div className="min-w-[210px] sm:min-w-0 flex-1 shrink-0 snap-start bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Rekap GPS
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-rose-600" />
            {totalGps}{" "}
            <span className="text-xs font-normal text-slate-400">/ {pesertaList.length}</span>
          </div>
        </div>

        {/* Card 2: Titik Lokasi Kegiatan / Estimasi Rata-rata */}
        <div className="min-w-[230px] sm:min-w-0 flex-1 shrink-0 snap-start bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {hasVenue ? "Lokasi Kegiatan" : "Estimasi Pusat Kerumunan"}
          </div>
          <div className="text-xs font-bold text-slate-900 mt-1.5 flex items-center gap-1">
            {hasVenue ? (
              <Building2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            )}
            <span className="truncate">
              {hasVenue
                ? agenda.tempat || "Titik Venue Manual"
                : totalGps > 0
                ? "Rata-rata Presensi Pegawai"
                : "Belum Ada Data GPS"}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
            {hasReferencePoint
              ? `${effectiveCenterLat?.toFixed(4)}, ${effectiveCenterLng?.toFixed(4)}`
              : "Titik koordinat opsional"}
          </div>
        </div>

        {/* Card 3: Radius Toleransi & Standar Deviasi */}
        <div className="min-w-[230px] sm:min-w-0 flex-1 shrink-0 snap-start bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {hasVenue ? "Radius Toleransi" : "Radius Std Deviasi (±2σ)"}
          </div>
          <div className="text-xl font-bold text-indigo-600 mt-1 flex items-center gap-1.5">
            ±{effectiveRadius}m
          </div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            {hasVenue
              ? "Disetel manual pada agenda"
              : hasSufficientData
              ? `Standar Deviasi: ±${Math.round(stdDevMeters)}m (N=${totalGps})`
              : `Sampel awal (butuh min. 4 data presensi)`}
          </div>
        </div>

        {/* Card 4: Status Kesesuaian Lokasi & Deteksi Anomali */}
        <div
          className={`min-w-[230px] sm:min-w-0 flex-1 shrink-0 snap-start p-3.5 rounded-xl border shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] ${
            countAnomaly > 0
              ? "bg-amber-50/70 border-amber-200/70 text-amber-900"
              : "bg-emerald-50/70 border-emerald-200/70 text-emerald-900"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider">
            {countAnomaly > 0 ? "Perkiraan Tidak Sesuai" : "Kesesuaian Titik"}
          </div>
          <div className="text-xl font-bold mt-1 flex items-center gap-1.5">
            {countAnomaly > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            {countInside}{" "}
            <span className="text-xs font-normal opacity-80">
              Sesuai ({totalGps > 0 ? Math.round((countInside / totalGps) * 100) : 0}%)
            </span>
          </div>
          <div className="text-[10px] opacity-75 truncate mt-0.5">
            {countAnomaly > 0
              ? `${countAnomaly} peserta terdeteksi terlalu jauh`
              : "Semua titik presensi dalam batas wajar"}
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] overflow-hidden relative z-0 isolate">
        {/* Map Header Controls */}
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800">
              Peta Sebaran GPS:
            </span>

            {hasReferencePoint && (
              <select
                value={filterRadius}
                onChange={(e) => setFilterRadius(e.target.value as any)}
                className="h-7.5 text-xs bg-white border border-slate-300 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-none"
              >
                <option value="ALL">Semua ({totalGps})</option>
                <option value="INSIDE">Sesuai ({countInside})</option>
                <option value="OUTSIDE">Luar / Terlalu Jauh ({countOutside})</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Checkbox Estimasi Centroid (Hadir jika lokasi manual disetel) */}
            {hasVenue && totalGps > 1 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer bg-white px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition select-none">
                <input
                  type="checkbox"
                  checked={showCentroidAnalysis}
                  onChange={(e) => setShowCentroidAnalysis(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] font-medium text-slate-700">
                  Estimasi Rata-rata Kerumunan
                </span>
              </label>
            )}

            {/* Layer Switcher */}
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMapLayer("ESRI")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 ${
                  mapLayer === "ESRI"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                Satelit Esri
              </button>
              <button
                type="button"
                onClick={() => setMapLayer("OSM")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1.5 ${
                  mapLayer === "OSM"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Peta Jalan
              </button>
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama pada peta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 h-7.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44 shadow-none"
              />
            </div>

            {/* Tombol Segarkan Peta */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7.5 px-2.5 rounded-lg text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 select-none shadow-none cursor-pointer"
              title="Segarkan data presensi & titik peta"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Memuat..." : "Segarkan"}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid Layout: Kiri Peta (65%), Kanan Daftar Peserta Ber-GPS (35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 h-auto lg:h-[500px] overflow-hidden">
          {/* SISI KIRI: Canvas Peta Leaflet */}
          <div className="lg:col-span-7 xl:col-span-8 relative h-[380px] lg:h-full bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-200 z-0 isolate">
            {totalGps === 0 && !hasReferencePoint ? (
              <div className="absolute inset-0 z-10 bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <MapPin className="w-10 h-10 text-slate-300 animate-bounce" />
                <h4 className="text-sm font-bold text-slate-700">Belum Ada Titik Koordinat GPS</h4>
                <p className="text-xs max-w-md text-slate-400">
                  Belum ada data geolokasi dari peserta yang hadir atau titik pusat kegiatan belum ditentukan.
                </p>
              </div>
            ) : null}

            <MapContainer
              center={defaultCenter}
              zoom={15}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
            >
              {mapLayer === "ESRI" ? (
                <>
                  <TileLayer
                    key="esri-sat-rekap"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                  <TileLayer
                    key="esri-labels-rekap"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                </>
              ) : (
                <TileLayer
                  key="osm-roads-rekap"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
              )}

              {/* Auto bounds */}
              <ChangeMapView points={allCoordinates} />

              {/* Fly to clicked/hovered person */}
              <PanToSelectedPerson targetCoord={panTarget} />

              {/* 1. Marker Venue Acara Manual (Jika Disetel) */}
              {hasVenue && (
                <>
                  <Marker
                    position={[agenda.targetLatitude!, agenda.targetLongitude!]}
                    icon={createVenueIcon()}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 text-slate-800 min-w-[200px]">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-rose-700">
                          <Building2 className="w-4 h-4" />
                          Titik Lokasi Kegiatan
                        </div>
                        <div className="font-semibold text-xs text-slate-900">
                          {agenda.namaKegiatan}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          📍 {agenda.tempat}
                        </div>
                        <div className="text-[10px] text-slate-500 bg-rose-50 p-1.5 rounded border border-rose-100 font-mono">
                          Radius Area: {venueRadius} meter
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Lingkaran Geofence Radius Manual */}
                  <Circle
                    center={[agenda.targetLatitude!, agenda.targetLongitude!]}
                    radius={venueRadius}
                    pathOptions={{
                      color: "#4f46e5",
                      fillColor: "#6366f1",
                      fillOpacity: 0.12,
                      weight: 2,
                      dashArray: "4, 4",
                    }}
                  />
                </>
              )}

              {/* 2. Marker Estimasi Pusat Kerumunan Peserta (Centroid) */}
              {((!hasVenue) || (hasVenue && showCentroidAnalysis)) && centroidLat !== null && centroidLng !== null && (
                <>
                  <Marker
                    position={[centroidLat, centroidLng]}
                    icon={createCentroidIcon()}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 text-slate-800 min-w-[210px]">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-700">
                          <Crosshair className="w-4 h-4" />
                          Estimasi Pusat Kerumunan Peserta
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Dihitung otomatis dari rata-rata ({totalGps}) titik presensi peserta.
                        </p>
                        <div className="text-[10px] text-slate-500 bg-indigo-50 p-1.5 rounded border border-indigo-100 font-mono">
                          Radius Standar Deviasi (2σ): ±{estimatedRadiusMeter}m (Std Dev: ±{Math.round(stdDevMeters)}m)
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Lingkaran Toleransi Standar Deviasi */}
                  <Circle
                    center={[centroidLat, centroidLng]}
                    radius={estimatedRadiusMeter}
                    pathOptions={{
                      color: hasVenue ? "#818cf8" : "#4f46e5",
                      fillColor: hasVenue ? "#a5b4fc" : "#6366f1",
                      fillOpacity: hasVenue ? 0.08 : 0.12,
                      weight: 2,
                      dashArray: "4, 4",
                    }}
                  />
                </>
              )}

              {/* 3. Marker Personel / Pegawai yang Hadir (Bereaksi saat di-hover) */}
              {filteredPeserta.map((p) => {
                if (!p.latitude || !p.longitude) return null;
                const isHovered = hoveredPersonId === p.id;
                const isSelected = selectedPersonId === p.id;

                return (
                  <Marker
                    key={p.id}
                    position={[p.latitude, p.longitude]}
                    icon={createPersonIcon(p.isInsideRadius, p.isAnomaly, isHovered || isSelected)}
                    zIndexOffset={isHovered || isSelected ? 2000 : 1}
                    ref={(markerRef: any) => {
                      if (markerRef && isSelected) {
                        markerRef.openPopup();
                      }
                    }}
                    eventHandlers={{
                      mouseover: () => setHoveredPersonId(p.id),
                      mouseout: () => setHoveredPersonId(null),
                      click: () => {
                        setSelectedPersonId(p.id);
                        setPanTarget([p.latitude!, p.longitude!]);
                      },
                    }}
                  >
                    {/* Floating Tooltip saat di-hover */}
                    {(isHovered || isSelected) && (
                      <Tooltip
                        permanent
                        direction="top"
                        offset={[0, -22]}
                        className="!bg-slate-900 !text-white !border-0 !rounded-lg !px-2.5 !py-1 !shadow-xl !text-xs !font-sans pointer-events-none z-[3000]"
                      >
                        <div className="flex items-center gap-1.5">
                          {p.fotoUrl ? (
                            <img src={p.fotoUrl} alt="" className="w-4 h-4 rounded-full object-cover shrink-0 border border-slate-700" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          )}
                          <span className="font-bold text-[11px] whitespace-nowrap text-white">{p.nama}</span>
                          {p.distanceMeters !== null && (
                            <span className="text-[10px] text-slate-300 font-mono">({formatDistance(p.distanceMeters)})</span>
                          )}
                        </div>
                      </Tooltip>
                    )}

                    <Popup>
                      <div className="p-1.5 text-slate-800 min-w-[220px] max-w-[260px] space-y-2">
                        {p.fotoUrl && (
                          <div className="relative w-full h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                            <img
                              src={p.fotoUrl}
                              alt={p.nama}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-xs text-slate-900 leading-tight">
                              {p.nama}
                            </h4>
                            {p.isAnomaly && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full shrink-0 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                Terlalu Jauh
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {p.jabatan} • {p.instansi}
                          </p>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 space-y-1 text-[10.5px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Waktu Presensi:</span>
                            <span className="font-medium text-slate-700">
                              {formatWita(p.waktuInput, "HH:mm")} WITA
                            </span>
                          </div>

                          {p.distanceMeters !== null && (
                            <div className="flex justify-between items-center pt-0.5">
                              <span className="text-slate-500">Jarak ke Pusat Acara:</span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                  p.isAnomaly
                                    ? "bg-red-100 text-red-800"
                                    : p.isInsideRadius
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {formatDistance(p.distanceMeters)}{" "}
                                {p.isAnomaly
                                  ? "(Terlalu Jauh)"
                                  : p.isInsideRadius
                                  ? "(Dalam Radius)"
                                  : "(Luar Radius)"}
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                            <span>Koordinat GPS:</span>
                            <span>{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* SISI KANAN: Daftar Peserta Ber-GPS (Scrollable Panel dengan Hover Reaktif) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-[380px] lg:h-full bg-white overflow-hidden">
            {/* Header Panel Daftar Peserta */}
            <div className="bg-slate-50/90 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-100 shrink-0">
              <span className="text-xs font-bold text-slate-800">
                Daftar Peserta ({filteredPeserta.length})
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Jarak & Status
              </span>
            </div>

            {/* List Item Peserta (Scroll Y Otomatis Mengikuti Tinggi Peta) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {filteredPeserta.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada data peserta yang cocok dengan filter
                </div>
              ) : (
                filteredPeserta.map((p, idx) => {
                  const isHovered = hoveredPersonId === p.id;
                  const isSelected = selectedPersonId === p.id;

                  return (
                    <div
                      key={p.id}
                      id={`peserta-card-${p.id}`}
                      onMouseEnter={() => setHoveredPersonId(p.id)}
                      onMouseLeave={() => setHoveredPersonId(null)}
                      onClick={() => {
                        setSelectedPersonId(p.id);
                        if (p.latitude && p.longitude) {
                          setPanTarget([p.latitude, p.longitude]);
                        }
                      }}
                      className={`p-3 flex items-center justify-between transition text-slate-700 gap-2 cursor-pointer border-l-[3px] ${
                        isHovered || isSelected
                          ? "bg-indigo-50/90 border-l-indigo-600 shadow-2xs"
                          : "border-l-transparent hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <span className="text-[10px] font-mono text-slate-400 w-3.5 shrink-0">
                          {idx + 1}.
                        </span>
                        {p.fotoUrl ? (
                          <img
                            src={p.fotoUrl}
                            alt={p.nama}
                            className={`w-8 h-8 rounded-full object-cover shrink-0 border transition ${
                              isHovered || isSelected
                                ? "border-indigo-600 ring-2 ring-indigo-200"
                                : "border-slate-200"
                            }`}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition ${
                            isHovered || isSelected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`font-bold text-xs truncate max-w-[130px] sm:max-w-[170px] transition ${
                              isHovered || isSelected ? "text-indigo-900" : "text-slate-900"
                            }`}>
                              {p.nama}
                            </p>
                            {p.isAnomaly && (
                              <span className="text-[8.5px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full shrink-0 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                Terlalu Jauh
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px]">
                            {p.jabatan} • {p.instansi}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        {p.distanceMeters !== null && (
                          <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                              p.isAnomaly
                                ? "bg-red-100 text-red-800"
                                : p.isInsideRadius
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {formatDistance(p.distanceMeters)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Global Keyframes CSS untuk Animasi Ping Marker */}
        <style jsx global>{`
          @keyframes leaflet-ping {
            0% {
              transform: scale(0.85);
              opacity: 0.85;
            }
            70%, 100% {
              transform: scale(2.3);
              opacity: 0;
            }
          }
          .custom-person-icon-hovered {
            z-index: 2000 !important;
          }
        `}</style>

        {/* Disclaimer Catatan Peta */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 italic flex items-center justify-between flex-wrap gap-2">
          <span>
            * Catatan: Data peta nama tempat & jalan bersumber dari OpenStreetMap dan citra satelit Esri World Imagery.
          </span>
          {centroidLat !== null && (
            <span className="font-mono text-[10px] text-slate-500 not-italic">
              Rata-rata: {centroidLat.toFixed(5)}, {centroidLng?.toFixed(5)} (Std Dev ±{Math.round(stdDevMeters)}m)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
