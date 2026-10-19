import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRekapKehadiranOpd } from "@/app/actions/absensi";
import { formatWita } from "@/lib/date-utils";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import LaporanRekapBulanKegiatanPdf from "@/pdf/templates/LaporanRekapBulanKegiatanPdf";
import LaporanRekapKehadiranPdf from "@/pdf/templates/LaporanRekapKehadiranPdf";
import LaporanRekapPegawaiPdf from "@/pdf/templates/LaporanRekapPegawaiPdf";

export const runtime = "nodejs";

const NAMA_BULAN = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipe = searchParams.get("tipe") || "hierarki"; // "hierarki" | "opd" | "pegawai"
    const tahun = searchParams.get("tahun") || new Date().getFullYear().toString();
    const bulan = searchParams.get("bulan") || "ALL";
    const kategori = (searchParams.get("kategori") as any) || "ALL";
    const kehadiran = (searchParams.get("kehadiran") as any) || "ALL";
    const customStartDate = searchParams.get("startDate") || "";
    const customEndDate = searchParams.get("endDate") || "";

    let startDate = `${tahun}-01-01`;
    let endDate = `${tahun}-12-31`;

    if (customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else if (bulan && bulan !== "ALL") {
      const monthNum = parseInt(bulan, 10);
      const paddedMonth = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      const lastDay = new Date(parseInt(tahun, 10), monthNum, 0).getDate();
      startDate = `${tahun}-${paddedMonth}-01`;
      endDate = `${tahun}-${paddedMonth}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;
    }

    // Ambil data agregasi rekap dari server
    const data = await getRekapKehadiranOpd({
      startDate,
      endDate,
      kategoriAgenda: kategori,
    });

    // Label periode
    let periodeLabel = `Tahun ${tahun}`;
    if (customStartDate && customEndDate) {
      periodeLabel = `${customStartDate} s/d ${customEndDate}`;
    } else if (bulan && bulan !== "ALL") {
      const bObj = NAMA_BULAN.find((b) => b.value === bulan);
      periodeLabel = `${bObj ? bObj.label : ""} ${tahun}`;
    }

    // Terapkan filter kehadiran ("ALL" atau "HADIR")
    const opdSummary = data.opdSummary.filter((item) => {
      if (kehadiran === "HADIR") {
        return item.hadir + item.mewakili > 0;
      }
      return true;
    });

    const pegawaiSummary = data.pegawaiSummary.filter((item) => {
      if (kehadiran === "HADIR") {
        return item.hadir + item.mewakili > 0;
      }
      return true;
    });

    let docElement: React.ReactElement;
    let fileName = `Laporan_Rekap_${tahun}.pdf`;

    if (tipe === "hierarki") {
      // 1. Ekstrak data kegiatan unik
      const agendaMap = new Map<
        string,
        {
          agendaId: string;
          namaKegiatan: string;
          tanggal: Date;
          pesertaHadir: {
            nama: string;
            nip?: string | null;
            jabatan: string;
            instansi: string;
            status: string;
            namaPerwakilan?: string | null;
            jabatanPerwakilan?: string | null;
            keterangan?: string | null;
            isInsideRadius?: boolean | null;
          }[];
        }
      >();

      data.opdSummary.forEach((opd) => {
        (opd.history || []).forEach((h) => {
          if (h.isCancelledSession) return;
          const dateStr = formatWita(h.tanggal, "yyyy-MM-dd");
          const key = `${h.agendaId}_${dateStr}`;

          if (!agendaMap.has(key)) {
            agendaMap.set(key, {
              agendaId: h.agendaId,
              namaKegiatan: h.namaKegiatan,
              tanggal: h.tanggal,
              pesertaHadir: [],
            });
          }

          const currentAgenda = agendaMap.get(key)!;
          (h.pesertaList || []).forEach((p) => {
            if (p.status === "HADIR" || p.status === "MEWAKILI") {
              const isAlreadyAdded = currentAgenda.pesertaHadir.some(
                (exist) =>
                  (exist.nip && p.nip && exist.nip === p.nip) ||
                  (exist.nama && exist.nama.toLowerCase() === p.nama.toLowerCase())
              );
              if (!isAlreadyAdded) {
                currentAgenda.pesertaHadir.push({
                  nama: p.nama,
                  nip: p.nip,
                  jabatan: p.jabatan || "-",
                  instansi: opd.instansi,
                  status: p.status,
                  namaPerwakilan: p.namaPerwakilan,
                  jabatanPerwakilan: p.jabatanPerwakilan,
                  keterangan: p.keterangan,
                  isInsideRadius: p.isInsideRadius,
                });
              }
            }
          });
        });
      });

      // Kelompokkan per bulan (yyyy-MM)
      const bulanMap = new Map<
        string,
        {
          bulanKey: string;
          bulanLabel: string;
          kegiatanList: typeof agendaMap extends Map<any, infer V> ? V[] : never;
        }
      >();

      Array.from(agendaMap.values()).forEach((agenda) => {
        const bKey = formatWita(agenda.tanggal, "yyyy-MM");
        const bLabel = formatWita(agenda.tanggal, "MMMM yyyy");

        if (!bulanMap.has(bKey)) {
          bulanMap.set(bKey, {
            bulanKey: bKey,
            bulanLabel: bLabel,
            kegiatanList: [],
          });
        }

        bulanMap.get(bKey)!.kegiatanList.push(agenda);
      });

      const sortedBulan = Array.from(bulanMap.values()).sort((a, b) =>
        a.bulanKey.localeCompare(b.bulanKey)
      );
      sortedBulan.forEach((bg) => {
        bg.kegiatanList.sort(
          (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
        );
      });

      const rekapPegawaiData = pegawaiSummary
        .map((p) => ({
          nama: p.nama,
          nip: p.nip,
          jabatan: p.jabatan || "-",
          instansi: p.instansi || "-",
          totalHadir: (p.hadir || 0) + (p.mewakili || 0),
          totalDiundang: p.totalDiundang || 0,
          persentaseKehadiran: p.persentaseKehadiran || 0,
        }))
        .sort((a, b) => b.totalHadir - a.totalHadir || a.nama.localeCompare(b.nama));

      docElement = React.createElement(LaporanRekapBulanKegiatanPdf, {
        tahun,
        periodeLabel,
        rekapPegawai: rekapPegawaiData,
        bulanGroups: sortedBulan,
        pageSize: "F4",
      });
      fileName = `Laporan_Rekap_Hierarki_${tahun}_${bulan}_${kehadiran}.pdf`;
    } else if (tipe === "opd") {
      docElement = React.createElement(LaporanRekapKehadiranPdf, {
        data: {
          tahun,
          periodeLabel,
          judulLaporan: "LAPORAN REKAPITULASI & EVALUASI KEHADIRAN PERANGKAT DAERAH",
          totalAgenda: data.totalAgenda,
          dataOpd: opdSummary.map((opd) => ({
            instansi: opd.instansi,
            totalDiundang: opd.totalDiundang,
            hadir: opd.hadir,
            hadirValid: opd.hadirValid,
            hadirLuarRadius: opd.hadirLuarRadius,
            hadirNonUndangan: opd.hadirNonUndangan,
            mewakili: opd.mewakili,
            tidakHadir: opd.tidakHadir,
            izin: opd.izin,
            persentaseKehadiran: opd.persentaseKehadiran,
            persentaseValidLokasi: opd.persentaseValidLokasi,
            predikatKepatuhan: opd.predikatKepatuhan,
            evaluasiSingkat: opd.evaluasiSingkat,
            history: opd.history,
          })),
        },
      });
      fileName = `Laporan_Rekap_OPD_${tahun}_${bulan}_${kehadiran}.pdf`;
    } else {
      // "pegawai"
      docElement = React.createElement(LaporanRekapPegawaiPdf, {
        data: {
          tahun,
          periodeLabel,
          judulLaporan: "LAPORAN REKAPITULASI & EVALUASI KEHADIRAN PEGAWAI",
          totalAgenda: data.totalAgenda,
          dataPegawai: pegawaiSummary.map((peg) => ({
            nama: peg.nama,
            nip: peg.nip,
            jabatan: peg.jabatan,
            instansi: peg.instansi,
            totalDiundang: peg.totalDiundang,
            hadir: peg.hadir,
            hadirValid: peg.hadirValid,
            hadirLuarRadius: peg.hadirLuarRadius,
            hadirNonUndangan: peg.hadirNonUndangan,
            mewakili: peg.mewakili,
            tidakHadir: peg.tidakHadir,
            izin: peg.izin,
            persentaseKehadiran: peg.persentaseKehadiran,
            persentaseValidLokasi: peg.persentaseValidLokasi,
            predikatKepatuhan: peg.predikatKepatuhan,
            evaluasiSingkat: peg.evaluasiSingkat,
          })),
        },
      });
      fileName = `Laporan_Rekap_Pegawai_${tahun}_${bulan}_${kehadiran}.pdf`;
    }

    // Render server-side ke buffer
    const blob = await pdf(docElement as any).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating server PDF:", error);
    return NextResponse.json(
      { error: "Gagal membuat dokumen PDF: " + (error?.message || error) },
      { status: 500 }
    );
  }
}
