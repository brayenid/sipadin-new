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

export async function uploadToR2({
  buffer,
  fileName,
  contentType = "image/jpeg",
  folder = "absensi",
}: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  folder?: string;
}): Promise<string> {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // Maksimal 5MB
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("Ukuran berkas melebihi batas maksimal 5MB");
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const key = `${folder}/${Date.now()}_${sanitizedFileName}`;
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

      if (publicUrl) {
        return `${publicUrl}/${key}`;
      }
      return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
    } catch (error: any) {
      console.error("[R2 Upload Error in Production]:", error);
      throw new Error(`Gagal mengunggah foto ke Cloudflare R2: ${error.message || "Unknown error"}`);
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

      if (publicUrl) {
        return `${publicUrl}/${key}`;
      }
      return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`;
    } catch (error) {
      console.warn("[R2 Upload Warning (Dev Mode)]: Gagal upload ke R2, beralih ke penyimpanan lokal...", error);
    }
  }

  // Fallback lokal hanya untuk mode Development offline
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, `${Date.now()}_${sanitizedFileName}`);
    fs.writeFileSync(localFilePath, buffer);
    const localFileName = path.basename(localFilePath);
    return `/uploads/${folder}/${localFileName}`;
  } catch (localErr) {
    console.error("[Local Storage Fallback Error]:", localErr);
    // Jika write disk dev gagal, fallback data URI
    const base64 = buffer.toString("base64");
    return `data:${contentType};base64,${base64}`;
  }
}

/**
 * Menghapus file foto baik dari Cloudflare R2 / S3 maupun dari direktori lokal server
 */
export async function deleteFromR2OrLocal(fileUrl: string | null | undefined): Promise<boolean> {
  if (!fileUrl) return false;

  try {
    // 1. Kasus Local file: /uploads/absensi/...
    if (fileUrl.startsWith("/uploads/")) {
      const relativePath = fileUrl.replace(/^\//, "");
      const fullPath = path.join(process.cwd(), "public", relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    }

    // 2. Kasus Cloudflare R2 / S3
    if (s3Client) {
      let key = "";
      if (publicUrl && fileUrl.startsWith(publicUrl)) {
        key = fileUrl.replace(`${publicUrl}/`, "");
      } else if (fileUrl.includes(".r2.cloudflarestorage.com/")) {
        const parts = fileUrl.split(".r2.cloudflarestorage.com/");
        if (parts.length > 1) {
          key = parts[1];
        }
      } else if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
        const parsed = new URL(fileUrl);
        key = parsed.pathname.replace(/^\//, "");
      }

      if (key) {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        );
        return true;
      }
    }
  } catch (err) {
    console.error("[Delete File Error]:", err);
  }

  return false;
}
