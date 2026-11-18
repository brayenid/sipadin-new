import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSpjR2Folder, slugifyPathSegment, uploadToR2WithKey } from "@/lib/r2";

const MAX_SPJ_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.teamId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const spjId = String(formData.get("spjId") || "").trim();
    const judulRaw = String(formData.get("judul") || "").trim();
    const kategoriRaw = String(formData.get("kategori") || "BUNDEL_SPJ").trim();
    const jumlahHalamanRaw = Number(formData.get("jumlahHalaman") || 1);

    if (!spjId) {
      return NextResponse.json({ error: "ID SPJ wajib disertakan." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas PDF tidak ditemukan." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Berkas PDF kosong." }, { status: 400 });
    }

    if (file.size > MAX_SPJ_PDF_BYTES) {
      return NextResponse.json(
        { error: "Ukuran PDF melebihi batas maksimal 20 MB." },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validasi header PDF (%PDF-)
    const header = buffer.subarray(0, 5).toString("ascii");
    if (!header.startsWith("%PDF-")) {
      return NextResponse.json(
        { error: "Format berkas harus berupa dokumen PDF yang valid." },
        { status: 400 }
      );
    }

    // Verifikasi kepemilikan SPJ & ambil konteks untuk struktur folder R2 yang rapi
    const spj = await prisma.spj.findFirst({
      where: {
        id: spjId,
        teamId: session.user.teamId,
      },
      include: {
        team: { select: { name: true } },
        kodeRekening: {
          select: {
            subKegiatan: {
              select: {
                kegiatan: {
                  select: {
                    tahunAnggaran: { select: { tahun: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!spj) {
      return NextResponse.json(
        { error: "Data SPJ tidak ditemukan atau bukan milik tim Anda." },
        { status: 404 }
      );
    }

    const tahun =
      spj.kodeRekening?.subKegiatan?.kegiatan?.tahunAnggaran?.tahun ||
      new Date(spj.tanggalSpj).getFullYear();

    const folder = buildSpjR2Folder({
      tahun,
      teamName: spj.team?.name,
      jenisSpj: spj.jenisSpj,
      tanggalSpj: spj.tanggalSpj,
      spjId: spj.id,
    });

    const judul = judulRaw || `Bukti Dukung ${spj.jenisSpj}`;
    const safeSlug = slugifyPathSegment(judul, "bukti-dukung");
    const fileName = `${safeSlug}.pdf`;

    const { url, key } = await uploadToR2WithKey({
      buffer,
      fileName,
      contentType: "application/pdf",
      folder,
      maxSizeBytes: MAX_SPJ_PDF_BYTES,
    });

    const created = await prisma.spjBuktiDukung.create({
      data: {
        spjId: spj.id,
        teamId: session.user.teamId,
        createdById: session.user.id,
        judul,
        kategori: kategoriRaw || "BUNDEL_SPJ",
        fileUrl: url,
        fileKey: key,
        mimeType: "application/pdf",
        fileSize: buffer.length,
        jumlahHalaman: Number.isFinite(jumlahHalamanRaw) && jumlahHalamanRaw > 0 ? Math.round(jumlahHalamanRaw) : 1,
      },
    });

    revalidatePath("/dashboard/spj");
    revalidatePath(`/dashboard/spj/${spj.id}`);

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    console.error("[SPJ Upload Bukti Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengunggah bukti dukung PDF." },
      { status: 500 }
    );
  }
}
