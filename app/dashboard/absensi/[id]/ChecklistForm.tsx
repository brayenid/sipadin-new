"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  Printer,
  UserPlus,
  ExternalLink,
  Trash2,
  Building2,
  Search,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  QrCode,
  Copy,
  Check,
  Camera,
  MapPin,
  Clock,
  Globe,
  Radio,
  FileSpreadsheet,
  FileText,
  Crosshair,
  Settings,
  Users,
  RefreshCw,
  LogOut,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  updateKehadiranPesertaBatch,
  deletePesertaFromAgenda,
  bulkDeletePesertaFromAgenda,
  togglePublicAbsensiActive,
  updateAgendaAbsensi,
  deleteAgendaAbsensi,
} from "@/app/actions/absensi";
import { StatusAgendaAbsensi, StatusKehadiran } from "@prisma/client";
import { formatWita, calculatePresensiWindow } from "@/lib/date-utils";
import { generateSlug } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import CetakModal from "./CetakModal";
import ExportLaporanAgendaModal from "./ExportLaporanAgendaModal";
import ModalTambahPeserta from "./ModalTambahPeserta";
import QrCodeModal from "./QrCodeModal";
import FotoPreviewModal from "./FotoPreviewModal";
import PetaSebaranGps from "./PetaSebaranGps";
import ModalMapPicker from "./ModalMapPicker";

type Peserta = {
  id: string;
  pegawaiId: string | null;
  nama: string;
  nip: string | null;
  jabatan: string;
  instansi: string;
  eselon: string | null;
  urutan: number;
  status: StatusKehadiran;
  namaPerwakilan: string | null;
  jabatanPerwakilan: string | null;
  keterangan: string | null;
  fotoUrl: string | null;
  waktuInput: Date | string | null;
  waktuPulang?: Date | string | null;
  fotoPulangUrl?: string | null;
  latitudePulang?: number | null;
  longitudePulang?: number | null;
  accuracyPulang?: number | null;
  lokasiPulangText?: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  lokasiText: string | null;
  isSelfInput: boolean;
  faceScore?: number | null;
  faceMatchStatus?: string | null;
};

type Agenda = {
  id: string;
  publicToken: string | null;
  namaKegiatan: string;
  hari: string | null;
  tanggal: Date;
  waktu: string | null;
  tempat: string;
  deskripsi: string | null;
  targetPeserta: string | null;
  targetKategori: string | null;
  status: StatusAgendaAbsensi;
  isPublicActive: boolean;
  waktuBukaAbsen: Date | null;
  waktuTutupAbsen: Date | null;
  enableCheckOut?: boolean;
  waktuBukaPulang?: Date | null;
  waktuTutupPulang?: Date | null;
  requireLocation: boolean;
  requirePhoto: boolean;
  allowNonPeserta?: boolean;
  targetLatitude?: number | null;
  targetLongitude?: number | null;
  radiusMeter?: number | null;
  picPegawaiId?: string | null;
  picNama?: string | null;
  picNip?: string | null;
  picJabatan?: string | null;
  driveUrl: string | null;
  peserta: Peserta[];
};

