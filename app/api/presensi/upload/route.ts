import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const agendaId = (formData.get("agendaId") as string) || "general";
    const nama = (formData.get("nama") as string) || "peserta";

    if (!file) {
      return NextResponse.json(
        { error: "Berkas foto wajib diunggah" },
        { status: 400 }
      );
    }

    // Validasi tipe mime
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format berkas harus berupa gambar (JPG, PNG, atau WebP)" },
        { status: 400 }
      );
    }

    // Batas ukuran 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran berkas melebihi batas maksimal 5MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = nama.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const fileName = `${safeName}_${file.name || "selfie.jpg"}`;

    const photoUrl = await uploadToR2({
      buffer,
      fileName,
      contentType: file.type || "image/jpeg",
      folder: `absensi/${agendaId}`,
    });

    return NextResponse.json({
      success: true,
      url: photoUrl,
    });
  } catch (error: any) {
    console.error("[Upload Photo Error]:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah foto" },
      { status: 500 }
    );
  }
}
