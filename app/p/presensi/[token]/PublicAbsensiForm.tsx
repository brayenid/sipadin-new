"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  RefreshCw,
  Search,
  User,
  Send,
  Loader2,
  SwitchCamera,
  Check,
  ChevronDown,
  AlertCircle,
  ShieldCheck,
  LogOut,
  Users,
  UserPlus,
  Ban,
} from "lucide-react";
import { StatusKehadiran } from "@prisma/client";
import { formatWita } from "@/lib/date-utils";
import { compressImage } from "@/lib/image-compression";
import { submitSelfAbsensi, submitSelfAbsensiPulang, searchPublicPesertaAgenda } from "@/app/actions/absensi";

interface PesertaItem {
  id: string;
  pegawaiId: string | null;
  nama: string;
  nip: string | null;
  jabatan: string;
  instansi: string;
  eselon: string | null;
  urutan: number;
  status: StatusKehadiran;
  isSelfInput?: boolean;
  fotoUrl?: string | null;
  namaPerwakilan?: string | null;
  jabatanPerwakilan?: string | null;
  waktuInput?: Date | string | null;
  waktuPulang?: Date | string | null;
  fotoPulangUrl?: string | null;
  latitudePulang?: number | null;
  longitudePulang?: number | null;
  accuracyPulang?: number | null;
  lokasiPulangText?: string | null;
}

interface PublicAgendaData {
  id: string;
  publicToken: string | null;
  namaKegiatan: string;
  hari: string | null;
  tanggal: Date | string;
  waktu: string | null;
  tempat: string;
  deskripsi: string | null;
  targetPeserta: string | null;
  targetKategori: string | null;
  status: string;
  isPublicActive: boolean;
  waktuBukaAbsen: Date | string | null;
  waktuTutupAbsen: Date | string | null;
  enableCheckOut?: boolean;
  waktuBukaPulang?: Date | string | null;
  waktuTutupPulang?: Date | string | null;
  requireLocation: boolean;
  requirePhoto: boolean;
  allowNonPeserta?: boolean;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  radiusMeter?: number | null;
  isRecurring?: boolean;
  recurringDays?: string[];
  recurringWeeks?: number[];
  cancelledSessions?: any;
  isCancelledSession?: boolean;
  cancelReason?: string;
  recurringJamBuka?: string | null;
  recurringJamTutup?: string | null;
  kategori?: string | null;
  peserta?: PesertaItem[];
  serverTime: string;
  timeStatus: "NOT_STARTED" | "OPEN" | "CLOSED";
  timeStatusPulang?: "NOT_STARTED" | "OPEN" | "CLOSED";
}

