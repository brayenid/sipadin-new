/**
 * Utilitas Kompresi Gambar di Sisi Klien (Browser Canvas)
 * Mengubah foto kamera ponsel berukuran besar (5-15MB) menjadi WebP/JPEG ringan (~150-250KB)
 * sebelum diunggah ke server.
 */

export async function compressImage(
  fileOrBlob: File | Blob,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: string;
  } = {}
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const {
    maxWidth = 720,
    maxHeight = 720,
    quality = 0.72,
    mimeType = "image/jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Pertahankan rasio aspek
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menginisialisasi canvas context"));
          return;
        }

        // Gambar ke canvas dengan smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert ke blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Kompresi gambar gagal menghasilkan blob"));
              return;
            }
            const dataUrl = canvas.toDataURL(mimeType, quality);
            resolve({ blob, dataUrl, width, height });
          },
          mimeType,
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