export default function ChecklistForm({
  agenda,
  allPegawai,
}: {
  agenda: Agenda;
  allPegawai: {
    id: string;
    nip: string | null;
    nama: string;
    jabatan: string;
    instansi: string;
    eselon: string | null;
    wajibAbsenOpd: boolean;
  }[];
}) {
  const router = useRouter();
  const [pesertaList, setPesertaList] = useState<Peserta[]>(agenda.peserta);
  const [statusAgenda, setStatusAgenda] = useState<StatusAgendaAbsensi>(agenda.status);
  const [isPublicActive, setIsPublicActive] = useState<boolean>(agenda.isPublicActive ?? true);
  const [driveUrl, setDriveUrl] = useState<string>(agenda.driveUrl || "");
  const [tanggal, setTanggal] = useState<string>(
    agenda.tanggal ? formatWita(agenda.tanggal, "yyyy-MM-dd") : ""
  );
  const parseWaktuParts = (waktuStr: string | null | undefined): { jamMulai: string; jamSelesai: string } => {
    if (!waktuStr) return { jamMulai: "09:00", jamSelesai: "" };
    const matches = waktuStr.match(/(\d{1,2}[:.]\d{2})/g);
    if (matches && matches.length >= 2) {
      return { jamMulai: matches[0].replace(".", ":"), jamSelesai: matches[1].replace(".", ":") };
    } else if (matches && matches.length === 1) {
      return { jamMulai: matches[0].replace(".", ":"), jamSelesai: "" };
    }
    return { jamMulai: "09:00", jamSelesai: "" };
  };

  const initialWaktuParts = parseWaktuParts(agenda.waktu);
  const [jamMulai, setJamMulai] = useState<string>(initialWaktuParts.jamMulai);
  const [jamSelesai, setJamSelesai] = useState<string>(initialWaktuParts.jamSelesai);
  const [waktu, setWaktu] = useState<string>(agenda.waktu || "09:00 WITA");
  const [tempat, setTempat] = useState<string>(agenda.tempat || "");
  const [deskripsi, setDeskripsi] = useState<string>(agenda.deskripsi || "");
  const [targetLatitude, setTargetLatitude] = useState<number | null>(agenda.targetLatitude ?? null);
  const [targetLongitude, setTargetLongitude] = useState<number | null>(agenda.targetLongitude ?? null);
  const [radiusMeter, setRadiusMeter] = useState<number>(agenda.radiusMeter || 100);
  const [requireLocation, setRequireLocation] = useState<boolean>(agenda.requireLocation ?? true);
  const [requirePhoto, setRequirePhoto] = useState<boolean>(agenda.requirePhoto ?? true);
  const [allowNonPeserta, setAllowNonPeserta] = useState<boolean>(agenda.allowNonPeserta ?? true);
  const [enableCheckOut, setEnableCheckOut] = useState<boolean>(agenda.enableCheckOut ?? false);
  const [targetKategori, setTargetKategori] = useState<string>(agenda.targetKategori || "SEMUA_OPD");
  const [targetPeserta, setTargetPeserta] = useState<string>(
    agenda.targetPeserta || "Seluruh Perangkat Daerah / Pegawai"
  );
  const [publicToken, setPublicToken] = useState<string>(agenda.publicToken || "");
  const [picPegawaiId, setPicPegawaiId] = useState<string | null>(agenda.picPegawaiId || null);
  const [picNama, setPicNama] = useState<string>(agenda.picNama || "");
  const [picNip, setPicNip] = useState<string>(agenda.picNip || "");
  const [picJabatan, setPicJabatan] = useState<string>(agenda.picJabatan || "");
  const [gettingVenueGps, setGettingVenueGps] = useState(false);

  const handleJamMulaiChange = (newMulai: string) => {
    setJamMulai(newMulai);
    const formattedWaktu = `${newMulai}${jamSelesai ? ` - ${jamSelesai}` : ""} WITA`;
    setWaktu(formattedWaktu);
    const windowTimes = calculatePresensiWindow(newMulai, jamSelesai);
    setJamBuka(windowTimes.jamBuka);
    setJamTutup(windowTimes.jamTutup);
  };

  const handleJamSelesaiChange = (newSelesai: string) => {
    setJamSelesai(newSelesai);
    const formattedWaktu = `${jamMulai}${newSelesai ? ` - ${newSelesai}` : ""} WITA`;
    setWaktu(formattedWaktu);
    const windowTimes = calculatePresensiWindow(jamMulai, newSelesai);
    setJamTutup(windowTimes.jamTutup);
  };

  const handleTargetKategoriChange = (kat: string) => {
    let targetLabel = "Seluruh Perangkat Daerah / Pegawai";
    if (kat === "SEMUA_OPD") targetLabel = "Seluruh Perangkat Daerah / Pegawai";
    else if (kat === "ESELON_2_3") targetLabel = "OPD Utama (Eselon II & III)";
    else if (kat === "ESELON_2") targetLabel = "Khusus Pegawai Eselon II (Kepala OPD)";
    else if (kat === "ESELON_3") targetLabel = "Khusus Pegawai Eselon III (Sekretaris / Kabid)";
    else if (kat === "KECAMATAN") targetLabel = "Camat dan Perangkat Kecamatan";

    setTargetKategori(kat);
    setTargetPeserta(targetLabel);
  };

  // Sync state saat prop agenda berubah
  React.useEffect(() => {
    setPesertaList(agenda.peserta || []);
    setIsPublicActive(agenda.isPublicActive);
    setStatusAgenda(agenda.status);
    setDriveUrl(agenda.driveUrl || "");
    setTanggal(agenda.tanggal ? new Date(agenda.tanggal).toISOString().split("T")[0] : "");
    const parts = parseWaktuParts(agenda.waktu);
    setJamMulai(parts.jamMulai);
    setJamSelesai(parts.jamSelesai);
    setWaktu(agenda.waktu || "09:00 WITA");
    setTempat(agenda.tempat || "");
    setDeskripsi(agenda.deskripsi || "");
    setTargetLatitude(agenda.targetLatitude ?? null);
    setTargetLongitude(agenda.targetLongitude ?? null);
    setRadiusMeter(agenda.radiusMeter || 100);
    setRequireLocation(agenda.requireLocation ?? true);
    setRequirePhoto(agenda.requirePhoto ?? true);
    setAllowNonPeserta(agenda.allowNonPeserta ?? true);
    setEnableCheckOut(agenda.enableCheckOut ?? false);
    setTargetKategori(agenda.targetKategori || "SEMUA_OPD");
    setTargetPeserta(agenda.targetPeserta || "Seluruh Perangkat Daerah / Pegawai");
    setPublicToken(agenda.publicToken || "");
    setPicPegawaiId(agenda.picPegawaiId || null);
    setPicNama(agenda.picNama || "");
    setPicNip(agenda.picNip || "");
    setPicJabatan(agenda.picJabatan || "");
    setJamBuka(agenda.waktuBukaAbsen ? formatWita(agenda.waktuBukaAbsen, "HH:mm") : "07:30");
    setJamTutup(agenda.waktuTutupAbsen ? formatWita(agenda.waktuTutupAbsen, "HH:mm") : "14:00");
  }, [agenda]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicAbsenUrl = agenda.publicToken ? `${baseUrl}/p/absensi/${agenda.publicToken}` : "";

  // Ubah status kehadiran satuan
  const handleStatusChange = (id: string, newStatus: StatusKehadiran) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
  };

  // Set / Hapus Waktu Pulang Manual Satuan
  const handleSetPulangManual = (id: string, waktuPulangVal: Date | null) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, waktuPulang: waktuPulangVal } : p))
    );
    if (waktuPulangVal) {
      toast.success("Waktu kepulangan peserta berhasil disetel");
    } else {
      toast.info("Waktu kepulangan peserta dibatalkan");
    }
  };

  const [activeTab, setActiveTab] = useState<"DAFTAR_HADIR" | "PETA_GPS" | "EDIT_AGENDA">("EDIT_AGENDA");

  const handleTabChange = (tab: "DAFTAR_HADIR" | "PETA_GPS" | "EDIT_AGENDA") => {
    setActiveTab(tab);
    const hashMap: Record<string, string> = {
      EDIT_AGENDA: "edit",
      DAFTAR_HADIR: "daftar-hadir",
      PETA_GPS: "peta-gps",
    };
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${hashMap[tab] || "edit"}`);
    }
  };

  // Sinkronisasi Tab dengan URL Hash & Default ke EDIT_AGENDA
  React.useEffect(() => {
    const parseHashToTab = (hashStr: string): "DAFTAR_HADIR" | "PETA_GPS" | "EDIT_AGENDA" | null => {
      const h = hashStr.replace("#", "").toLowerCase();
      if (h === "daftar-hadir" || h === "kehadiran" || h === "peserta") {
        return "DAFTAR_HADIR";
      }
      if (h === "peta-gps" || h === "peta" || h === "gps") {
        return "PETA_GPS";
      }
      if (h === "edit" || h === "edit-agenda") {
        return "EDIT_AGENDA";
      }
      return null;
    };

    if (typeof window !== "undefined") {
      const tabFromHash = parseHashToTab(window.location.hash);
      if (tabFromHash) {
        setActiveTab(tabFromHash);
      } else {
        // Tab pertama kali masuk: Edit Agenda
        setActiveTab("EDIT_AGENDA");
        window.history.replaceState(null, "", "#edit");
      }

      const handleHashChange = () => {
        const currentTab = parseHashToTab(window.location.hash);
        if (currentTab) {
          setActiveTab(currentTab);
        }
      };

      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  const [jamBuka, setJamBuka] = useState<string>(
    agenda.waktuBukaAbsen ? formatWita(agenda.waktuBukaAbsen, "HH:mm") : "07:30"
  );
  const [jamTutup, setJamTutup] = useState<string>(
    agenda.waktuTutupAbsen ? formatWita(agenda.waktuTutupAbsen, "HH:mm") : "14:00"
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const [saving, setSaving] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [isCetakOpen, setIsCetakOpen] = useState(false);
  const [isLaporanPdfOpen, setIsLaporanPdfOpen] = useState(false);
  const [isTambahOpen, setIsTambahOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectedFotoPeserta, setSelectedFotoPeserta] = useState<Peserta | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [deletePesertaTarget, setDeletePesertaTarget] = useState<{ id: string; nama: string } | null>(null);
  const [deletingPeserta, setDeletingPeserta] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bulk selection & remove state
  const [selectedPesertaIds, setSelectedPesertaIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(50);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Data presensi berhasil disegarkan");
    }, 600);
  };

  // Ubah perwakilan & simpan
  const handlePerwakilanChange = (
    id: string,
    field: "namaPerwakilan" | "jabatanPerwakilan" | "keterangan",
    val: string
  ) => {
    setPesertaList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  // Konfirmasi & Hapus peserta via Custom AlertDialog
  const [isDeleteAgendaOpen, setIsDeleteAgendaOpen] = useState(false);
  const [deletingAgenda, setDeletingAgenda] = useState(false);

  const handleConfirmDeleteAgenda = async () => {
    setDeletingAgenda(true);
    try {
      const res = await deleteAgendaAbsensi(agenda.id);
      if (res?.success) {
        toast.success("Agenda presensi berhasil dihapus");
        router.push("/dashboard/absensi");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus agenda");
    } finally {
      setDeletingAgenda(false);
      setIsDeleteAgendaOpen(false);
    }
  };

  const handleConfirmDeletePeserta = async () => {
    if (!deletePesertaTarget) return;
    setDeletingPeserta(true);
    try {
      await deletePesertaFromAgenda(agenda.id, deletePesertaTarget.id);
      setPesertaList((prev) => prev.filter((p) => p.id !== deletePesertaTarget.id));
      setSelectedPesertaIds((prev) => prev.filter((id) => id !== deletePesertaTarget.id));
      toast.success(`Peserta ${deletePesertaTarget.nama} berhasil dihapus`);
      setDeletePesertaTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus peserta");
    } finally {
      setDeletingPeserta(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedPesertaIds.length === 0) return;
    setDeletingBulk(true);
    try {
      const count = selectedPesertaIds.length;
      await bulkDeletePesertaFromAgenda(agenda.id, selectedPesertaIds);
      setPesertaList((prev) => prev.filter((p) => !selectedPesertaIds.includes(p.id)));
      setSelectedPesertaIds([]);
      setIsBulkDeleteOpen(false);
      toast.success(`${count} peserta berhasil dihapus dari agenda`);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus peserta terpilih");
    } finally {
      setDeletingBulk(false);
    }
  };

  // Toggle Public Attendance Active
  const handleTogglePublicActive = async () => {
    setTogglingPublic(true);
    const nextState = !isPublicActive;
    try {
      await togglePublicAbsensiActive(agenda.id, nextState);
      setIsPublicActive(nextState);
      toast.success(
        nextState
          ? "Form presensi mandiri online telah DIBUKA"
          : "Form presensi mandiri online telah DITUTUP"
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status presensi publik");
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleCopyPublicLink = () => {
    if (!publicAbsenUrl) return;
    navigator.clipboard.writeText(publicAbsenUrl);
    setCopiedLink(true);
    toast.success("Tautan presensi online berhasil disalin");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleGetVenueLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Fitur geolokasi GPS tidak didukung di browser ini");
      return;
    }
    setGettingVenueGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTargetLatitude(pos.coords.latitude);
        setTargetLongitude(pos.coords.longitude);
        setGettingVenueGps(false);
        toast.success("Titik koordinat lokasi saat ini berhasil diambil!");
      },
      (err) => {
        setGettingVenueGps(false);
        toast.error("Gagal mendeteksi lokasi GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Simpan data batch & metadata agenda
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateKehadiranPesertaBatch(
        agenda.id,
        pesertaList.map((p) => ({
          id: p.id,
          status: p.status,
          namaPerwakilan: p.namaPerwakilan,
          jabatanPerwakilan: p.jabatanPerwakilan,
          keterangan: p.keterangan,
          waktuPulang: p.waktuPulang,
        })),
        {
          driveUrl: driveUrl.trim() || undefined,
          status: statusAgenda,
          tanggal: tanggal || undefined,
          waktu: waktu.trim() || undefined,
          tempat: tempat.trim() || undefined,
          deskripsi: deskripsi.trim() || null,
          jamBuka: jamBuka.trim() || undefined,
          jamTutup: jamTutup.trim() || undefined,
          enableCheckOut,
          targetLatitude: targetLatitude ?? null,
          targetLongitude: targetLongitude ?? null,
          radiusMeter: radiusMeter || 100,
          requireLocation,
          requirePhoto,
          allowNonPeserta: allowNonPeserta,
          targetKategori: targetKategori || undefined,
          targetPeserta: targetPeserta.trim() || undefined,
          publicToken: publicToken.trim() || undefined,
          picPegawaiId: picPegawaiId || null,
          picNama: picNama.trim() || null,
          picNip: picNip.trim() || null,
          picJabatan: picJabatan.trim() || null,
        }
      );

      toast.success("Data agenda dan absensi berhasil diperbarui");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data absensi");
    } finally {
      setSaving(false);
    }
  };

  // Perhitungan Realtime
  const totalPeserta = pesertaList.length;
  const countHadir = pesertaList.filter((p) => p.status === "HADIR").length;
  const countMewakili = pesertaList.filter((p) => p.status === "MEWAKILI").length;
  const countTidakHadir = pesertaList.filter((p) => p.status === "TIDAK_HADIR").length;
  const countIzin = pesertaList.filter((p) => p.status === "IZIN").length;
  const countSelfInput = pesertaList.filter((p) => p.isSelfInput).length;

  const persentaseTotal =
    totalPeserta > 0
      ? Math.round(((countHadir + countMewakili) / totalPeserta) * 100)
      : 0;

  // Filter list
  const filteredPeserta = pesertaList.filter((p) => {
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.jabatan.toLowerCase().includes(search.toLowerCase()) ||
      p.instansi.toLowerCase().includes(search.toLowerCase()) ||
      (p.namaPerwakilan && p.namaPerwakilan.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = filterStatus === "ALL" || p.status === filterStatus;

    return matchSearch && matchStatus;
  });

  // Reset visible count saat filter/search berubah
  React.useEffect(() => {
    setVisibleCount(50);
  }, [search, filterStatus]);

  // Observer untuk auto load more (infinite scroll)
  React.useEffect(() => {
    if (activeTab !== "DAFTAR_HADIR") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 50, filteredPeserta.length));
        }
      },
      { rootMargin: "300px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [activeTab, filteredPeserta.length]);

  const displayedPeserta = filteredPeserta.slice(0, visibleCount);

  // Status Seleksi
  const allFilteredSelected =
    filteredPeserta.length > 0 &&
    filteredPeserta.every((p) => selectedPesertaIds.includes(p.id));

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = filteredPeserta.map((p) => p.id);
      setSelectedPesertaIds(Array.from(new Set([...selectedPesertaIds, ...allFilteredIds])));
    } else {
      const filteredIdSet = new Set(filteredPeserta.map((p) => p.id));
      setSelectedPesertaIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    }
  };

  const handleToggleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPesertaIds((prev) => [...prev, id]);
    } else {
      setSelectedPesertaIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleExportExcel = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const headers = [
      "No",
      "Nama Pegawai",
      "NIP",
      "Jabatan",
      "Perangkat Daerah / Instansi",
      "Eselon",
      "Status Kehadiran",
      "Nama Perwakilan",
      "Jabatan Perwakilan",
      "Keterangan",
      "Metode Presensi",
      "Waktu Datang",
      "Lokasi Datang (GPS)",
      "URL Foto Datang",
      "Waktu Pulang",
      "Lokasi Pulang (GPS)",
      "URL Foto Pulang",
    ];

    const dataRows = pesertaList.map((p, idx) => {
      const statusLabel =
        p.status === "HADIR"
          ? "HADIR"
          : p.status === "MEWAKILI"
          ? "MEWAKILI"
          : p.status === "IZIN"
          ? "IZIN"
          : "TIDAK HADIR";

      // Plain URL Foto Bukti Datang
      const fotoUrlPlain = p.fotoUrl
        ? p.fotoUrl.startsWith("http")
          ? p.fotoUrl
          : `${origin}${p.fotoUrl}`
        : "-";

      // Plain URL Lokasi Maps Datang
      let lokasiPlain = p.lokasiText || "-";
      if (p.latitude && p.longitude) {
        const mapsUrl = `https://www.google.com/maps?q=${p.latitude},${p.longitude}`;
        lokasiPlain = p.lokasiText ? `${p.lokasiText} (${mapsUrl})` : mapsUrl;
      }

      // Plain URL Foto Bukti Pulang
      const fotoPulangUrlPlain = p.fotoPulangUrl
        ? p.fotoPulangUrl.startsWith("http")
          ? p.fotoPulangUrl
          : `${origin}${p.fotoPulangUrl}`
        : "-";

      // Plain URL Lokasi Maps Pulang
      let lokasiPulangPlain = p.lokasiPulangText || "-";
      if (p.latitudePulang && p.longitudePulang) {
        const mapsUrl = `https://www.google.com/maps?q=${p.latitudePulang},${p.longitudePulang}`;
        lokasiPulangPlain = p.lokasiPulangText ? `${p.lokasiPulangText} (${mapsUrl})` : mapsUrl;
      }

      return {
        no: idx + 1,
        nama: p.nama,
        nip: p.nip || "-",
        jabatan: p.jabatan,
        instansi: p.instansi,
        eselon: p.eselon || "-",
        status: statusLabel,
        perwakilan: p.namaPerwakilan || "-",
        jabatanPerwakilan: p.jabatanPerwakilan || "-",
        keterangan: p.keterangan || "-",
        metode: p.isSelfInput ? "Self-Input Mandiri (Online)" : "Input Manual Admin",
        waktuDatang: p.waktuInput ? `${formatWita(p.waktuInput, "dd/MM/yyyy HH:mm")} WITA` : "-",
        lokasiPlain,
        fotoUrlPlain,
        waktuPulang: p.waktuPulang ? `${formatWita(p.waktuPulang, "dd/MM/yyyy HH:mm")} WITA` : (agenda.enableCheckOut ? "Belum Pulang" : "-"),
        lokasiPulangPlain,
        fotoPulangUrlPlain,
      };
    });

    const aoa: any[][] = [headers];
    dataRows.forEach((r) => {
      aoa.push([
        r.no,
        r.nama,
        r.nip,
        r.jabatan,
        r.instansi,
        r.eselon,
        r.status,
        r.perwakilan,
        r.jabatanPerwakilan,
        r.keterangan,
        r.metode,
        r.waktuDatang,
        r.lokasiPlain,
        r.fotoUrlPlain,
        r.waktuPulang,
        r.lokasiPulangPlain,
        r.fotoPulangUrlPlain,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    const colWidths = [
      { wch: 5 },
      { wch: 30 },
      { wch: 20 },
      { wch: 30 },
      { wch: 30 },
      { wch: 10 },
      { wch: 18 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 28 },
      { wch: 22 },
      { wch: 45 },
      { wch: 45 },
      { wch: 22 },
      { wch: 45 },
      { wch: 45 },
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Presensi");

    const safeTitle = agenda.namaKegiatan.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(
      workbook,
      `Laporan_Presensi_${safeTitle}_${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Laporan kehadiran berhasil diekspor ke Excel!");
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* 1. KONTROL TAUTAN PRESENSI PUBLIK & QR CODE */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Tautan & QR Code Presensi Mandiri
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bagikan tautan atau tampilkan QR Code ke layar proyektor agar peserta dapat mengisi daftar hadir secara mandiri.
              </p>
            </div>

            {/* Tombol QR & Share */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQrOpen(true)}
                className="text-xs font-semibold border-slate-300 hover:bg-slate-50 text-slate-800 h-8"
              >
                <QrCode className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                QR Code
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPublicLink}
                className="text-xs font-semibold border-slate-300 hover:bg-slate-50 text-slate-800 h-8"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copiedLink ? "Tersalin" : "Salin Tautan"}
              </Button>
            </div>
          </div>

          {/* Pengaturan Status & Rentang Waktu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
            {/* Status Form & Saklar Buka/Tutup */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500 block">Status Form Mandiri:</span>
                <span
                  className={`text-xs font-bold ${
                    isPublicActive ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {isPublicActive ? "Sedang Dibuka" : "Ditutup Sementara"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={togglingPublic}
                onClick={handleTogglePublicActive}
                className={`h-7 px-2.5 text-xs font-semibold ${
                  isPublicActive
                    ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {togglingPublic ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isPublicActive ? (
                  "Tutup Form"
                ) : (
                  "Buka Form"
                )}
              </Button>
            </div>

            {/* Jadwal Buka-Tutup */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-center space-y-0.5">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Jadwal Rentang Waktu Presensi:
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {agenda.waktuBukaAbsen ? formatWita(agenda.waktuBukaAbsen, "HH:mm") : "07:30"} -{" "}
                {agenda.waktuTutupAbsen ? formatWita(agenda.waktuTutupAbsen, "HH:mm") : "14:00"} WITA{" "}
                <span className="font-normal text-slate-500">({formatWita(agenda.tanggal, "dd MMM yyyy")})</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigasi Underline (Edit Agenda vs Daftar Kehadiran vs Peta Sebaran GPS) */}
      <div className="flex items-center gap-6 sm:gap-8 border-b border-slate-200 text-xs sm:text-sm overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => handleTabChange("EDIT_AGENDA")}
          className={`pb-2.5 px-1 border-b-2 transition-all whitespace-nowrap cursor-pointer -mb-[1px] ${
            activeTab === "EDIT_AGENDA"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          Edit Agenda & Lokasi
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("DAFTAR_HADIR")}
          className={`pb-2.5 px-1 border-b-2 transition-all whitespace-nowrap cursor-pointer -mb-[1px] flex items-center gap-1.5 ${
            activeTab === "DAFTAR_HADIR"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          Daftar Kehadiran Pegawai
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
              activeTab === "DAFTAR_HADIR"
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {totalPeserta}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("PETA_GPS")}
          className={`pb-2.5 px-1 border-b-2 transition-all whitespace-nowrap cursor-pointer -mb-[1px] flex items-center gap-1.5 ${
            activeTab === "PETA_GPS"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 font-medium"
          }`}
        >
          Peta Sebaran GPS
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
              activeTab === "PETA_GPS"
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {pesertaList.filter((p) => typeof p.latitude === "number" && typeof p.longitude === "number").length}
          </span>
        </button>
      </div>

      {/* 2. TAB: Edit Informasi Agenda & Lokasi */}
      {activeTab === "EDIT_AGENDA" && (
        <div className="space-y-3">

          {/* ── CARD 1: Informasi Kegiatan ── */}
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.06)]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-indigo-500 shrink-0" />
                <p className="text-xs font-bold text-slate-700">Informasi Kegiatan</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-400">Status:</span>
                <select
                  value={statusAgenda}
                  onChange={(e) => setStatusAgenda(e.target.value as StatusAgendaAbsensi)}
                  className="h-7 text-xs font-bold bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-800 outline-none"
                >
                  <option value="BERLANGSUNG">Berlangsung</option>
                  <option value="SELESAI">Selesai</option>
                  <option value="DIBATALKAN">Dibatalkan</option>
                </select>
              </div>
            </div>

            <CardContent className="p-4 space-y-3.5">
              {/* Baris 1: Waktu & Tempat Pelaksanaan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tanggal Pelaksanaan
                  </Label>
                  <Input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Waktu Acara (WITA)
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="time"
                      required
                      value={jamMulai}
                      onChange={(e) => handleJamMulaiChange(e.target.value)}
                      className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300 flex-1"
                      title="Jam Mulai Acara"
                    />
                    <span className="text-xs font-medium text-slate-400">s/d</span>
                    <Input
                      type="time"
                      value={jamSelesai}
                      onChange={(e) => handleJamSelesaiChange(e.target.value)}
                      className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300 flex-1"
                      title="Jam Selesai (Opsional)"
                      placeholder="Selesai"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tempat Pelaksanaan
                  </Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Gedung ATJ / Ruang Rapat"
                    value={tempat}
                    onChange={(e) => setTempat(e.target.value)}
                    className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300"
                  />
                </div>
              </div>

              {/* Baris 2: Target Binding & Label Kop Peserta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    Target Kategori Binding Pegawai
                  </Label>
                  <select
                    value={targetKategori}
                    onChange={(e) => handleTargetKategoriChange(e.target.value)}
                    className="w-full h-9 text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="SEMUA_OPD">Semua / Seluruh Perangkat Daerah & Pegawai</option>
                    <option value="ESELON_2_3">OPD Utama (Eselon II & III)</option>
                    <option value="ESELON_2">Khusus Eselon II (Kepala OPD)</option>
                    <option value="ESELON_3">Khusus Eselon III (Sekretaris/Kabid)</option>
                    <option value="KECAMATAN">Kecamatan se-Kutai Barat</option>
                    <option value="CUSTOM">Kustom (Pilihan Tertentu)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Label Target Peserta (Kop / Lampiran)
                  </Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Seluruh Perangkat Daerah / Pegawai"
                    value={targetPeserta}
                    onChange={(e) => setTargetPeserta(e.target.value)}
                    className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300"
                  />
                </div>
              </div>

              {/* Baris 3: Catatan Agenda */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Keterangan / Catatan Agenda (Opsional)
                </Label>
                <Input
                  type="text"
                  placeholder="Tambahkan catatan khusus untuk agenda ini jika diperlukan..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="text-xs bg-white border-slate-300 h-9 font-medium text-slate-800"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── CARD 2: Pengaturan Presensi ── */}
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.06)]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-xs font-bold text-slate-700">Pengaturan Presensi</p>
            </div>
            <CardContent className="p-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Jam Buka Presensi (WITA)
                  </Label>
                  <Input
                    type="time"
                    value={jamBuka}
                    onChange={(e) => setJamBuka(e.target.value)}
                    className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    Jam Tutup Presensi (WITA)
                  </Label>
                  <Input
                    type="time"
                    value={jamTutup}
                    onChange={(e) => setJamTutup(e.target.value)}
                    className="bg-white text-xs font-semibold text-slate-800 h-9 border-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      Peserta Luar Daftar
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                        allowNonPeserta
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {allowNonPeserta ? "Diizinkan" : "Khusus Terdaftar"}
                    </span>
                  </Label>
                  <label className="flex items-center gap-2.5 h-9 px-3 bg-white border border-slate-300 rounded-md cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allowNonPeserta}
                      onChange={(e) => setAllowNonPeserta(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Bolehkan mengisi absen mandiri
                    </span>
                  </label>
                </div>
              </div>

              {/* Opsi Presensi Pulang (Check-out) - Terintegrasi dengan Konteks Waktu */}
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100/90 text-xs">
                <label className="flex items-start justify-between cursor-pointer gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Aktifkan Presensi Pulang (Check-out)</span>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                        Peserta yang telah melakukan presensi Datang dapat membuka kembali link/QR untuk mengirim presensi kepulangan saat acara selesai.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableCheckOut}
                    onChange={(e) => setEnableCheckOut(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer shrink-0 mt-1"
                  />
                </label>
              </div>

              {/* Lokasi & Geofencing */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    Titik Lokasi & Radius Geofencing (Opsional)
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="h-7 px-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs rounded-lg"
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      Pilih di Peta
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={gettingVenueGps}
                      onClick={handleGetVenueLocation}
                      className="h-7 px-2.5 text-xs font-semibold text-slate-700 bg-white border-slate-300 hover:bg-slate-50 rounded-lg"
                      title="Gunakan titik koordinat saat ini"
                    >
                      {gettingVenueGps ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Crosshair className="w-3 h-3 mr-1 text-slate-600" />
                      )}
                      Lokasi Saya
                    </Button>
                    {(targetLatitude !== null || targetLongitude !== null) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTargetLatitude(null);
                          setTargetLongitude(null);
                          toast.info("Titik lokasi kegiatan dihapus");
                        }}
                        className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <Input
                    type="number"
                    step="any"
                    placeholder="Latitude (misal: -0.2307)"
                    value={targetLatitude !== null && targetLatitude !== undefined ? targetLatitude : ""}
                    onChange={(e) =>
                      setTargetLatitude(e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="bg-white text-xs h-9 border-slate-300 font-mono"
                  />
                  <Input
                    type="number"
                    step="any"
                    placeholder="Longitude (misal: 115.7027)"
                    value={targetLongitude !== null && targetLongitude !== undefined ? targetLongitude : ""}
                    onChange={(e) =>
                      setTargetLongitude(e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="bg-white text-xs h-9 border-slate-300 font-mono"
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={10}
                      max={50000}
                      placeholder="Radius Area (Meter)"
                      value={radiusMeter || 100}
                      onChange={(e) => setRadiusMeter(parseInt(e.target.value) || 100)}
                      className="bg-white text-xs h-9 border-slate-300 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-500 shrink-0">meter</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── CARD 3: Lampiran & Tautan ── */}
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.06)]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-violet-500 shrink-0" />
              <p className="text-xs font-bold text-slate-700">Lampiran & Tautan</p>
            </div>
            <CardContent className="p-4 space-y-3.5">
              {/* Slug Publik */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Tautan / Slug Presensi Publik
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center flex-1 bg-white border border-slate-300 rounded-md overflow-hidden h-9 px-2.5">
                    <span className="text-xs text-slate-400 font-mono select-none pr-1">
                      /p/absensi/
                    </span>
                    <input
                      type="text"
                      placeholder="nama-slug-kegiatan"
                      value={publicToken}
                      onChange={(e) => setPublicToken(e.target.value.toLowerCase().replace(/[^\w-]/g, ""))}
                      className="text-xs font-mono font-medium text-slate-800 flex-1 outline-none bg-transparent"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const generated = generateSlug(agenda.namaKegiatan).slice(0, 45);
                      const suffix = Math.random().toString(36).substring(2, 6);
                      setPublicToken(`${generated}-${suffix}`);
                    }}
                    className="text-xs h-9 font-semibold text-slate-700 bg-white border-slate-300 hover:bg-slate-50 shrink-0"
                  >
                    Generate Slug
                  </Button>
                </div>
              </div>

              {/* Tautan Google Drive */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Tautan Scan Fisik Google Drive (Opsional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    className="text-xs bg-white h-9 border-slate-300"
                  />
                  {driveUrl && (
                    <a
                      href={driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs h-9 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Uji
                      </Button>
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Simpan tautan folder Google Drive untuk berkas dokumen bertanda tangan basah.
                </p>
              </div>

              {/* Opsi Validasi Selfie, GPS & Presensi Pulang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requirePhoto}
                    onChange={(e) => setRequirePhoto(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      Wajib Foto Selfie
                    </span>
                    <p className="text-[10px] text-slate-500">Bukti kehadiran visual</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireLocation}
                    onChange={(e) => setRequireLocation(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Wajib Kunci GPS
                    </span>
                    <p className="text-[10px] text-slate-500">Verifikasi di lokasi kegiatan</p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* ── CARD 4: Pejabat Penandatangan / PIC Laporan (Opsional) ── */}
          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_1px_4px_-2px_rgba(0,0,0,0.06)]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Pejabat Penandatangan / PIC Laporan (Opsional)</p>
                  <p className="text-[11px] text-slate-400">
                    Pilih pegawai yang bertindak sebagai PIC penandatangan pada dokumen laporan hasil presensi kegiatan.
                  </p>
                </div>
              </div>
              {picNama && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPicPegawaiId(null);
                    setPicNama("");
                    setPicNip("");
                    setPicJabatan("");
                    toast.info("Penandatangan laporan dikosongkan");
                  }}
                  className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                >
                  Reset / Kosongkan
                </Button>
              )}
            </div>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Cari & Pilih Pegawai</Label>
                <Combobox
                  options={allPegawai.map((p) => ({
                    value: p.id,
                    label: `${p.nama} ${p.nip ? `(NIP. ${p.nip})` : ""} - ${p.jabatan}`,
                    content: (
                      <div className="py-1">
                        <div className="font-semibold text-slate-900">{p.nama}</div>
                        <div className="text-[11px] text-slate-500">{p.jabatan} • {p.instansi}</div>
                        {p.nip && <div className="text-[10px] text-slate-400 font-mono">NIP: {p.nip}</div>}
                      </div>
                    ),
                  }))}
                  value={picPegawaiId || ""}
                  onChange={(val) => {
                    const selected = allPegawai.find((p) => p.id === val);
                    if (selected) {
                      setPicPegawaiId(selected.id);
                      setPicNama(selected.nama);
                      setPicNip(selected.nip || "");
                      setPicJabatan(selected.jabatan);
                      toast.success(`PIC Penandatangan dipilih: ${selected.nama}`);
                    }
                  }}
                  placeholder="-- Pilih Pejabat Penandatangan (Opsional) --"
                  emptyText="Pegawai tidak ditemukan."
                  className="h-9 text-xs bg-white"
                />
              </div>

              {picNama && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium text-[11px] block">Nama Lengkap:</span>
                    <Input
                      value={picNama}
                      onChange={(e) => setPicNama(e.target.value)}
                      className="bg-white text-xs h-8 mt-1 border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium text-[11px] block">NIP:</span>
                    <Input
                      value={picNip}
                      onChange={(e) => setPicNip(e.target.value)}
                      placeholder="NIP. ..."
                      className="bg-white text-xs h-8 mt-1 border-slate-300 font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium text-[11px] block">Jabatan:</span>
                    <Input
                      value={picJabatan}
                      onChange={(e) => setPicJabatan(e.target.value)}
                      placeholder="Jabatan..."
                      className="bg-white text-xs h-8 mt-1 border-slate-300 text-slate-800"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Footer: Aksi Hapus Agenda & Simpan ── */}
          <div className="flex items-center justify-between gap-3 px-1 py-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteAgendaOpen(true)}
              className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
              Hapus Agenda
            </Button>

            <div className="hidden lg:flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCetakOpen(true)}
                className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Cetak Blanko
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "PETA_GPS" && (
        <PetaSebaranGps
          agenda={{
            id: agenda.id,
            namaKegiatan: agenda.namaKegiatan,
            tempat: tempat || agenda.tempat,
            tanggal: agenda.tanggal,
            targetLatitude,
            targetLongitude,
            radiusMeter,
          }}
          pesertaList={pesertaList}
        />
      )}
      {activeTab === "DAFTAR_HADIR" && (
        /* 3. Tabel Checklist Kehadiran */
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 bg-slate-50/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Daftar Presensi Pegawai & OPD
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Data terisi otomatis saat peserta mengisi form publik online, atau dapat diedit manual oleh admin.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-xs border-slate-300 hover:bg-slate-50 font-semibold"
                  title="Segarkan data presensi terbaru"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 text-indigo-600 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Menyegarkan..." : "Segarkan"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTambahOpen(true)}
                  className="text-xs border-slate-300 hover:bg-slate-50 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Tambah Pegawai Manual
                </Button>
              </div>
            </div>

            {/* Ringkasan Statistik Presensi Singkat */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium text-[11.5px] shadow-2xs">
                Total: <b className="font-bold text-slate-900">{totalPeserta}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-[11.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Hadir: <b className="font-bold">{countHadir}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-medium text-[11.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Mewakili: <b className="font-bold">{countMewakili}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-medium text-[11.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Izin: <b className="font-bold">{countIzin}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-medium text-[11.5px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Belum Hadir: <b className="font-bold">{countTidakHadir}</b>
              </span>
              {countSelfInput > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-medium text-[11.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Self-Input Mandiri: <b className="font-bold">{countSelfInput}</b>
                </span>
              )}
            </div>
          </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Cari nama, OPD, atau perwakilan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-200/60 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 h-9 w-full sm:w-44"
            >
              <option value="ALL">Semua ({totalPeserta})</option>
              <option value="HADIR">Hadir ({countHadir})</option>
              <option value="MEWAKILI">Mewakili ({countMewakili})</option>
              <option value="IZIN">Izin ({countIzin})</option>
              <option value="TIDAK_HADIR">Tidak Hadir ({countTidakHadir})</option>
            </select>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedPesertaIds.length > 0 && (
            <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {selectedPesertaIds.length}
                </span>
                <span className="text-xs font-semibold text-indigo-950">
                  peserta dipilih {filteredPeserta.length > 0 && `(dari ${filteredPeserta.length} hasil filter)`}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {!allFilteredSelected && filteredPeserta.length > selectedPesertaIds.length && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleSelectAll(true)}
                    className="h-8 text-xs bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold"
                  >
                    Pilih Semua {filteredPeserta.length} Peserta
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPesertaIds([])}
                  className="h-8 text-xs text-slate-600 hover:bg-slate-100"
                >
                  Batal Pilih
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsBulkDeleteOpen(true)}
                  disabled={deletingBulk}
                  className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs"
                >
                  {deletingBulk ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Hapus {selectedPesertaIds.length} Terpilih
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="border border-slate-200/60 rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={(checked) => handleToggleSelectAll(Boolean(checked))}
                        aria-label="Pilih Semua Peserta"
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-10 text-center text-xs">No</TableHead>
                  <TableHead className="text-xs min-w-[200px]">Pegawai & OPD</TableHead>
                  <TableHead className="text-xs w-44 text-center">Status Kehadiran</TableHead>
                  <TableHead className="text-xs min-w-[220px]">Data Perwakilan / Alasan</TableHead>
                  <TableHead className="text-xs min-w-[150px]">Bukti & Waktu Presensi</TableHead>
                  <TableHead className="text-xs text-right w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedPeserta.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400 text-xs">
                      Tidak ada peserta yang cocok dengan pencarian
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedPeserta.map((p, idx) => {
                    const isMewakili = p.status === "MEWAKILI";
                    const isSelected = selectedPesertaIds.includes(p.id);

                    return (
                      <TableRow
                        key={p.id}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-indigo-50/50"
                            : p.status === "HADIR"
                            ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                            : p.status === "MEWAKILI"
                            ? "bg-blue-50/20 hover:bg-amber-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* Checkbox Kolom */}
                        <TableCell className="text-center text-xs">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleToggleSelectOne(p.id, Boolean(checked))}
                              aria-label={`Pilih ${p.nama}`}
                              className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-xs font-medium text-slate-500">
                          {idx + 1}
                        </TableCell>

                        {/* Nama & Instansi */}
                        <TableCell className="text-xs">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.nama}</span>
                            {p.isSelfInput && (
                              <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded-md border border-indigo-200">
                                Mandiri
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{p.jabatan}</div>
                          <div className="text-indigo-700 font-semibold text-[11px] mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            {p.instansi}
                          </div>
                        </TableCell>

                        {/* Status Kehadiran Selector */}
                        <TableCell className="text-center text-xs">
                          <select
                            value={p.status}
                            onChange={(e) =>
                              handleStatusChange(p.id, e.target.value as StatusKehadiran)
                            }
                            className="h-8 w-full text-xs font-semibold rounded-md border border-slate-350 bg-white px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="TIDAK_HADIR">Tidak Hadir</option>
                            <option value="HADIR">Hadir</option>
                            <option value="MEWAKILI">Mewakili</option>
                            <option value="IZIN">Izin / Dinas Luar</option>
                          </select>
                        </TableCell>

                        {/* Form Perwakilan */}
                        <TableCell className="text-xs">
                          {isMewakili ? (
                            <div className="space-y-1.5 p-2 bg-blue-50/80 rounded-md border border-blue-200/80">
                              <Input
                                placeholder="Nama yang mewakili..."
                                value={p.namaPerwakilan || ""}
                                onChange={(e) =>
                                  handlePerwakilanChange(p.id, "namaPerwakilan", e.target.value)
                                }
                                className="text-xs h-7 bg-white"
                              />
                              <Input
                                placeholder="Jabatan perwakilan (mis: Sekretaris)..."
                                value={p.jabatanPerwakilan || ""}
                                onChange={(e) =>
                                  handlePerwakilanChange(p.id, "jabatanPerwakilan", e.target.value)
                                }
                                className="text-xs h-7 bg-white"
                              />
                            </div>
                          ) : (
                            <Input
                              placeholder="Catatan / Alasan izin..."
                              value={p.keterangan || ""}
                              onChange={(e) =>
                                handlePerwakilanChange(p.id, "keterangan", e.target.value)
                              }
                              className="text-xs h-8"
                            />
                          )}
                        </TableCell>

                        {/* Bukti Foto, Waktu & GPS */}
                        <TableCell className="text-xs">
                          <div className="space-y-1.5">
                            {p.waktuInput ? (
                              <div className="font-mono text-[11px] text-slate-700 flex items-center gap-1">
                                {agenda.enableCheckOut && (
                                  <span className="px-1 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">Dtg</span>
                                )}
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                {formatWita(p.waktuInput, "HH:mm:ss")} WITA
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs italic">-</span>
                            )}

                            {/* Info Presensi Pulang jika diaktifkan */}
                            {(enableCheckOut || agenda.enableCheckOut) && (
                              p.waktuPulang ? (
                                <div className="font-mono text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                                  <span className="px-1 py-0.2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[9px] font-bold">Plg</span>
                                  <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                                  {formatWita(p.waktuPulang, "HH:mm:ss")} WITA
                                  <button
                                    type="button"
                                    onClick={() => handleSetPulangManual(p.id, null)}
                                    className="text-slate-300 hover:text-rose-600 font-bold ml-1 text-xs px-1 leading-none transition"
                                    title="Batalkan/Hapus Jam Pulang"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : p.waktuInput ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 text-[10px] italic flex items-center gap-1">
                                    <span className="px-1 py-0.2 bg-slate-100 text-slate-400 rounded text-[9px]">Plg</span>
                                    Belum Pulang
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetPulangManual(p.id, new Date())}
                                    className="text-[9.5px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.2 rounded transition cursor-pointer"
                                    title="Tandai peserta sudah pulang saat ini"
                                  >
                                    + Set Pulang
                                  </button>
                                </div>
                              ) : null
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {p.fotoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFotoPeserta(p)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded border border-slate-300 transition"
                                >
                                  <Camera className="w-3 h-3 text-indigo-600" />
                                  Foto {agenda.enableCheckOut ? "Datang" : ""}
                                </button>
                              )}

                              {p.fotoPulangUrl && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedFotoPeserta({ ...p, fotoUrl: p.fotoPulangUrl } as any)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-semibold rounded border border-indigo-200 transition"
                                >
                                  <Camera className="w-3 h-3 text-indigo-600" />
                                  Foto Pulang
                                </button>
                              )}

                              {p.latitude && p.longitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded border border-emerald-200 transition"
                                >
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  GPS
                                </a>
                              )}

                              {/* Biometric Audit Badges */}
                              {p.faceMatchStatus === "MATCH" && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9.5px] font-semibold"
                                  title={`Kemiripan Wajah Biometrik: ${Math.round((p.faceScore || 0) * 100)}%`}
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  Wajah Cocok ({Math.round((p.faceScore || 0) * 100)}%)
                                </span>
                              )}

                              {p.faceMatchStatus === "MISMATCH" && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9.5px] font-bold animate-pulse"
                                  title={`Indikasi wajah berbeda dari biometrik terdaftar. Kemiripan hanya: ${Math.round((p.faceScore || 0) * 100)}%`}
                                >
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  ⚠️ Indikasi Beda ({Math.round((p.faceScore || 0) * 100)}%)
                                </span>
                              )}

                              {p.faceMatchStatus === "ENROLLED" && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[9.5px] font-semibold"
                                  title="Biometrik wajah master pertama kali terdaftar pada presensi ini"
                                >
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  Biometrik Baru
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Hapus Satuan */}
                        <TableCell className="text-right text-xs">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletePesertaTarget({ id: p.id, nama: p.nama })}
                            className="h-7 w-7 p-0 text-slate-300 hover:text-red-600"
                            title={`Hapus ${p.nama}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sentinel Auto Load More (Lazy Loading) */}
          {visibleCount < filteredPeserta.length ? (
            <div
              ref={loadMoreRef}
              className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>
                Memuat peserta lainnya... ({displayedPeserta.length} dari {filteredPeserta.length})
              </span>
            </div>
          ) : filteredPeserta.length > 50 ? (
            <div className="py-2.5 text-center text-[11px] text-slate-400">
              Semua {filteredPeserta.length} peserta telah dimuat
            </div>
          ) : null}

          {/* Bottom Info & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
            <span className="text-xs text-slate-500">
              Data tersinkronisasi otomatis dengan server. Klik <b>Simpan Perubahan</b> untuk menyimpan koreksi admin.
            </span>

            <div className="hidden lg:flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                Ekspor Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLaporanPdfOpen(true)}
                className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Ekspor PDF
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs shrink-0"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Modal Cetak Blanko */}
      <CetakModal
        isOpen={isCetakOpen}
        onClose={() => setIsCetakOpen(false)}
        agenda={agenda}
      />

      {/* Modal Ekspor Laporan PDF Hasil Agenda */}
      <ExportLaporanAgendaModal
        isOpen={isLaporanPdfOpen}
        onClose={() => setIsLaporanPdfOpen(false)}
        agenda={{
          ...agenda,
          waktu,
          tempat,
          targetLatitude,
          targetLongitude,
          radiusMeter,
          picNama,
          picNip,
          picJabatan,
          peserta: pesertaList,
        }}
      />

      <ModalTambahPeserta
        isOpen={isTambahOpen}
        onClose={() => setIsTambahOpen(false)}
        agendaId={agenda.id}
        allPegawai={allPegawai}
        existingPegawaiIds={pesertaList.map((p) => p.pegawaiId).filter(Boolean) as string[]}
        onSuccess={() => router.refresh()}
      />

      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        publicToken={agenda.publicToken}
        namaKegiatan={agenda.namaKegiatan}
        tanggal={agenda.tanggal ? formatWita(agenda.tanggal, "EEEE, dd MMMM yyyy") : ""}
        waktu={
          agenda.waktuBukaAbsen && agenda.waktuTutupAbsen
            ? `${formatWita(agenda.waktuBukaAbsen, "HH:mm")} - ${formatWita(agenda.waktuTutupAbsen, "HH:mm")} WITA`
            : agenda.waktu || ""
        }
        tempat={agenda.tempat || ""}
      />

      <FotoPreviewModal
        isOpen={!!selectedFotoPeserta}
        onClose={() => setSelectedFotoPeserta(null)}
        peserta={selectedFotoPeserta}
      />

      {/* Modal Interaktif Peta Pemilihan Lokasi (Map Picker) */}
      <ModalMapPicker
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialLat={targetLatitude}
        initialLng={targetLongitude}
        initialRadius={radiusMeter}
        onSelectLocation={(lat, lng, rad) => {
          setTargetLatitude(lat);
          setTargetLongitude(lng);
          setRadiusMeter(rad);
          toast.success("Titik lokasi kegiatan berhasil ditentukan dari peta!");
        }}
      />

      {/* Dialog Konfirmasi Hapus Agenda */}
      <AlertDialog
        open={isDeleteAgendaOpen}
        onOpenChange={(open) => !open && setIsDeleteAgendaOpen(false)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Hapus Agenda Presensi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-xs leading-relaxed">
              Apakah Anda yakin ingin menghapus agenda{" "}
              <strong className="text-slate-900 font-bold">{agenda.namaKegiatan}</strong>? Seluruh data kehadiran pegawai, berkas foto presensi di penyimpanan, dan tautan publik terkait agenda ini akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAgenda} className="text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAgenda}
              disabled={deletingAgenda}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
            >
              {deletingAgenda ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Hapus Agenda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Hapus Peserta */}
      <AlertDialog
        open={!!deletePesertaTarget}
        onOpenChange={(open) => !open && setDeletePesertaTarget(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Peserta dari Agenda?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-slate-900 font-semibold">{deletePesertaTarget?.nama}</strong> dari
              daftar agenda ini? Foto selfie bukti kehadiran (jika ada) juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPeserta}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePeserta}
              disabled={deletingPeserta}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deletingPeserta ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Hapus Peserta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Konfirmasi Hapus Massal Peserta Terpilih */}
      <AlertDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => !open && setIsBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedPesertaIds.length} Peserta Terpilih?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-rose-600 font-bold">{selectedPesertaIds.length} peserta</strong> yang
              telah Anda pilih dari daftar agenda ini? Foto selfie kehadiran dan riwayat terkait pada agenda ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBulk}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              disabled={deletingBulk}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {deletingBulk ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Ya, Hapus {selectedPesertaIds.length} Peserta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Bottom Fixed Action Bar (Tab-Aware & Tanpa Duplikasi) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 py-2.5 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2">
        {/* Tombol QR Code selalu ada */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsQrOpen(true)}
          className="h-9 w-9 shrink-0 border-slate-200 bg-white"
          title="Tampilkan QR Code"
        >
          <QrCode className="w-4 h-4 text-indigo-700" />
        </Button>

        {activeTab === "EDIT_AGENDA" ? (
          /* Tab EDIT_AGENDA: Cetak Blanko + Simpan Perubahan Utama */
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCetakOpen(true)}
              className="h-9 px-3 shrink-0 border-slate-300 text-slate-700 text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-slate-600" />
              Cetak Blanko
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm px-3 justify-center"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin shrink-0" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              )}
              Simpan Perubahan
            </Button>
          </>
        ) : (
          /* Tab DAFTAR_HADIR & PETA_GPS: Ekspor & Tambah Pegawai */
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleExportExcel}
              className="h-9 w-9 shrink-0 border-emerald-200 bg-white"
              title="Ekspor Laporan ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsLaporanPdfOpen(true)}
              className="h-9 w-9 shrink-0 border-indigo-200 bg-white"
              title="Ekspor Laporan ke PDF"
            >
              <FileText className="w-4 h-4 text-indigo-700" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsCetakOpen(true)}
              className="h-9 w-9 shrink-0 border-slate-200 bg-white"
              title="Cetak Blanko Fisik"
            >
              <Printer className="w-4 h-4 text-slate-700" />
            </Button>
            <Button
              onClick={() => setIsTambahOpen(true)}
              className="flex-1 min-w-0 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm px-3 justify-center"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Tambah Manual</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
