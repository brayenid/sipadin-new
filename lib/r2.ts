import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "sipadin-absensi";
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "");

// Inisialisasi S3 Client untuk Cloudflare R2 jika kredensial tersedia
const s3Client =
  accountId && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

export function slugifyPathSegment(value: string, fallback = "umum"): string {
  const cleaned = (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || fallback;
}

/**
 * Membangun struktur direktori R2 yang rapi dan mudah diaudit untuk dokumen SPJ:
 * spj/{tahun}/{teamSlug}/{jenisSpj}/{bulan}-{spjShortId}
 */
export function buildSpjR2Folder({
  tahun,
  teamName,
  jenisSpj,
  tanggalSpj,
  spjId,
}: {
  tahun?: number | string | null;
  teamName?: string | null;
  jenisSpj?: string | null;
  tanggalSpj?: Date | string | null;
  spjId: string;
}): string {
  const dateObj = tanggalSpj ? new Date(tanggalSpj) : new Date();
  const safeYear =
    tahun && String(tahun).trim()
      ? String(tahun).replace(/[^0-9]/g, "")
      : String(dateObj.getFullYear());
  const safeMonth = String(dateObj.getMonth() + 1).padStart(2, "0");
  const teamSlug = slugifyPathSegment(teamName || "", "tim");
  const jenisSlug = slugifyPathSegment(jenisSpj || "", "umum");
  const shortId = (spjId || "spj").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();

  return `spj/${safeYear}/${teamSlug}/${jenisSlug}/${safeMonth}-${shortId}`;
}

export async function uploadToR2WithKey({
  buffer,
  fileName,
  contentType = "image/jpeg",
  folder = "absensi",
  maxSizeBytes = 5 * 1024 * 1024,
}: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  folder?: string;
  maxSizeBytes?: number;
}): Promise<{ url: string; key: string | null }> {
  if (buffer.length > maxSizeBytes) {
    const limitMb = Math.round((maxSizeBytes / (1024 * 1024)) * 10) / 10;
    throw new Error(`Ukuran berkas melebihi batas maksimal ${limitMb}MB`);
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const key = `${cleanFolder}/${Date.now()}_${sanitizedFileName}`;
  const isProd = process.env.NODE_ENV === "production";

  // Mode Produksi: Wajib menggunakan Cloudflare R2 (Tidak boleh fallback ke lokal server)
  if (isProd) {
    if (!s3Client) {
      console.error("[R2 Error]: Kredensial Cloudflare R2 belum disetel pada mode produksi");
      throw new Error("Penyimpanan Cloudflare R2 belum dikonfigurasi pada server produksi");
    }

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const url = publicUrl
        ? `${publicUrl}/${key}`
        : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
      return { url, key };
    } catch (error: any) {
      console.error("[R2 Upload Error in Production]:", error);
      throw new Error(
        `Gagal mengunggah berkas ke Cloudflare R2: ${error.message || "Unknown error"}`
      );
    }
  }

  // Mode Development / Staging: Coba R2 terlebih dahulu jika kredensial ada
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const url = publicUrl
        ? `${publicUrl}/${key}`
        : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
      return { url, key };
    } catch (error) {
      console.warn(
        "[R2 Upload Warning (Dev Mode)]: Gagal upload ke R2, beralih ke penyimpanan lokal...",
        error
      );
    }
  }

  // Fallback lokal hanya untuk mode Development offline
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", ...cleanFolder.split("/"));
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFileName = `${Date.now()}_${sanitizedFileName}`;
    const localFilePath = path.join(uploadDir, localFileName);
    fs.writeFileSync(localFilePath, buffer);
    return { url: `/uploads/${cleanFolder}/${localFileName}`, key: null };
  } catch (localErr) {
    console.error("[Local Storage Fallback Error]:", localErr);
    const base64 = buffer.toString("base64");
    return { url: `data:${contentType};base64,${base64}`, key: null };
  }
}

export async function uploadToR2({
  buffer,
  fileName,
  contentType = "image/jpeg",
  folder = "absensi",
  maxSizeBytes = 5 * 1024 * 1024,
}: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  folder?: string;
  maxSizeBytes?: number;
}): Promise<string> {
  const { url } = await uploadToR2WithKey({
    buffer,
    fileName,
    contentType,
    folder,
    maxSizeBytes,
  });
  return url;
}

/**
 * Menghapus file baik dari Cloudflare R2 / S3 (berdasarkan key atau URL) maupun dari direktori lokal server
 */
export async function deleteFromR2OrLocal(
  fileUrl: string | null | undefined,
  explicitKey?: string | null,
  options?: { strict?: boolean }
): Promise<boolean> {
  if (!fileUrl && !explicitKey) return false;
  const strict = Boolean(options?.strict);

  try {
    // 1. Kasus Local file: /uploads/...
    if (fileUrl && fileUrl.startsWith("/uploads/")) {
      const relativePath = fileUrl.replace(/^\//, "");
      const fullPath = path.join(process.cwd(), "public", relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return true; // File lokal sudah tidak ada di disk
    }

    // 2. Resolusi key R2
    let key = explicitKey ? explicitKey.trim() : "";
    if (!key && fileUrl) {
      if (publicUrl && fileUrl.startsWith(publicUrl)) {
        key = fileUrl.slice(publicUrl.length);
      } else if (fileUrl.includes(".r2.cloudflarestorage.com/")) {
        const parts = fileUrl.split(".r2.cloudflarestorage.com/");
        if (parts.length > 1) {
          key = parts[1];
        }
      } else if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        const parsed = new URL(fileUrl);
        const pathNoSlash = parsed.pathname.replace(/^\/+/, "");
        if (pathNoSlash.startsWith("spj/") || pathNoSlash.startsWith("absensi/")) {
          key = pathNoSlash;
        }
      }
    }

    if (key) {
      key = decodeURIComponent(key).replace(/^\/+/, "");
    }

    // 3. Hapus objek di Cloudflare R2
    if (key) {
      if (!s3Client) {
        const msg = "Kredensial Cloudflare R2 belum dikonfigurasi untuk menghapus berkas.";
        console.error("[R2 Delete Error]:", msg);
        if (strict) throw new Error(msg);
        return false;
      }

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );
      return true;
    }

    return false;
  } catch (err: any) {
    console.error("[Delete File Error]:", err);
    if (strict) {
      throw new Error(
        `Gagal menghapus berkas dari Cloudflare R2: ${err?.message || "Unknown error"}`
      );
    }
    return false;
  }
}
