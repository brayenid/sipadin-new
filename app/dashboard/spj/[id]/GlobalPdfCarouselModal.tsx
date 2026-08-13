"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getWitaToday } from "@/lib/date-utils";
import { Loader2, X, ChevronLeft, ChevronRight, Edit } from "lucide-react";

import TelaahanPdf from "@/pdf/templates/TelaahanStafPdf";
import SuratTugasPdf from "@/pdf/templates/SuratTugasPdf";
import SpdPdf from "@/pdf/templates/SpdPdf";
import VisumPdf from "@/pdf/templates/VisumPdf";
import KuitansiPdf from "@/pdf/templates/KuitansiPdf";
import LaporanPdf from "@/pdf/templates/LaporanPdf";
import DopdPdf from "@/pdf/templates/DopdPdf";
import BapbPdf from "@/pdf/templates/BapbPdf";
import SuratPengantarPdf from "@/pdf/templates/SuratPengantarPdf";
import BastbPdf from "@/pdf/templates/BastbPdf";
import DaftarHadirPdf from "@/pdf/templates/DaftarHadirPdf";
import { formatWita } from "@/lib/date-utils";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full w-full bg-slate-100 animate-pulse"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div> }
);

type Props = {
  isOpen: boolean;
  onClose: () => void;
  spj: any;
  pegawaiList: any[];
  selectedDocId?: string | null;
  onGoToTab: (tabId: string) => void;
};

