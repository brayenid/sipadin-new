"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Check,
  Sparkles,
  Search,
  X,
  Loader2,
  Satellite,
  Map,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// Dynamic import Leaflet components to avoid SSR errors
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
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

// Map Click Listener Component
const LocationClickPicker = dynamic(
  () =>
    Promise.resolve(
      ({
        onPick,
      }: {
        onPick: (lat: number, lng: number) => void;
      }) => {
        const { useMapEvents } = require("react-leaflet");
        useMapEvents({
          click(e: any) {
            onPick(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      }
    ),
  { ssr: false }
);

// Center Updater Component
const MapRecenter = dynamic(
  () =>
    Promise.resolve(
      ({ center }: { center: [number, number] }) => {
        const { useMap } = require("react-leaflet");
        const map = useMap();
        useEffect(() => {
          map.setView(center, map.getZoom());
        }, [center, map]);
        return null;
      }
    ),
  { ssr: false }
);

interface ModalMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat: number | null;
  initialLng: number | null;
  initialRadius?: number;
  onSelectLocation: (lat: number, lng: number, radius: number) => void;
}

// Preset Lokasi Penting di Kutai Barat
const PRESET_LOCATIONS = [
  {
    nama: "Kantor Bupati",
    lat: -0.236517,
    lng: 115.69641,
  },
  {
    nama: "Gedung ATJ",
    lat: -0.236527,
    lng: 115.69597,
  },
  {
    nama: "Alun-Alun Itho",
    lat: -0.238051,
    lng: 115.696989,
  },
  {
    nama: "TBS",
    lat: -0.221024,
    lng: 115.704253,
  },
];

type SearchResultItem = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

export default function ModalMapPicker({
  isOpen,
  onClose,
  initialLat,
  initialLng,
  initialRadius = 100,
  onSelectLocation,
}: ModalMapPickerProps) {
  const [selectedLat, setSelectedLat] = useState<number>(
    initialLat ?? -0.236517
  );
  const [selectedLng, setSelectedLng] = useState<number>(
    initialLng ?? 115.69641
  );
  const [radius, setRadius] = useState<number>(initialRadius || 100);
  const [mapLayer, setMapLayer] = useState<"ESRI" | "OSM">("ESRI");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialLat !== null && initialLng !== null) {
        setSelectedLat(initialLat);
        setSelectedLng(initialLng);
      } else {
        setSelectedLat(-0.236517);
        setSelectedLng(115.69641);
      }
      setRadius(initialRadius || 100);
      setSearchQuery("");
      setSearchResults([]);
      setShowDropdown(false);
      setMapLayer("ESRI");
    }
  }, [isOpen, initialLat, initialLng, initialRadius]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim() || val.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Query nominatim with Kutai Barat context prioritization
        const encoded = encodeURIComponent(val.trim());
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=id&limit=6&addressdetails=1`,
          {
            headers: {
              "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
            },
          }
        );
        if (res.ok) {
          const data: SearchResultItem[] = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Geocoding search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setSelectedLat(lat);
      setSelectedLng(lng);
      setSearchQuery(item.display_name.split(",")[0]);
      setShowDropdown(false);
    }
  };

  const createPickerPinIcon = () => {
    if (typeof window === "undefined") return undefined;
    const L = require("leaflet");
    return L.divIcon({
      className: "picker-pin-icon",
      html: `
        <div style="
          background-color: #dc2626;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 14px rgba(220, 38, 38, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: grab;
        ">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  const handleSave = () => {
    onSelectLocation(selectedLat, selectedLng, radius);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[95vw] max-h-[92vh] flex flex-col bg-white p-0 overflow-hidden border border-slate-200 shadow-2xl rounded-2xl">
        {/* Header Modal Standar */}
        <DialogHeader className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
              Pilih Titik Lokasi Kegiatan di Peta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Cari tempat atau klik pada peta untuk menentukan titik koordinat acara.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* 2-Column Layout: Kiri Map (65%), Kanan Meta Info & Controls (35%) */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* SISI KIRI: Canvas Peta Interaktif */}
          <div className="md:col-span-7 lg:col-span-8 relative h-[250px] sm:h-[300px] md:h-full min-h-[220px] md:min-h-[460px] bg-slate-100 border-b md:border-b-0 md:border-r border-slate-200 shrink-0 md:shrink">
            {isOpen && (
              <MapContainer
                center={[selectedLat, selectedLng]}
                zoom={16}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
              >
                {mapLayer === "ESRI" ? (
                  <>
                    <TileLayer
                      key="esri-sat"
                      attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={19}
                    />
                    <TileLayer
                      key="esri-labels"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={19}
                    />
                  </>
                ) : (
                  <TileLayer
                    key="osm-roads"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                )}

                <MapRecenter center={[selectedLat, selectedLng]} />

                {/* Click on Map to Move Pin */}
                <LocationClickPicker
                  onPick={(lat, lng) => {
                    setSelectedLat(lat);
                    setSelectedLng(lng);
                  }}
                />

                {/* Selected Venue Marker */}
                <Marker
                  position={[selectedLat, selectedLng]}
                  icon={createPickerPinIcon()}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e: any) => {
                      const marker = e.target;
                      const position = marker.getLatLng();
                      setSelectedLat(position.lat);
                      setSelectedLng(position.lng);
                    },
                  }}
                />

                {/* Geofence Radius Circle Preview */}
                <Circle
                  center={[selectedLat, selectedLng]}
                  radius={radius}
                  pathOptions={{
                    color: "#4f46e5",
                    fillColor: "#6366f1",
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: "4, 4",
                  }}
                />
              </MapContainer>
            )}

            {/* Layer Switcher Button Floating */}
            <div className="absolute top-2.5 right-2.5 z-400 flex items-center bg-white/90 backdrop-blur-xs p-0.5 rounded-lg shadow-md border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMapLayer("ESRI")}
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition flex items-center gap-1.5 ${
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
                className={`px-2.5 py-1 rounded-md text-[10.5px] font-semibold transition flex items-center gap-1.5 ${
                  mapLayer === "OSM"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Peta Jalan
              </button>
            </div>

            {/* Instruction Floating Badge */}
            <div className="absolute bottom-3 left-3 z-400 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded shadow-xs border border-slate-200 text-[10px] text-slate-600 flex items-center gap-1.5 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span><b>Klik peta</b> atau <b>geser pin merah</b></span>
            </div>
          </div>

          {/* SISI KANAN: Meta Info & Panel Pengaturan */}
          <div className="md:col-span-5 lg:col-span-4 p-4 flex flex-col justify-between space-y-3 bg-white relative overflow-y-auto min-h-0">
            <div className="space-y-3">
              {/* Fitur Pencarian Tempat / Gedung */}
              <div className="space-y-1 relative">
                <Label className="text-xs font-semibold text-slate-800 block">
                  Cari Tempat / Gedung
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Ketik nama gedung, hotel, jalan..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowDropdown(true);
                    }}
                    className="h-8 text-xs bg-slate-50 border-slate-300 pr-7 focus:bg-white text-slate-800"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSearching ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowDropdown(false);
                        }}
                        className="hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Dropdown Hasil Pencarian Tempat */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {searchResults.map((item) => (
                      <button
                        key={item.place_id}
                        type="button"
                        onClick={() => handleSelectSearchResult(item)}
                        className="w-full p-2 text-left hover:bg-indigo-50/70 transition flex items-start gap-1.5 group"
                      >
                        <MapPin className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-slate-700 group-hover:text-indigo-950 font-medium line-clamp-2">
                          {item.display_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic leading-snug mt-1">
                  * Data nama tempat/jalan mungkin belum terbarui. Geser pin di peta atau gunakan foto satelit jika tempat belum terdaftar.
                </p>
              </div>

              {/* Lokasi Populer */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800 block">
                  Lokasi Populer
                </Label>
                <div className="flex flex-wrap gap-1">
                  {PRESET_LOCATIONS.map((preset) => {
                    const isSelected =
                      Math.abs(selectedLat - preset.lat) < 0.0001 &&
                      Math.abs(selectedLng - preset.lng) < 0.0001;
                    return (
                      <button
                        key={preset.nama}
                        type="button"
                        onClick={() => {
                          setSelectedLat(preset.lat);
                          setSelectedLng(preset.lng);
                          setSearchQuery(preset.nama);
                          setShowDropdown(false);
                        }}
                        className={`px-2 py-1 rounded text-[11px] transition cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white font-semibold shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-medium"
                        }`}
                      >
                        {preset.nama}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail Koordinat */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-800 block">
                  Koordinat Titik Acara
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-medium block">
                      Latitude
                    </span>
                    <span className="font-mono font-semibold text-xs text-slate-900">
                      {selectedLat.toFixed(6)}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-medium block">
                      Longitude
                    </span>
                    <span className="font-mono font-semibold text-xs text-slate-900">
                      {selectedLng.toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pengaturan Radius Toleransi */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800">
                    Radius Area
                  </Label>
                  <span className="text-xs font-bold text-indigo-600 font-mono">
                    ±{radius} meter
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-md border border-slate-200">
                  {[50, 100, 250, 500].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRadius(r)}
                      className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                        radius === r
                          ? "bg-indigo-600 text-white font-semibold shadow-xs"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-xs text-slate-600 font-medium">Kustom:</span>
                  <Input
                    type="number"
                    min={10}
                    max={50000}
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value) || 100)}
                    className="h-7 text-xs bg-white border-slate-300 font-mono text-center flex-1 text-slate-800 font-semibold"
                  />
                  <span className="text-xs text-slate-600 font-medium">meter</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 shrink-0 sticky bottom-0 bg-white">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex-1 text-xs h-8"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs h-8 flex items-center justify-center"
              >
                Gunakan Titik Ini
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
