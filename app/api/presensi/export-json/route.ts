import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [pegawais, agendas, sesis, templates, kehadiran] = await Promise.all([
      prisma.pegawai.findMany({
        select: {
          id: true,
          nip: true,
          nama: true,
          pangkat: true,
          golongan: true,
          jabatan: true,
          instansi: true,
          eselon: true,
          kategoriPegawai: true,
          wajibAbsenOpd: true,
          urutanOpd: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { nama: "asc" },
      }),
      prisma.agendaAbsensi.findMany({
        where: { isDeleted: false },
        orderBy: { tanggal: "desc" },
      }),
      prisma.sesiAgendaAbsensi.findMany({
        orderBy: { tanggalSesi: "desc" },
      }),
      prisma.agendaPesertaTemplate.findMany(),
      prisma.kehadiranPeserta.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const exportPayload = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      source: "SIPADIN",
      counts: {
        pegawai: pegawais.length,
        agenda: agendas.length,
        sesi: sesis.length,
        template: templates.length,
        kehadiran: kehadiran.length,
      },
      data: {
        pegawais,
        agendas,
        sesis,
        templates,
        kehadiran,
      },
    };

    const fileName = `sipadin-presensi-export-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("[Export Presensi Error]:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengekspor data presensi" },
      { status: 500 }
    );
  }
}