export default function GlobalPdfCarouselModal({ isOpen, onClose, spj, pegawaiList, selectedDocId, onGoToTab }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const documents = useMemo(() => {
    const docs = [];
    const meta = typeof spj.metaDokumen === "object" && spj.metaDokumen !== null ? spj.metaDokumen : {};
    
    // Helper to get roster
    const rosterData = [...(spj.roster || [])]
      .sort((a: any, b: any) => (a.role === 'KEPALA_JALAN' ? -1 : (b.role === 'KEPALA_JALAN' ? 1 : 0)))
      .map((r: any, idx: number) => ({
        id: r.id,
        nama: r.nama,
        nip: r.nip,
        jabatan: r.jabatan,
        pangkat: r.pangkat,
        golongan: r.golongan,
        order: idx,
        role: r.role,
        instansi: r.instansi || null
      }));
    
    // --- TELAAHAN ---
    if (spj.jenisSpj === 'PERJADIN') {
      const tel = meta.telaahan || {};
      const signer = pegawaiList.find(p => p.id === tel.penandatanganId);
      docs.push({
        id: "telaahan",
        title: "Telaahan Staf",
        tabId: "telaahan",
        render: () => (
          <TelaahanPdf 
            spj={{
              kotaTandaTangan: "Sendawar",
              tglSuratTugas: getWitaToday(),
              noTelaahan: tel.nomorTengah 
                ? `${tel.nomorPrefix || ""}${tel.nomorTengah}${tel.nomorSuffix || ""}`
                : null
            }}
            telaahan={{
              kepada: tel.kepada,
              sifat: tel.sifat,
              lampiran: tel.lampiran,
              perihal: tel.perihal || spj.perihal,
              dasar: tel.dasar,
              praAnggapan: tel.praAnggapan,
              fakta: tel.fakta,
              analisis: tel.analisis,
              kesimpulan: tel.kesimpulan,
              saran: tel.saran,
              tglTelaahan: tel.tanggal ? new Date(tel.tanggal) : undefined
            }}
            roster={rosterData}
            signer={signer} 
          />
        )
      });
    }

    // --- SURAT PENGANTAR (MAKAN MINUM) ---
    if (spj.jenisSpj === 'MAKAN_MINUM') {
      const sp = meta.suratPengantar || {};
      const config = meta.suratPengantarPdfConfig || { content: {}, styles: {} };
      const penandatanganId = sp.penandatanganId || meta.bapb?.pptkId || meta.bastb?.pptkId;
      const pengesahPegawai = penandatanganId ? pegawaiList.find((p) => p.id === penandatanganId) : null;
      docs.push({
        id: "surat-pengantar",
        title: "Surat Pengantar",
        tabId: "surat-pengantar",
        render: () => {
          const defaultKeterangan = config.content?.keteranganOverride ||
            (spj.tanggalPelaksanaan && spj.perihal 
              ? `${spj.perihal} pada ${formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy')}` 
              : spj.perihal) || "";
          const spjData = {
            nomorSurat: `${sp.nomorPrefix || ""}${sp.nomorTengah ? sp.nomorTengah : '               '}${sp.nomorSuffix || ""}`,
            tanggalSurat: sp.tanggalSurat || null,
            tanggalPenerima: sp.tanggalPenerima || null,
            vendorNama: spj.maminDetail?.vendor?.namaVendor || "......................................",
            vendorPemilik: spj.maminDetail?.vendor?.namaPemilik || "......................................",
            bagianOrganisasiLabel: config.content?.bagianOrganisasiLabel || "BAGIAN ORGANISASI SETDAKAB KUTAI BARAT"
          };
          const itemsData = (spj.pengeluaranDetails || []).map((d: any, i: number) => ({
            no: i + 1,
            jenisBarang: d.uraian || "",
            qty: Number(d.qty || 1),
            satuan: d.satuan || "",
            keterangan: defaultKeterangan
          }));
          const pengesah = pengesahPegawai ? {
            nama: pengesahPegawai.nama,
            nip: pengesahPegawai.nip
          } : null;
          return <SuratPengantarPdf spj={spjData} items={itemsData} pptk={pengesah} layout={config.styles} />;
        }
      });
    }

    // --- BAPB (MAKAN MINUM) ---
    if (spj.jenisSpj === 'MAKAN_MINUM') {
      const bapbMeta = meta.bapb || {};
      const config = meta.bapbPdfConfig || { content: {}, styles: {} };
      const kpaId = bapbMeta.kpaId || meta.dopd?.kpaId;
      const pptkId = bapbMeta.pptkId || meta.suratPengantar?.penandatanganId;
      const kpa = kpaId ? pegawaiList.find(p => p.id === kpaId) : null;
      const pptk = pptkId ? pegawaiList.find(p => p.id === pptkId) : null;
      docs.push({
        id: "bapb",
        title: "BAPB",
        tabId: "bapb",
        render: () => {
          const spjData = {
            nomorSurat: `${bapbMeta.nomorPrefix || ""}${bapbMeta.nomorTengah ? bapbMeta.nomorTengah : '               '}${bapbMeta.nomorSuffix || ""}`,
            tanggalBapb: bapbMeta.tanggalBapb || null,
            tanggalSpb: bapbMeta.tanggalSpb || null,
            tanggalSpbLabel: bapbMeta.tanggalSpbLabel || null,
            nomorSpb: bapbMeta.nomorSpb || '.............................',
            bagianOrganisasiLabel: config.content?.bagianOrganisasiLabel || bapbMeta.bagianOrganisasi || "Bagian Organisasi Sekretariat Daerah Kabupaten Kutai Barat",
            vendorNama: spj.maminDetail?.vendor?.namaVendor || "......................................",
            vendorPemilik: spj.maminDetail?.vendor?.namaPemilik || "......................................",
          };
          return (
            <BapbPdf 
              spj={spjData} 
              kpa={kpa ? { nama: kpa.nama, nip: kpa.nip, jabatan: "Kuasa Pengguna Anggaran" } : null}
              pptk={pptk ? { nama: pptk.nama, nip: pptk.nip, jabatan: "Pejabat Pelaksana Teknis Kegiatan" } : null} 
              layout={config.styles}
            />
          );
        }
      });
    }

    // --- BASTB (MAKAN MINUM) ---
    if (spj.jenisSpj === 'MAKAN_MINUM') {
      const bastbMeta = meta.bastb || {};
      const config = meta.bastbPdfConfig || { content: {}, styles: {} };
      const pptkId = bastbMeta.pptkId || meta.bapb?.pptkId || meta.suratPengantar?.penandatanganId;
      const pptk = pptkId ? pegawaiList.find((p) => p.id === pptkId) : null;
      docs.push({
        id: "bastb",
        title: "BASTB",
        tabId: "bastb",
        render: () => {
          const defaultKeterangan = config.content?.keteranganOverride ||
            (spj.tanggalPelaksanaan && spj.perihal 
              ? `Tanggal ${formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy')} ${spj.perihal}` 
              : spj.perihal) || "";

          const spjData = {
            nomorSurat: `${bastbMeta.nomorPrefix || ""}${bastbMeta.nomorTengah ? bastbMeta.nomorTengah : '               '}${bastbMeta.nomorSuffix || ""}`,
            tanggalBastb: bastbMeta.tanggalBastb || null,
          };
          const vendorData = {
            nama: spj.maminDetail?.vendor?.namaPemilik || "......................................",
            npwp: spj.maminDetail?.vendor?.npwp || "-",
            npwpd: spj.maminDetail?.vendor?.npwpd || "-",
            alamat: spj.maminDetail?.vendor?.alamat || "-",
            jabatan: `Pemilik ${spj.maminDetail?.vendor?.namaVendor || ""}`.trim()
          };
          const itemsData = (spj.pengeluaranDetails || []).map((d: any, i: number) => ({
            no: i + 1,
            jenisBarang: d.uraian || "",
            qty: Number(d.qty || 1),
            satuan: d.satuan || "",
            keterangan: defaultKeterangan
          }));
          return (
            <BastbPdf 
              spj={spjData} 
              vendor={vendorData}
              pptk={pptk ? { 
                nama: pptk.nama, 
                nip: pptk.nip, 
                jabatan: "Pejabat Pelaksana Teknis Kegiatan", 
                alamat: bastbMeta.alamatPptk ? bastbMeta.alamatPptk : "Jl. Komplek Perkantoran Bupati Kutai Barat" 
              } : null}
              items={itemsData}
              layout={config.styles}
            />
          );
        }
      });
    }

    // --- DAFTAR HADIR (MAKAN MINUM) ---
    if (spj.jenisSpj === 'MAKAN_MINUM') {
      const dhMeta = meta.daftarHadir || {};
      const config = meta.daftarHadirPdfConfig || { content: {}, styles: {} };
      const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const hariLabel = spj.tanggalPelaksanaan 
        ? hariArr[new Date(spj.tanggalPelaksanaan).getDay()]
        : "";
      const tanggalLabel = spj.tanggalPelaksanaan 
        ? formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy') 
        : (dhMeta.tanggal || "");

      docs.push({
        id: "daftar-hadir",
        title: "Daftar Hadir",
        tabId: "daftar-hadir",
        render: () => {
          const spjData = {
            hari: hariLabel,
            tanggalLabel: tanggalLabel,
            waktu: dhMeta.waktu || "09.00 Wita s/d Selesai",
            tempat: dhMeta.tempat || "",
            acara: spj.perihal || ""
          };
          return (
            <DaftarHadirPdf 
              spj={spjData} 
              jumlahPeserta={Number(dhMeta.jumlahPeserta) || 10}
              layout={config.styles}
            />
          );
        }
      });
    }

    // --- SURAT TUGAS ---
    const st = meta.suratTugas || {};
    const stSigner = pegawaiList.find(p => p.id === st.penandatanganId);
    docs.push({
      id: "surat-tugas",
      title: "Surat Tugas",
      tabId: "surat-tugas",
      render: () => {
        const diffTime = spj.perjadinDetail?.tglBerangkat && spj.perjadinDetail?.tglKembali 
            ? Math.abs(new Date(spj.perjadinDetail.tglKembali).getTime() - new Date(spj.perjadinDetail.tglBerangkat).getTime()) 
            : 0;
        const lamaPerjalanan = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 : 1;
        const spjData = {
          kotaTandaTangan: "Sendawar",
          tempatTujuan: spj.perjadinDetail?.tempatTujuan || "-",
          tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || "Sendawar",
          alatAngkut: spj.perjadinDetail?.alatAngkut || "-",
          lamaPerjalanan: spj.perjadinDetail?.lamaPerjalanan || lamaPerjalanan,
          akunAnggaran: "DPA SKPD Bagian Organisasi",
          tglBerangkat: spj.perjadinDetail?.tglBerangkat || null,
          tglKembali: spj.perjadinDetail?.tglKembali || null,
          tglSuratTugas: st.tanggalSurat || null,
          noSuratTugas: `${st.nomorPrefix || ""}${st.nomorTengah || ""}${st.nomorSuffix || ""}`,
        };
        const suratTugasData = {
          untuk: spj.perihal || "-",
          assignedRosterItemId: null,
          signerNama: stSigner?.nama || "-",
          signerNip: stSigner?.nip || "-",
          signerJabatan: stSigner?.jabatan || "-",
          signerPangkatGolongan: (stSigner?.pangkat || "") + (stSigner?.golongan ? " (" + stSigner.golongan + ")" : "")
        };
        return <SuratTugasPdf spj={spjData} suratTugas={suratTugasData} roster={rosterData} />;
      }
    });

    // --- SPD ---
    if (spj.jenisSpj === 'PERJADIN') {
      const spd = meta.spd || {};
      const spdSigner = pegawaiList.find(p => p.id === spd.penandatanganId);
      docs.push({
        id: "spd",
        title: "Surat Perjalanan Dinas",
        tabId: "spd",
        render: () => {
          const spdSpj = {
            noSpd: `${spd.nomorPrefix || ""}${spd.nomorTengah || ""}${spd.nomorSuffix || ""}`,
            tglSpd: spd.tanggalSurat || null,
            kotaTandaTangan: "Sendawar",
            tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || "Sendawar",
            tempatTujuan: spj.perjadinDetail?.tempatTujuan || "-",
            maksudDinas: spj.perihal || "-",
            alatAngkut: spj.perjadinDetail?.alatAngkut || "-",
            lamaPerjalanan: spj.perjadinDetail?.lamaPerjalanan || 1,
            tglBerangkat: spj.perjadinDetail?.tglBerangkat || null,
            tglKembali: spj.perjadinDetail?.tglKembali || null,
            akunAnggaran: spj.kodeRekening?.kodeRekening || "-",
            overrideInstansiPembebanan: "Pemerintah Kabupaten Kutai Barat",
            overrideTingkatBiaya: spd.tingkatBiaya || "",
            overrideKeteranganLain: spd.keteranganLain || "",
          };
          const signerData = {
            nama: spdSigner?.nama || "-",
            nip: spdSigner?.nip || "-",
            jabatan: spdSigner?.jabatan || "-",
            pangkat: spdSigner?.pangkat || "-",
            golongan: spdSigner?.golongan || "-",
            instansi: null,
            jabatanTampil: spdSigner?.jabatan || "-",
          };
          return <SpdPdf spj={spdSpj} roster={rosterData} signer={signerData} />;
        }
      });
    }

    // --- VISUM ---
    if (spj.jenisSpj === 'PERJADIN') {
      const vis = meta.visum || {};
      docs.push({
        id: "visum",
        title: "Surat Keterangan Jalan (Visum)",
        tabId: "visum",
        render: () => {
          const visSpj = {
            tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || "Sendawar",
            tempatTujuan: spj.perjadinDetail?.tempatTujuan || "-",
          };
          const stageCount = typeof vis.stageCount === 'number' ? vis.stageCount : 3;
          let signer = null;
          if (stSigner) {
            signer = {
              nama: stSigner.nama,
              nip: stSigner.nip,
              jabatan: stSigner.jabatan,
              jabatanTampil: stSigner.jabatanTampil
            };
          }
          return <VisumPdf spj={visSpj} stageCount={stageCount} signer={signer} />;
        }
      });
    }

    // --- KUITANSI ---
    docs.push({
      id: "kuitansi",
      title: "Kuitansi",
      tabId: "kuitansi",
      render: () => {
        const dopdMeta = meta.dopd || {};
        const kpaId = dopdMeta.kpaId;
        const bppId = dopdMeta.bppId;
        const kpa = kpaId ? pegawaiList.find(p => p.id === kpaId) : null;
        const bpp = bppId ? pegawaiList.find(p => p.id === bppId) : null;
        const penerimaRoster = spj.roster?.find((r: any) => r.role === "KEPALA_JALAN") || spj.roster?.[0];
        const penerima = penerimaRoster ? { nama: penerimaRoster.nama, nip: penerimaRoster.nip } : { nama: "Pegawai Fulan", nip: "-" };
        let rincian: { label: string; jumlah: number }[] = [];
        const rincianMap = new Map<string, number>();
        (spj.pengeluaranDetails || []).forEach((d: any) => {
          const cat = d.kategori || "Biaya Lainnya";
          rincianMap.set(cat, (rincianMap.get(cat) || 0) + Number(d.total));
        });
        (spj.roster || []).forEach((r: any) => {
          (r.pengeluaranDetails || []).forEach((d: any) => {
            const cat = d.kategori || "Biaya Lainnya";
            rincianMap.set(cat, (rincianMap.get(cat) || 0) + Number(d.total));
          });
        });
        rincian = Array.from(rincianMap.entries()).filter(([_, jumlah]) => jumlah > 0).map(([label, jumlah]) => ({ label, jumlah }));
        if (rincian.length === 0) rincian = [{ label: spj.jenisSpj === "PERJADIN" ? "Biaya Perjalanan Dinas" : "Biaya Pengeluaran", jumlah: Number(spj.totalPengeluaran) || 0 }];
        const kuitansiSpj = {
          tahunAnggaran: "2026",
          kodeKegiatan: spj.kodeRekening?.subKegiatan?.kegiatan?.kodeKegiatan || "1.01",
          judulKegiatan: spj.kodeRekening?.subKegiatan?.kegiatan?.judulKegiatan || "-",
          kodeSubKegiatan: spj.kodeRekening?.subKegiatan?.kodeSub || "1.01.01",
          judulSubKegiatan: spj.kodeRekening?.subKegiatan?.judulSub || "-",
          kodeRekening: spj.kodeRekening?.kodeRekening || "-",
          judulRekening: spj.kodeRekening?.judulRekening || "-",
          upGu: "",
          nomorBku: spj.nomorBku || "",
          maksudDinas: spj.tanggalPelaksanaan && spj.perihal ? `${spj.perihal} pada ${formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy')}` : spj.perihal,
          kotaTandaTangan: "Sendawar",
          tanggalKuitansiLabel: null
        };
        return <KuitansiPdf spj={kuitansiSpj} penerima={penerima} rincian={rincian} signers={{ kpa: kpa ? { nama: kpa.nama, nip: kpa.nip } : null, bpp: bpp ? { nama: bpp.nama, nip: bpp.nip } : null }} />;
      }
    });

    // --- DOPD ---
    if (spj.jenisSpj === 'PERJADIN') {
      const dopdMeta = meta.dopd || {};
      const kpaD = dopdMeta.kpaId ? pegawaiList.find(p => p.id === dopdMeta.kpaId) : null;
      const bppD = dopdMeta.bppId ? pegawaiList.find(p => p.id === dopdMeta.bppId) : null;
      const dopdItems: any[] = [];
      (spj.roster || []).forEach((r: any) => {
        (r.pengeluaranDetails || []).forEach((d: any) => {
          if (d.tampilDiDopd) dopdItems.push(d);
        });
      });
      docs.push({
        id: "dopd",
        title: "DOPD",
        tabId: "dopd",
        render: () => (
          <DopdPdf 
            spj={{
              pejabatMemberiPerintahLabel: "Asisten Pemerintahan dan Kesejahteraan Rakyat",
              tingkatPerjalananLabel: "Perjalanan Dinas Jabatan",
              kotaTandaTangan: dopdMeta.kotaTandaTangan || "Sendawar",
              tglSuratTugas: st.tanggalSurat || undefined
            }}
            roster={rosterData.map((r: any) => ({ ...r, role: r.role || "PENGIKUT" }))}
            items={dopdItems.map(item => {
              const qty = item.faktorPengali?.reduce((acc: number, cur: any) => acc * (parseInt(cur.value) || 1), 1) || 1;
              return {
                id: item.id,
                rosterItemId: item.spjRosterItemId,
                kategori: item.kategori,
                uraian: item.uraian,
                hargaSatuan: parseInt(item.hargaSatuan) || 0,
                total: (parseInt(item.hargaSatuan) || 0) * qty,
                factors: (item.faktorPengali || []).map((f: any, i: number) => ({ id: String(i), order: i, label: f.label, qty: parseInt(f.value) || 1 }))
              };
            })}
            signers={{ kpa: kpaD ? { nama: kpaD.nama, nip: kpaD.nip } : null, bpp: bppD ? { nama: bppD.nama, nip: bppD.nip } : null }}
          />
        )
      });
    }

    // --- LAPORAN ---
    if (spj.jenisSpj === 'PERJADIN') {
      const lap = meta.laporan || {};
      docs.push({
        id: "laporan",
        title: "Laporan Hasil Perjalanan",
        tabId: "laporan",
        render: () => {
          const lSpj = { noSuratTugas: `${st.nomorPrefix || ""}${st.nomorTengah || ""}${st.nomorSuffix || ""}` };
          const lapData = {
            dasarLaporan: lap.dasarLaporan || "",
            kegiatan: lap.kegiatan || "",
            waktu: lap.waktu || "",
            lokasi: lap.lokasi || "",
            tujuan: lap.tujuan || "",
            signerNama: stSigner?.nama || "",
            signerNip: stSigner?.nip || "",
            signerJabatan: stSigner?.jabatan || "",
            signerPangkat: stSigner?.pangkat || "",
            signerGolongan: stSigner?.golongan || "",
            signerJabatanTampil: stSigner?.jabatanTampil || "",
            hasilMode: lap.hasilMode || "POINTS",
            hasilPembuka: lap.hasilPembuka || "",
            hasilPoin: lap.hasilPoin || [],
            hasilNarasi: lap.hasilNarasi || "",
          };
          return <LaporanPdf spj={lSpj} roster={rosterData.map((r: any) => ({ ...r, role: r.role || "PENGIKUT" }))} laporan={lapData} />;
        }
      });
    }

    return docs;
  }, [spj, pegawaiList]);

  useEffect(() => {
    if (isOpen && selectedDocId) {
      const index = documents.findIndex(d => d.id === selectedDocId);
      if (index !== -1) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentIndex(index);
      }
    } else if (isOpen && !selectedDocId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentIndex(0);
    }
  }, [isOpen, selectedDocId, documents]);

  if (!isOpen) return null;

  const currentDoc = documents[currentIndex] || documents[0];

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % documents.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + documents.length) % documents.length);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      handleNext();
    } else if (e.key === "ArrowLeft") {
      handlePrev();
    }
  };

  const handleEditClick = () => {
    onClose();
    onGoToTab(currentDoc.tabId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onKeyDown={handleKeyDown} className="max-w-[95vw] sm:max-w-[95vw] w-full h-[95vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 [&>button[data-slot=dialog-close]]:hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-xl">Preview Dokumen: {currentDoc.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-500 w-16 text-center">
                {currentIndex + 1} / {documents.length}
              </span>
              <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button onClick={handleEditClick} variant="outline" className="border-primary text-primary hover:bg-primary/5">
              <Edit className="w-4 h-4 mr-2" />
              Edit di Tab {currentDoc.title}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="border border-slate-200">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 h-full bg-slate-500 flex flex-col relative min-h-0">
            <PDFViewer width="100%" height="100%" className="border-none w-full h-full flex-1">
              {currentDoc.render()}
            </PDFViewer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