export default function PublicAbsensiForm({
  agenda,
}: {
  agenda: PublicAgendaData;
}) {
  // State Identitas
  const [selectedPesertaId, setSelectedPesertaId] = useState<string>("");
  const [selectedPeserta, setSelectedPeserta] = useState<PesertaItem | null>(null);
  const [searchResults, setSearchResults] = useState<PesertaItem[]>([]);
  const [isCustomPeserta, setIsCustomPeserta] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Debounce search query (250ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery("");
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Remote Search via API (Maksimal 10 hasil)
  useEffect(() => {
    if (!debouncedQuery.trim() || !agenda.publicToken) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    searchPublicPesertaAgenda(agenda.publicToken, debouncedQuery)
      .then((results) => {
        if (active) {
          setSearchResults(results as PesertaItem[]);
          setIsSearching(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Search error:", err);
          setSearchResults([]);
          setIsSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, agenda.publicToken]);

  // Close combobox when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Manual Fields
  const [manualNama, setManualNama] = useState("");
  const [manualNip, setManualNip] = useState("");
  const [manualJabatan, setManualJabatan] = useState("");
  const [manualInstansi, setManualInstansi] = useState("");

  // Status Kehadiran
  const [status, setStatus] = useState<StatusKehadiran>("HADIR");
  const [namaPerwakilan, setNamaPerwakilan] = useState("");
  const [jabatanPerwakilan, setJabatanPerwakilan] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Background Geolocation Tracking (Silently tracked in background)
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [showGpsHelpModal, setShowGpsHelpModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [gpsChecking, setGpsChecking] = useState(false);

  // Real-time Camera Stream Only (No gallery upload)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<any | null>(null);

  const hasSearch = debouncedQuery.length > 0;
  const filteredPeserta = searchResults;
  const activePeserta = selectedPeserta;

  // 1. Geolocation: Hanya baca di background jika sudah diizinkan sebelumnya
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setGpsLocation({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  accuracy: Math.round(pos.coords.accuracy),
                });
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera Management - Strictly Realtime
  const startCamera = async (mode: "user" | "environment" = facingMode) => {
    setCameraLoading(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 720 },
          height: { ideal: 960 },
          aspectRatio: { ideal: 3 / 4 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);

      // Pastikan stream terhubung jika video element sudah ada
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn("Play error:", e));
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      toast.error("Izin kamera diperlukan untuk mengambil foto presensi.");
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  // Efek untuk menghubungkan stream saat video element selesai dirender
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch((e) => console.warn("onloadedmetadata play error:", e));
      };
      video.play().catch((e) => console.warn("Direct play error:", e));
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;

    // Hitung aspect ratio tampilan viewfinder yang dilihat pengguna di layar secara presisi
    const containerRect = video.getBoundingClientRect();
    const targetAspect =
      containerRect.width > 0 && containerRect.height > 0
        ? containerRect.width / containerRect.height
        : vWidth / vHeight;
    const videoAspect = vWidth / vHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = vWidth;
    let sHeight = vHeight;

    if (videoAspect > targetAspect) {
      // Video sensor lebih lebar dari viewfinder (crop sisi kiri-kanan simetris)
      sWidth = Math.round(vHeight * targetAspect);
      sx = Math.round((vWidth - sWidth) / 2);
    } else {
      // Video sensor lebih tinggi dari viewfinder (crop sisi atas-bawah simetris)
      sHeight = Math.round(vWidth / targetAspect);
      sy = Math.round((vHeight - sHeight) / 2);
    }

    const canvas = document.createElement("canvas");
    // Atur resolusi kanvas proporsional terhadap framing yang dilihat pengguna
    canvas.width = Math.min(sWidth, 720);
    canvas.height = Math.round(canvas.width / targetAspect);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // Gambar hanya area yang terlihat pada viewfinder (WYSIWYG)
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        stopCamera();
        try {
          const compressed = await compressImage(blob, {
            maxWidth: 720,
            maxHeight: 960,
            quality: 0.75,
            mimeType: "image/jpeg",
          });
          setPhotoBlob(compressed.blob);
          setPhotoDataUrl(compressed.dataUrl);
        } catch (e) {
          toast.error("Gagal memproses foto");
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // Helper to obtain GPS Location forcefully
  const getFreshLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    setGpsChecking(true);
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        setGpsChecking(false);
        reject(new Error("Perangkat atau browser Anda tidak mendukung fitur geolokasi GPS"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          };
          setGpsLocation(loc);
          setGpsChecking(false);
          setShowGpsHelpModal(false);
          resolve(loc);
        },
        (err) => {
          setGpsChecking(false);
          let msg = "Gagal mengambil data lokasi GPS.";
          if (err.code === 1) {
            msg = "Izin akses lokasi (GPS) ditolak atau terblokir di browser Anda.";
            setShowGpsHelpModal(true);
          } else if (err.code === 2) {
            msg = "Titik lokasi GPS tidak ditemukan. Pastikan layanan Lokasi / GPS di HP/Komputer Anda sudah aktif.";
            setShowGpsHelpModal(true);
          } else if (err.code === 3) {
            msg = "Waktu deteksi GPS habis. Silakan aktifkan GPS dan coba lagi.";
          }
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const isAlreadyCheckedIn = Boolean(
    activePeserta &&
    activePeserta.waktuInput &&
    activePeserta.status !== "TIDAK_HADIR"
  );
  const isAlreadyCheckedOut = Boolean(
    activePeserta &&
    activePeserta.waktuPulang
  );
  const isCheckOutMode = Boolean(
    agenda.enableCheckOut &&
    isAlreadyCheckedIn &&
    !isAlreadyCheckedOut
  );

  // Submit Flow: Validasi Form & Buka Modal Persetujuan
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCustomPeserta && !selectedPesertaId) {
      toast.error("Pilih nama Anda atau instansi terlebih dahulu");
      return;
    }

    if (isAlreadyCheckedOut) {
      toast.info("Anda sudah melengkapi seluruh presensi (datang & pulang) pada kegiatan ini.");
      return;
    }

    if (isCheckOutMode) {
      if (agenda.requirePhoto && !photoBlob && !photoDataUrl) {
        toast.error("Foto selfie presensi pulang wajib diambil secara langsung dari kamera");
        return;
      }
      setShowConsentModal(true);
      return;
    }

    if (isCustomPeserta) {
      if (!manualNama.trim() || !manualJabatan.trim() || !manualInstansi.trim()) {
        toast.error("Nama lengkap, jabatan, dan instansi wajib diisi");
        return;
      }
    }

    if (status === "MEWAKILI" && !namaPerwakilan.trim()) {
      toast.error("Nama yang mewakili wajib diisi");
      return;
    }

    if (status === "IZIN" && !keterangan.trim()) {
      toast.error("Keterangan / alasan izin wajib diisi");
      return;
    }

    if (agenda.requirePhoto && status !== "IZIN" && !photoBlob && !photoDataUrl) {
      toast.error("Foto selfie presensi wajib diambil secara langsung dari kamera");
      return;
    }

    // Buka Modal Konfirmasi & Persetujuan
    setShowConsentModal(true);
  };

  // Eksekusi Pengiriman setelah Pegawai Menyetujui
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);

    // Paksaan & Validasi Akses Lokasi GPS (Dilewati jika status IZIN)
    let currentGps = gpsLocation;
    if (status !== "IZIN") {
      if (agenda.requireLocation || !currentGps) {
        try {
          currentGps = await getFreshLocation();
        } catch (locErr: any) {
          if (agenda.requireLocation) {
            setIsSubmitting(false);
            toast.error(locErr.message || "Akses lokasi (GPS) wajib diaktifkan untuk mengirim presensi.");
            return;
          }
        }
      }

      if (agenda.requireLocation && !currentGps) {
        setIsSubmitting(false);
        toast.error("Akses lokasi (GPS) wajib diaktifkan dan diizinkan pada browser untuk mengirim presensi.");
        return;
      }
    }

    // ALUR 1: SUBMIT PRESENSI PULANG
    if (isCheckOutMode) {
      try {
        let uploadedPhotoUrl: string | null = null;
        if (photoBlob) {
          if (photoBlob.size > 5 * 1024 * 1024) {
            throw new Error("Ukuran foto melebihi batas maksimal 5MB. Silakan ambil ulang foto.");
          }
          const formData = new FormData();
          formData.append("file", photoBlob, "selfie-pulang.jpg");
          formData.append("agendaId", agenda.id);
          formData.append("nama", `${activePeserta?.nama || "peserta"}-pulang`);

          const uploadRes = await fetch("/api/absensi/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.error || "Gagal mengunggah foto pulang");
          }

          const uploadJson = await uploadRes.json();
          uploadedPhotoUrl = uploadJson.url;
        }

        const res = await submitSelfAbsensiPulang({
          publicToken: agenda.publicToken!,
          pesertaId: selectedPesertaId,
          fotoPulangUrl: uploadedPhotoUrl,
          latitude: currentGps?.lat || null,
          longitude: currentGps?.lng || null,
          accuracy: currentGps?.accuracy || null,
          lokasiText: currentGps ? `${currentGps.lat.toFixed(6)}, ${currentGps.lng.toFixed(6)}` : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        });

        toast.success("Presensi pulang berhasil dicatat & diverifikasi!");
        setShowConsentModal(false);
        setSubmittedData({
          ...res.data,
          isPulang: true,
          nama: activePeserta?.nama,
          instansi: activePeserta?.instansi,
          jabatan: activePeserta?.jabatan,
          status: activePeserta?.status,
          waktuInput: activePeserta?.waktuInput,
          fotoUrl: activePeserta?.fotoUrl,
          waktuPulang: new Date(),
          fotoPulangUrl: uploadedPhotoUrl,
        });
      } catch (err: any) {
        toast.error(err.message || "Gagal mengirim presensi pulang");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ALUR 2: SUBMIT PRESENSI DATANG
    try {
      let uploadedPhotoUrl: string | null = null;
      const isIzin = status === "IZIN";

      if (photoBlob && !isIzin) {
        if (photoBlob.size > 5 * 1024 * 1024) {
          throw new Error("Ukuran foto melebihi batas maksimal 5MB. Silakan ambil ulang foto.");
        }

        const formData = new FormData();
        const participantName = isCustomPeserta ? manualNama : (activePeserta?.nama || "peserta");
        formData.append("file", photoBlob, "selfie.jpg");
        formData.append("agendaId", agenda.id);
        formData.append("nama", participantName);

        const uploadRes = await fetch("/api/absensi/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Gagal mengunggah foto");
        }

        const uploadJson = await uploadRes.json();
        uploadedPhotoUrl = uploadJson.url;
      }

      const payload: any = {
        publicToken: agenda.publicToken,
        status,
        namaPerwakilan: status === "MEWAKILI" ? namaPerwakilan : null,
        jabatanPerwakilan: status === "MEWAKILI" ? jabatanPerwakilan : null,
        keterangan: keterangan || null,
        fotoUrl: isIzin ? null : uploadedPhotoUrl,
        latitude: isIzin ? null : (currentGps?.lat || null),
        longitude: isIzin ? null : (currentGps?.lng || null),
        accuracy: isIzin ? null : (currentGps?.accuracy || null),
        lokasiText: isIzin ? null : (currentGps ? `${currentGps.lat.toFixed(6)}, ${currentGps.lng.toFixed(6)}` : null),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      if (!isCustomPeserta) {
        payload.pesertaId = selectedPesertaId;
        if (activePeserta) {
          payload.nama = activePeserta.nama;
          payload.nip = activePeserta.nip || null;
          payload.jabatan = activePeserta.jabatan;
          payload.instansi = activePeserta.instansi;
          payload.eselon = activePeserta.eselon;
        }
      } else {
        payload.nama = manualNama.trim();
        payload.nip = manualNip.trim() || null;
        payload.jabatan = manualJabatan.trim();
        payload.instansi = manualInstansi.trim();
        payload.eselon = "Umum";
      }

      const res = await submitSelfAbsensi(payload);

      toast.success("Presensi berhasil dikirim & diverifikasi");
      setShowConsentModal(false);
      setSubmittedData({
        ...res.data,
        nama: isCustomPeserta ? manualNama : activePeserta?.nama,
        instansi: isCustomPeserta ? manualInstansi : activePeserta?.instansi,
        jabatan: isCustomPeserta ? manualJabatan : activePeserta?.jabatan,
        fotoUrl: uploadedPhotoUrl,
        waktuInput: new Date(),
        status,
      });
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim presensi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. TAMPILAN BUKTI DIGITAL
  if (submittedData) {
    const isPulangReceipt = Boolean(submittedData.isPulang || submittedData.waktuPulang);

    return (
      <div className="min-h-screen bg-slate-50/60 py-8 px-4 flex justify-center items-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200/80 text-center p-6 sm:p-8">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wider">
            {isPulangReceipt ? "Presensi Pulang Berhasil Dicatat" : "Presensi Berhasil Dicatat"}
          </span>

          <h2 className="text-lg font-bold text-slate-900 mt-3 mb-1">
            Bukti Kehadiran Resmi
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Pemerintah Kabupaten Kutai Barat
          </p>

          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-left space-y-2.5 text-xs mb-5">
            <div className="border-b border-slate-200/70 pb-2">
              <span className="text-slate-500 block text-[11px]">Agenda:</span>
              <span className="font-semibold text-slate-900">
                {agenda.namaKegiatan}
              </span>
            </div>

            <div className="border-b border-slate-200/70 pb-2">
              <span className="text-slate-500 block text-[11px]">Nama Peserta:</span>
              <span className="font-bold text-slate-900">{submittedData.nama}</span>
            </div>

            <div className="border-b border-slate-200/70 pb-2">
              <span className="text-slate-500 block text-[11px]">Instansi / Jabatan:</span>
              <span className="text-slate-800">
                {submittedData.jabatan} - {submittedData.instansi}
              </span>
            </div>

            <div className="border-b border-slate-200/70 pb-2 flex justify-between items-center">
              <span className="text-slate-500">Status Kehadiran:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  submittedData.status === "HADIR"
                    ? "bg-emerald-100 text-emerald-800"
                    : submittedData.status === "MEWAKILI"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {submittedData.status}
              </span>
            </div>

            {submittedData.status === "MEWAKILI" && submittedData.namaPerwakilan && (
              <div className="border-b border-slate-200/70 pb-2 bg-blue-50/60 p-2 rounded">
                <span className="text-blue-700 block text-[11px]">Nama Perwakilan:</span>
                <span className="font-semibold text-blue-950">
                  {submittedData.namaPerwakilan} {submittedData.jabatanPerwakilan ? `(${submittedData.jabatanPerwakilan})` : ""}
                </span>
              </div>
            )}

            {/* Waktu Presensi Datang */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500">Waktu Datang:</span>
              <span className="font-mono text-slate-700">
                {submittedData.waktuInput ? `${formatWita(submittedData.waktuInput, "dd MMM yyyy, HH:mm")} WITA` : "-"}
              </span>
            </div>

            {/* Waktu Presensi Pulang */}
            {submittedData.waktuPulang && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                <span className="text-indigo-700 font-semibold">Waktu Pulang:</span>
                <span className="font-mono text-indigo-900 font-bold">
                  {formatWita(submittedData.waktuPulang, "dd MMM yyyy, HH:mm")} WITA
                </span>
              </div>
            )}

            {/* Foto Bukti */}
            <div className="flex justify-center items-center gap-3 pt-2">
              {submittedData.fotoUrl && (
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Foto Datang</span>
                  <img
                    src={submittedData.fotoUrl}
                    alt="Bukti Datang"
                    className="w-20 h-20 object-cover rounded-lg mx-auto border border-slate-200"
                  />
                </div>
              )}
              {submittedData.fotoPulangUrl && (
                <div className="text-center">
                  <span className="text-[10px] text-indigo-600 font-semibold block mb-1">Foto Pulang</span>
                  <img
                    src={submittedData.fotoPulangUrl}
                    alt="Bukti Pulang"
                    className="w-20 h-20 object-cover rounded-lg mx-auto border-2 border-indigo-200"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setSubmittedData(null);
              setSelectedPesertaId("");
              setSelectedPeserta(null);
              setSearchResults([]);
              setPhotoBlob(null);
              setPhotoDataUrl(null);
              setIsCustomPeserta(false);
              setManualNama("");
              setManualJabatan("");
              setManualInstansi("");
              setNamaPerwakilan("");
              setJabatanPerwakilan("");
              setKeterangan("");
            }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-[0_2px_8px_-3px_rgba(79,70,229,0.25)]"
          >
            Pengisian Baru untuk Rekan Lain
          </button>
        </div>
      </div>
    );
  }

  // 2. STATUS JADWAL: BELUM DIBUKA / TELAH DITUTUP
  if (agenda.timeStatus !== "OPEN") {
    const isNotStarted = agenda.timeStatus === "NOT_STARTED";
    return (
      <div className="min-h-screen bg-slate-50/60 py-8 px-4 flex justify-center items-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-200/80 p-6 sm:p-8 text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
              isNotStarted ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Clock className="w-7 h-7" />
          </div>

          <h1 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
            {isNotStarted ? "Presensi Belum Dibuka" : "Presensi Telah Ditutup"}
          </h1>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            {isNotStarted
              ? "Form presensi mandiri untuk kegiatan ini belum dimulai."
              : "Batas waktu pengisian presensi online untuk kegiatan ini telah berakhir."}
          </p>

          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-left text-xs space-y-2 mb-5">
            <div>
              <span className="text-slate-500 block text-[11px]">Nama Kegiatan:</span>
              <span className="font-semibold text-slate-900">{agenda.namaKegiatan}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Tempat:</span>
              <span className="text-slate-800">{agenda.tempat}</span>
            </div>
            {agenda.waktuBukaAbsen && (
              <div>
                <span className="text-slate-500 block text-[11px]">Jadwal Presensi:</span>
                <span className="font-mono text-slate-800">
                  {formatWita(agenda.waktuBukaAbsen, "dd MMM yyyy, HH:mm")} WITA
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-[0_2px_8px_-3px_rgba(79,70,229,0.25)]"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }

  // 3. FORM UTAMA PRESENSI MANDIRI (GOOGLE FORM / FORMAL STYLE)
  return (
    <div className="min-h-screen bg-slate-50/60 py-6 sm:py-10 px-3 sm:px-6">
      <div className="max-w-xl mx-auto space-y-3.5">
        {/* Logo Pemkab Kubar di Atas Form */}
        <div className="flex justify-center pb-1 select-none">
          <img
            src="/logo.png"
            alt="Logo Pemerintah Kabupaten Kutai Barat"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-xs"
          />
        </div>

        {/* Header Formal */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] border-t-4 border-t-indigo-600">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
            Daftar Hadir
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
            {agenda.namaKegiatan}
          </h1>

          {/* Subjudul: Tag Badge Persyaratan Presensi (Hanya muncul jika dicentang) */}
          {(agenda.requirePhoto || agenda.requireLocation || agenda.enableCheckOut) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {agenda.enableCheckOut && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <LogOut className="w-3 h-3" />
                  Presensi Datang & Pulang
                </span>
              )}

              {agenda.requirePhoto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                  <Camera className="w-3 h-3" />
                  Wajib Foto Selfie
                </span>
              )}

              {agenda.requireLocation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                  <MapPin className="w-3 h-3" />
                  Wajib Kunci GPS
                </span>
              )}
            </div>
          )}

          {agenda.deskripsi && (
            <p className="text-xs text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
              {agenda.deskripsi}
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {agenda.isRecurring
                  ? `Sesi Rutin (${agenda.recurringDays && agenda.recurringDays.length > 0 ? agenda.recurringDays.join(", ") : "Mingguan"})`
                  : `${agenda.hari || "Hari Ini"}, ${formatWita(agenda.tanggal, "dd MMMM yyyy")}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {agenda.waktu || (agenda.recurringJamBuka && agenda.recurringJamTutup ? `${agenda.recurringJamBuka} - ${agenda.recurringJamTutup} WITA` : "07:30 WITA")}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{agenda.tempat}</span>
            </div>
          </div>
        </div>

        {/* Banner Sesi Ditiadakan / Diliburkan */}
        {agenda.isCancelledSession ? (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 text-center space-y-3 shadow-xs animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-950">
                Sesi Presensi Hari Ini DITIADAKAN / DILIBURKAN
              </h2>
              <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto leading-relaxed font-medium">
                {agenda.cancelReason || "Sesi presensi ini ditiadakan oleh penyelenggara/administrator."}
              </p>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-rose-200/80 text-[11.5px] text-slate-600 max-w-sm mx-auto">
              Pengisian presensi online ditutup untuk tanggal ini. Seluruh aparatur yang terdaftar dikecualikan dari perhitungan alpa rekapitulasi.
            </div>
          </div>
        ) : (
          /* Form Isi */
          <form onSubmit={handleSubmit} className="space-y-3.5">
      
          {/* Banner Status Presensi Pulang */}
          {isCheckOutMode && (
            <div className="bg-indigo-50/90 border border-indigo-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-indigo-950 font-bold">
                <LogOut className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Konfirmasi Presensi Kepulangan</span>
              </div>
              <p className="text-indigo-800 text-[11.5px] leading-relaxed">
                Anda tercatat hadir (<strong>Datang</strong>) pada{" "}
                <span className="font-bold text-indigo-950 font-mono">
                  {formatWita(activePeserta?.waktuInput, "HH:mm")} WITA
                </span>
                . Silakan ambil foto selfie kepulangan untuk menyelesaikan presensi.
              </p>
            </div>
          )}

          {/* Banner Jika Sudah Lengkap Datang & Pulang */}
          {isAlreadyCheckedOut && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2 text-emerald-900 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Presensi Anda Sudah Lengkap</span>
              </div>
              <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                Data kehadiran dan kepulangan Anda pada kegiatan ini sudah tercatat di sistem:
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-slate-800">
                  🟢 Datang: {formatWita(activePeserta?.waktuInput, "HH:mm")} WITA
                </span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-indigo-800 font-bold">
                  🔵 Pulang: {formatWita(activePeserta?.waktuPulang, "HH:mm")} WITA
                </span>
              </div>
            </div>
          )}

          {/* Peringatan Validasi Lokasi (Hadir jika aturan GPS diaktifkan) */}
          {agenda.requireLocation && status !== "IZIN" && (
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Peringatan Validasi Lokasi GPS</span>
              </div>
              <p className="text-amber-800/90 leading-relaxed text-[11.5px]">
                Lokasi presensi Anda diperhitungkan dalam batas radius{" "}
                <span className="font-bold text-amber-950">
                  ±{agenda.radiusMeter || 100} meter
                </span>{" "}
                dari lokasi kegiatan{agenda.tempat ? ` (${agenda.tempat})` : ""}. Pastikan Anda mengaktifkan GPS dan berada di lokasi saat mengisi daftar hadir.
              </p>
            </div>
          )}

          {/* Card 1: Nama & OPD */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Nama Pegawai <span className="text-red-500">*</span>
              </label>

              {agenda.allowNonPeserta !== false && !isCheckOutMode && !isAlreadyCheckedOut && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomPeserta(!isCustomPeserta);
                    setSelectedPesertaId("");
                    setSelectedPeserta(null);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  {isCustomPeserta ? "Kembali ke Daftar Pegawai" : "Nama Tidak Ada di Daftar?"}
                </button>
              )}
            </div>

            {!isCustomPeserta ? (
              <div ref={dropdownRef} className="relative">
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center justify-between cursor-pointer text-xs hover:bg-slate-100 transition"
                >
                  {activePeserta ? (
                    <div className="truncate text-left flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{activePeserta.nama}</span>
                        {activePeserta.waktuPulang ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Lengkap (Datang & Pulang)
                          </span>
                        ) : activePeserta.status !== "TIDAK_HADIR" ? (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              activePeserta.status === "HADIR"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : activePeserta.status === "MEWAKILI"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sudah Datang ({activePeserta.status === "HADIR" ? "Hadir" : activePeserta.status === "MEWAKILI" ? "Mewakili" : "Izin"})
                          </span>
                        ) : null}
                      </div>
                      <div className="text-slate-500 text-[11px] truncate mt-0.5">
                        {activePeserta.jabatan} • {activePeserta.instansi}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      Cari Nama Pegawai / NIP...
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200/80 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Ketik min. 2 huruf nama/NIP..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
                      {isSearching ? (
                        <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          Mencari data pegawai...
                        </div>
                      ) : !hasSearch ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          Ketik nama pegawai atau NIP untuk mencari
                        </div>
                      ) : filteredPeserta.length === 0 ? (
                        <div className="p-4 text-center text-xs space-y-2.5">
                          <p className="text-slate-500">Tidak menemukan nama yang cocok</p>
                          {agenda.allowNonPeserta !== false && !isCheckOutMode && !isAlreadyCheckedOut && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomPeserta(true);
                                setIsDropdownOpen(false);
                                setSelectedPesertaId("");
                                setSelectedPeserta(null);
                                if (searchQuery.trim()) {
                                  setManualNama(searchQuery.trim());
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Tambahkan Manual
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredPeserta.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPesertaId(p.id);
                              setSelectedPeserta(p);
                              setIsDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`p-2.5 rounded-lg cursor-pointer text-xs transition flex items-center justify-between ${
                              selectedPesertaId === p.id
                                ? "bg-indigo-50 text-indigo-900 font-semibold"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold">{p.nama}</span>
                                {p.waktuPulang ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Lengkap
                                  </span>
                                ) : p.status !== "TIDAK_HADIR" ? (
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold border ${
                                      p.status === "HADIR"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : p.status === "MEWAKILI"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    {p.status === "HADIR" ? "Hadir" : p.status === "MEWAKILI" ? "Mewakili" : "Izin"}
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {p.jabatan} • {p.instansi}
                              </div>
                            </div>
                            {selectedPesertaId === p.id && (
                              <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap beserta gelar"
                    value={manualNama}
                    onChange={(e) => setManualNama(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      NIP (Opsional):
                    </label>
                    <input
                      type="text"
                      placeholder="19850101 201001 1 001"
                      value={manualNip}
                      onChange={(e) => setManualNip(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jabatan <span className="text-red-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jabatan"
                      value={manualJabatan}
                      onChange={(e) => setManualJabatan(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Instansi / OPD / Kecamatan <span className="text-red-500">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Perangkat Daerah / Kantor"
                    value={manualInstansi}
                    onChange={(e) => setManualInstansi(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Status Kehadiran (Hanya untuk presensi Datang) */}
          {!isCheckOutMode && !isAlreadyCheckedOut && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Status Kehadiran <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("HADIR")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    status === "HADIR"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Hadir
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("MEWAKILI")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    status === "MEWAKILI"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Mewakili
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatus("IZIN");
                    stopCamera();
                  }}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    status === "IZIN"
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Izin
                </button>
              </div>

              {/* Field Mewakili */}
              {status === "MEWAKILI" && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 pt-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nama Yang Mewakili <span className="text-red-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama pegawai / staf pengganti"
                      value={namaPerwakilan}
                      onChange={(e) => setNamaPerwakilan(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jabatan Yang Mewakili:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sekretaris / Kepala Bidang"
                      value={jabatanPerwakilan}
                      onChange={(e) => setJabatanPerwakilan(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Keterangan / Nomor Surat Tugas:
                    </label>
                    <input
                      type="text"
                    placeholder="Catatan perwakilan..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Field Izin */}
            {status === "IZIN" && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 pt-3">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Alasan / Keterangan Izin <span className="text-red-500">*</span>:
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Perjalanan dinas luar kota / Sakit..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>
          )}

          {/* Card 3: Foto Selfie Real-time (Wajib Kamera Langsung hanya untuk HADIR & MEWAKILI) */}
          {agenda.requirePhoto && (status !== "IZIN" || isCheckOutMode) && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 select-none cursor-default">
                  {isCheckOutMode ? "Foto Selfie Presensi Pulang" : "Foto Selfie Kehadiran"} <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Pastikan seluruh wajah terlihat jelas menghadap kamera. <strong className="text-slate-700 font-semibold">Jangan tutupi wajah</strong> agar bukti kehadiran valid.
                </p>
              </div>

              <div className="bg-slate-950 rounded-2xl overflow-hidden aspect-[3/4] max-w-xs sm:max-w-sm mx-auto flex items-center justify-center relative shadow-inner">
                {isCameraActive ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                    />

                    {/* Layer Panduan Siluet / Posisi Wajah Oval */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
                      <div className="w-[175px] h-[230px] sm:w-[195px] sm:h-[250px] rounded-[50%] border-2 border-white/70 border-dashed shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center relative">
                        {/* Upper Crosshair mark */}
                        <div className="w-3 h-0.5 absolute top-2 rounded-full bg-white/70" />
                        {/* Lower Crosshair mark */}
                        <div className="w-3 h-0.5 absolute bottom-2 rounded-full bg-white/70" />
                      </div>

                      {/* Badge Panduan Posisi Wajah */}
                      <div className="mt-3 px-3.5 py-1.5 rounded-full border border-white/20 bg-black/70 text-white/90 text-[11px] font-medium tracking-wide shadow-md backdrop-blur-md">
                        Posisikan Wajah di Dalam Garis
                      </div>
                    </div>

                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-20 px-4">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 transition cursor-pointer"
                        title="Putar Kamera"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="relative p-3.5 rounded-full bg-white text-slate-900 shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
                        title="Ambil Foto"
                      >
                        <Camera className="w-6 h-6" />
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 transition text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </>
                ) : photoDataUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {/* Top confirmation pill */}
                    <div className="absolute top-3 inset-x-3 z-10 flex justify-center pointer-events-none">
                      <span className="text-[10px] font-medium text-emerald-200 bg-emerald-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-sm text-center">
                        ✓ Foto berhasil diambil. Pastikan wajah tidak terhalang.
                      </span>
                    </div>

                    <img
                      src={photoDataUrl}
                      alt="Hasil Foto"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
                      <button
                        type="button"
                        onClick={() => startCamera(facingMode)}
                        className="px-3.5 py-1.5 bg-black/70 hover:bg-black/90 text-white text-xs font-semibold rounded-lg backdrop-blur transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Ambil Ulang Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2.5">
                    <Camera className="w-10 h-10 mx-auto text-slate-500" />
                    <p className="text-xs text-slate-300">
                      Ambil foto selfie langsung di ruang kegiatan
                    </p>
                    <button
                      type="button"
                      disabled={cameraLoading}
                      onClick={() => startCamera("user")}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-[0_2px_8px_-3px_rgba(79,70,229,0.3)]"
                    >
                      {cameraLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      Buka Kamera
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting || isAlreadyCheckedOut}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_2px_8px_-3px_rgba(79,70,229,0.35)] transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan Presensi...
                </>
              ) : isAlreadyCheckedOut ? (
                <>
                  <Check className="w-4 h-4" />
                  Presensi Lengkap (Selesai)
                </>
              ) : isCheckOutMode ? (
                <>
                  <LogOut className="w-4 h-4" />
                  Kirim Presensi Pulang
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Data Presensi
                </>
              )}
            </button>
          </div>
        </form>
        )}

        {/* Watermark Logo SIPADIN di Bagian Bawah */}
        <div className="pt-6 pb-2 flex flex-col items-center justify-center space-y-1 select-none pointer-events-none">
          <img
            src="/sipadin.png"
            alt="SIPADIN"
            className="h-8 sm:h-9 w-auto object-contain grayscale opacity-20"
          />
          <span className="text-[10.5px] font-medium text-slate-400/90 tracking-wide">
            Bagian Organisasi
          </span>
        </div>
      </div>

      {/* Modal Bantuan Izin Lokasi GPS (Edge / Chrome / Mobile) */}
      {showGpsHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-slate-800">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Akses Lokasi (GPS) Diperlukan</h3>
                <p className="text-[11px] text-slate-500">Izin lokasi belum aktif atau diblokir di browser</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">
                Untuk Microsoft Edge, Chrome, atau Browser Ponsel:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11.5px] leading-relaxed">
                <li>
                  Klik ikon <strong className="text-indigo-700">Gembok / Info Situs</strong> di samping kiri kolom URL browser (Address Bar).
                </li>
                <li>
                  Ubah izin <strong>Lokasi (Location)</strong> menjadi <strong className="text-emerald-700">Izinkan (Allow)</strong> atau aktifkan saklarnya.
                </li>
                <li>
                  Pastikan <strong>GPS / Layanan Lokasi di HP/Komputer</strong> Anda dalam keadaan ON.
                </li>
              </ol>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGpsHelpModal(false)}
                className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={gpsChecking}
                onClick={async () => {
                  try {
                    await getFreshLocation();
                    toast.success("Lokasi GPS berhasil terverifikasi!");
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {gpsChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi & Persetujuan Pengambilan Data Presensi */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-slate-800 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isCheckOutMode ? "Konfirmasi Presensi Pulang" : "Konfirmasi & Persetujuan Presensi"}
                </h3>
                <p className="text-[11px] text-slate-500">Pernyataan pengambilan data bukti kehadiran</p>
              </div>
            </div>

            {/* Ringkasan Data Peserta */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Nama Pegawai:</span>
                <span className="font-bold text-slate-900">
                  {isCustomPeserta ? manualNama : (activePeserta?.nama || "-")}
                </span>
              </div>
              <div className="border-t border-slate-200/60 pt-1.5">
                <span className="text-[11px] text-slate-500 block">Instansi & Jabatan:</span>
                <span className="text-slate-800">
                  {isCustomPeserta
                    ? `${manualJabatan} • ${manualInstansi}`
                    : `${activePeserta?.jabatan} • ${activePeserta?.instansi}`}
                </span>
              </div>
              {/* Jenis Presensi: Menonjol di Tengah & Berukuran Lebih Besar */}
              <div className="border-t border-slate-200/60 pt-3 flex flex-col items-center justify-center text-center gap-1.5 pb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Jenis Presensi
                </span>
                <div
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm sm:text-base border shadow-2xs ${
                    isCheckOutMode
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : status === "HADIR"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : status === "MEWAKILI"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {isCheckOutMode ? (
                    <>
                      <LogOut className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Presensi Pulang</span>
                    </>
                  ) : status === "HADIR" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Presensi Datang (Hadir)</span>
                    </>
                  ) : status === "MEWAKILI" ? (
                    <>
                      <Users className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Presensi Datang (Mewakili: {namaPerwakilan})</span>
                    </>
                  ) : (
                    <span>Izin / Tidak Hadir</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pernyataan Persetujuan Resmi */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                Persetujuan Penggunaan Data
              </p>
              <p className="text-amber-800/90">
                {status === "IZIN" && !isCheckOutMode ? (
                  <>
                    Dengan menekan tombol <strong>&quot;Setuju &amp; Kirim&quot;</strong>, Anda menyatakan secara sadar bahwa data identitas dan keterangan izin yang dikirimkan adalah benar serta bersedia digunakan sebagai dokumen laporan resmi kegiatan Pemerintah Kabupaten Kutai Barat.
                  </>
                ) : (
                  <>
                    Dengan menekan tombol <strong>&quot;Setuju &amp; Kirim&quot;</strong>, Anda menyatakan secara sadar bahwa data identitas, foto selfie kehadiran, dan titik koordinat lokasi (GPS) yang dikirimkan adalah benar serta bersedia digunakan sebagai dokumen bukti kehadiran resmi kegiatan Pemerintah Kabupaten Kutai Barat.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConsentModal(false)}
                className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Setuju & Kirim
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
