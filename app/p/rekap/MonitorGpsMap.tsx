"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatWita } from "@/lib/date-utils";
import { MapPin, Layers, ExternalLink, Crosshair, ChevronLeft, ChevronRight } from "lucide-react";

export interface MonitorGpsPoint {
  id: string;
  kegiatanId: string;
  namaKegiatan: string;
  tanggal: Date | string;
  tempat?: string | null;
  nama: string;
  jabatan: string;
  instansi: string;
  eselon?: string | null;
  status: string;
  waktuInput?: Date | string | null;
  latitude: number;
  longitude: number;
  distanceMeters?: number | null;
  isInsideRadius?: boolean | null;
}

export interface MonitorGpsVenue {
  kegiatanId: string;
  namaKegiatan: string;
  tanggal: Date | string;
  tempat?: string | null;
  latitude: number;
  longitude: number;
  radiusMeter: number;
}

interface MonitorGpsMapProps {
  points: MonitorGpsPoint[];
  venues: MonitorGpsVenue[];
  isDark: boolean;
}

function formatJarak(meters?: number | null) {
  if (typeof meters !== "number") return null;
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function MapViewportController({
  points,
  venues,
  focusTarget,
}: {
  points: MonitorGpsPoint[];
  venues: MonitorGpsVenue[];
  focusTarget: { lat: number; lng: number; ts: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (focusTarget) {
      map.flyTo([focusTarget.lat, focusTarget.lng], 17, { duration: 0.6 });
    }
  }, [focusTarget, map]);

  useEffect(() => {
    if (focusTarget) return;
    const coords: [number, number][] = points.map((p) => [p.latitude, p.longitude]);
    if (coords.length === 0) {
      venues.forEach((v) => coords.push([v.latitude, v.longitude]));
    }
    if (coords.length === 0) return;

    if (coords.length === 1) {
      map.setView(coords[0], 16);
    } else {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    }
  }, [points, venues, map, focusTarget]);

  return null;
}

export default function MonitorGpsMap({ points, venues, isDark }: MonitorGpsMapProps) {
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string>("");
  const [radiusFilter, setRadiusFilter] = useState<"ALL" | "INSIDE" | "OUTSIDE">("ALL");
  const [mapLayer, setMapLayer] = useState<"street" | "satellite">("street");
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; ts: number } | null>(
    null
  );

  // Kelompokkan per kegiatan (urut tanggal terbaru)
  const kegiatanGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        namaKegiatan: string;
        tanggal: Date | string;
        tempat?: string | null;
        radiusMeter?: number;
        totalPoints: number;
        insideCount: number;
        outsideCount: number;
      }
    >();

    for (const v of venues) {
      map.set(v.kegiatanId, {
        id: v.kegiatanId,
        namaKegiatan: v.namaKegiatan,
        tanggal: v.tanggal,
        tempat: v.tempat,
        radiusMeter: v.radiusMeter,
        totalPoints: 0,
        insideCount: 0,
        outsideCount: 0,
      });
    }

    for (const p of points) {
      let group = map.get(p.kegiatanId);
      if (!group) {
        group = {
          id: p.kegiatanId,
          namaKegiatan: p.namaKegiatan,
          tanggal: p.tanggal,
          tempat: p.tempat,
          totalPoints: 0,
          insideCount: 0,
          outsideCount: 0,
        };
        map.set(p.kegiatanId, group);
      }
      group.totalPoints += 1;
      if (p.isInsideRadius === false) group.outsideCount += 1;
      else group.insideCount += 1;
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
  }, [points, venues]);

  // Pastikan selalu memilih 1 kegiatan aktif (default kegiatan terbaru)
  const activeKegiatanId = useMemo(() => {
    if (selectedKegiatanId && kegiatanGroups.some((k) => k.id === selectedKegiatanId)) {
      return selectedKegiatanId;
    }
    return kegiatanGroups[0]?.id || "";
  }, [selectedKegiatanId, kegiatanGroups]);

  const activeGroupIndex = useMemo(
    () => kegiatanGroups.findIndex((k) => k.id === activeKegiatanId),
    [kegiatanGroups, activeKegiatanId]
  );

  const activeGroup = activeGroupIndex >= 0 ? kegiatanGroups[activeGroupIndex] : null;

  const scopedPoints = useMemo(() => {
    if (!activeKegiatanId) return [];
    return points.filter((p) => p.kegiatanId === activeKegiatanId);
  }, [points, activeKegiatanId]);

  const scopedVenues = useMemo(() => {
    if (!activeKegiatanId) return [];
    return venues.filter((v) => v.kegiatanId === activeKegiatanId);
  }, [venues, activeKegiatanId]);

  const counts = useMemo(() => {
    let inside = 0;
    let outside = 0;
    for (const p of scopedPoints) {
      if (p.isInsideRadius === false) outside += 1;
      else inside += 1;
    }
    return { all: scopedPoints.length, inside, outside };
  }, [scopedPoints]);

  const visiblePoints = useMemo(() => {
    if (radiusFilter === "INSIDE") {
      return scopedPoints.filter((p) => p.isInsideRadius !== false);
    }
    if (radiusFilter === "OUTSIDE") {
      return scopedPoints.filter((p) => p.isInsideRadius === false);
    }
    return scopedPoints;
  }, [scopedPoints, radiusFilter]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (visiblePoints.length > 0) {
      return [visiblePoints[0].latitude, visiblePoints[0].longitude];
    }
    if (scopedVenues.length > 0) {
      return [scopedVenues[0].latitude, scopedVenues[0].longitude];
    }
    // Default Sendawar, Kutai Barat
    return [-0.2367, 115.6967];
  }, [visiblePoints, scopedVenues]);

  const tileUrl =
    mapLayer === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution =
    mapLayer === "satellite"
      ? "&copy; Esri"
      : isDark
      ? "&copy; OpenStreetMap &copy; CARTO"
      : "&copy; OpenStreetMap";

  return (
    <section className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-300 dark:border-zinc-800 shadow-2xs overflow-hidden">
      {/* Toolbar Peta Sebaran GPS per Kegiatan */}
      <div className="p-3 sm:px-5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-300 dark:border-zinc-800 space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-700 dark:text-zinc-300 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                Peta Sebaran Titik GPS per Kegiatan
              </h2>
            </div>
            <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-zinc-200 bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {kegiatanGroups.length} Kegiatan
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Pemilih Kelompok Kegiatan */}
            {kegiatanGroups.length > 0 && (
              <div className="flex items-center gap-1">
                {kegiatanGroups.length > 1 && (
                  <button
                    type="button"
                    disabled={activeGroupIndex <= 0}
                    onClick={() => {
                      if (activeGroupIndex > 0) {
                        setSelectedKegiatanId(kegiatanGroups[activeGroupIndex - 1].id);
                        setFocusTarget(null);
                      }
                    }}
                    className="h-8 w-7 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-35 flex items-center justify-center"
                    title="Kegiatan lebih baru"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <select
                  value={activeKegiatanId}
                  onChange={(e) => {
                    setSelectedKegiatanId(e.target.value);
                    setFocusTarget(null);
                  }}
                  className="h-8 max-w-[240px] sm:max-w-[340px] px-2 rounded text-xs font-semibold bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 focus:outline-none"
                >
                  {kegiatanGroups.map((grp, i) => (
                    <option key={grp.id} value={grp.id}>
                      {i + 1}. {formatWita(grp.tanggal, "dd MMM yyyy")} - {grp.namaKegiatan} (
                      {grp.totalPoints} titik)
                    </option>
                  ))}
                </select>

                {kegiatanGroups.length > 1 && (
                  <button
                    type="button"
                    disabled={activeGroupIndex < 0 || activeGroupIndex >= kegiatanGroups.length - 1}
                    onClick={() => {
                      if (activeGroupIndex >= 0 && activeGroupIndex < kegiatanGroups.length - 1) {
                        setSelectedKegiatanId(kegiatanGroups[activeGroupIndex + 1].id);
                        setFocusTarget(null);
                      }
                    }}
                    className="h-8 w-7 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-35 flex items-center justify-center"
                    title="Kegiatan sebelumnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Filter Valid / Luar Titik */}
            <div className="flex items-center gap-1 font-bold text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setRadiusFilter("ALL");
                  setFocusTarget(null);
                }}
                className={`h-8 px-2.5 rounded border transition-colors ${
                  radiusFilter === "ALL"
                    ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-slate-900 dark:border-zinc-100"
                    : "bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                Semua ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRadiusFilter("INSIDE");
                  setFocusTarget(null);
                }}
                className={`h-8 px-2.5 rounded border transition-colors ${
                  radiusFilter === "INSIDE"
                    ? "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white dark:bg-zinc-800/90 text-emerald-700 dark:text-emerald-400 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                Di Lokasi ({counts.inside})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRadiusFilter("OUTSIDE");
                  setFocusTarget(null);
                }}
                className={`h-8 px-2.5 rounded border transition-colors ${
                  radiusFilter === "OUTSIDE"
                    ? "bg-rose-700 text-white border-rose-700"
                    : "bg-white dark:bg-zinc-800/90 text-rose-700 dark:text-rose-400 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                Luar Titik ({counts.outside})
              </button>
            </div>

            {/* Toggle Peta / Satelit */}
            <button
              type="button"
              onClick={() => setMapLayer((prev) => (prev === "street" ? "satellite" : "street"))}
              className="h-8 px-2.5 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1"
              title="Ubah tampilan peta"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{mapLayer === "street" ? "Satelit" : "Peta"}</span>
            </button>

            {focusTarget && (
              <button
                type="button"
                onClick={() => setFocusTarget(null)}
                className="h-8 px-2.5 rounded border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-[11px] font-bold inline-flex items-center gap-1"
                title="Reset tampilan seluruh titik"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Fit Semua</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Ringkas Kegiatan Aktif */}
        {activeGroup && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-zinc-300 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
            <span className="font-bold text-slate-950 dark:text-zinc-50">
              {activeGroup.namaKegiatan}
            </span>
            <span className="text-slate-500 dark:text-zinc-400 tabular-nums">
              {formatWita(activeGroup.tanggal, "dd MMM yyyy")}
            </span>
            {activeGroup.tempat && (
              <span className="text-slate-600 dark:text-zinc-400">
                • {activeGroup.tempat}
              </span>
            )}
            {typeof activeGroup.radiusMeter === "number" && (
              <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                • Radius toleransi: {activeGroup.radiusMeter} m
              </span>
            )}
          </div>
        )}
      </div>

      {/* Konten Peta + Daftar Titik */}
      {points.length === 0 && venues.length === 0 ? (
        <div className="py-10 px-4 text-center text-xs font-medium text-slate-600 dark:text-zinc-400">
          Belum ada data koordinat GPS presensi yang terekam pada rentang waktu ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-300 dark:divide-zinc-800">
          {/* Peta Leaflet (8 Col) */}
          <div className="lg:col-span-8 relative z-0 h-[320px] sm:h-[380px] bg-slate-100 dark:bg-zinc-950">
            <MapContainer
              center={defaultCenter}
              zoom={15}
              scrollWheelZoom={true}
              className="h-full w-full z-0"
            >
              <TileLayer url={tileUrl} attribution={tileAttribution} />
              <MapViewportController
                points={visiblePoints}
                venues={scopedVenues}
                focusTarget={focusTarget}
              />

              {/* Lingkaran Radius Lokasi Kegiatan */}
              {scopedVenues.map((v) => (
                <React.Fragment key={`venue_${v.kegiatanId}`}>
                  <Circle
                    center={[v.latitude, v.longitude]}
                    radius={v.radiusMeter || 50}
                    pathOptions={{
                      color: "#334155",
                      fillColor: "#64748b",
                      fillOpacity: 0.14,
                      weight: 1.5,
                      dashArray: "4 4",
                    }}
                  />
                  <CircleMarker
                    center={[v.latitude, v.longitude]}
                    radius={5}
                    pathOptions={{
                      color: "#ffffff",
                      fillColor: "#0f172a",
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[180px]">
                        <div className="font-bold text-slate-900">Titik Lokasi Kegiatan</div>
                        <div className="font-semibold text-slate-800">{v.namaKegiatan}</div>
                        {v.tempat && <div className="text-slate-600">{v.tempat}</div>}
                        <div className="text-[11px] text-slate-500">
                          Radius toleransi: {v.radiusMeter} m
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))}

              {/* Titik Koordinat Presensi Peserta */}
              {visiblePoints.map((pt) => {
                const isOutside = pt.isInsideRadius === false;
                const jarak = formatJarak(pt.distanceMeters);
                return (
                  <CircleMarker
                    key={pt.id}
                    center={[pt.latitude, pt.longitude]}
                    radius={isOutside ? 8 : 7}
                    pathOptions={{
                      color: "#ffffff",
                      fillColor: isOutside ? "#e11d48" : "#059669",
                      fillOpacity: 0.92,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[200px]">
                        <div className="font-bold text-slate-900 leading-snug">{pt.nama}</div>
                        <div className="text-[11px] text-slate-600 leading-snug">
                          {pt.jabatan || "-"}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700">
                          {pt.instansi}
                        </div>
                        <div className="pt-1 border-t border-slate-200 space-y-0.5 text-[11px]">
                          <div className="font-semibold text-slate-800">{pt.namaKegiatan}</div>
                          {pt.waktuInput && (
                            <div className="text-slate-600">
                              Waktu: {formatWita(pt.waktuInput, "dd MMM yyyy HH:mm")} WITA
                            </div>
                          )}
                          <div
                            className={`font-bold ${
                              isOutside ? "text-rose-700" : "text-emerald-700"
                            }`}
                          >
                            {isOutside ? "Luar Titik Lokasi" : "Di Dalam Lokasi"}
                            {jarak ? ` (${jarak})` : ""}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${pt.latitude},${pt.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 pt-1 text-[11px] font-bold text-blue-700 hover:underline"
                        >
                          <span>Buka di Google Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>

          {/* Daftar Titik GPS Ringkas (4 Col) */}
          <div className="lg:col-span-4 flex flex-col max-h-[320px] sm:max-h-[380px]">
            <div className="shrink-0 px-3 py-2 bg-slate-100 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              <span>Daftar Titik Terekam</span>
              <span className="tabular-nums text-slate-500 dark:text-zinc-400">
                Klik untuk fokus
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-zinc-800">
              {visiblePoints.length === 0 ? (
                <div className="py-10 px-4 text-center text-xs text-slate-500 dark:text-zinc-400">
                  Tidak ada titik GPS pada filter ini.
                </div>
              ) : (
                visiblePoints.map((pt) => {
                  const isOutside = pt.isInsideRadius === false;
                  const jarak = formatJarak(pt.distanceMeters);
                  return (
                    <button
                      key={`list_${pt.id}`}
                      type="button"
                      onClick={() =>
                        setFocusTarget({
                          lat: pt.latitude,
                          lng: pt.longitude,
                          ts: Date.now(),
                        })
                      }
                      className="w-full text-left px-3 py-2 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 transition-colors flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOutside ? "bg-rose-600" : "bg-emerald-600"
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                            {pt.nama}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 truncate pl-3.5">
                          {pt.jabatan || "-"} • {pt.instansi}
                        </div>
                        {pt.waktuInput && (
                          <div className="text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums pl-3.5">
                            Presensi: {formatWita(pt.waktuInput, "HH:mm")} WITA
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <span
                          className={`block text-[11px] font-bold ${
                            isOutside
                              ? "text-rose-700 dark:text-rose-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {isOutside ? "Luar Titik" : "Di Lokasi"}
                        </span>
                        {jarak && (
                          <span className="block text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                            {jarak}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
