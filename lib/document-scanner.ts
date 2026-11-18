import { PDFDocument } from "pdf-lib";

export type ScanFilterMode = "AUTO" | "BW" | "GRAY" | "ORIGINAL";

export interface NormalizedPoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface FourCorners {
  tl: NormalizedPoint;
  tr: NormalizedPoint;
  br: NormalizedPoint;
  bl: NormalizedPoint;
}

export const DEFAULT_CORNERS: FourCorners = {
  tl: { x: 0.04, y: 0.04 },
  tr: { x: 0.96, y: 0.04 },
  br: { x: 0.96, y: 0.96 },
  bl: { x: 0.04, y: 0.96 },
};

export interface ScannedImagePage {
  id: string;
  kind: "IMAGE";
  originalDataUrl: string;
  previewDataUrl: string;
  corners: FourCorners;
  filter: ScanFilterMode;
  rotation: 0 | 90 | 180 | 270;
  fileName?: string;
}

export interface ImportedPdfPage {
  id: string;
  kind: "PDF";
  fileName: string;
  pageCount: number;
  pdfBytes: Uint8Array;
}

export type CompilerPageItem = ScannedImagePage | ImportedPdfPage;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar untuk diproses"));
    img.src = src;
  });
}

/**
 * Menyelesaikan sistem persamaan linear Ax = b dengan Gaussian Elimination + Partial Pivoting
 */
function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) {
        maxRow = r;
      }
    }
    if (Math.abs(M[maxRow][col]) < 1e-10) return null;

    if (maxRow !== col) {
      const tmp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = tmp;
    }

    const pivot = M[col][col];
    for (let c = col; c <= n; c++) {
      M[col][c] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Hitung matriks homografi 3x3 yang memetakan titik persegi tujuan (dst) ke 4 sudut sumber (src)
 */
function computeHomography(
  dst: [number, number][],
  src: [number, number][]
): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = dst[i];
    const [u, v] = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solveLinearSystem(A, b);
  if (!h) return null;
  return [...h, 1];
}

function dist2D(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function clampByte(v: number): number {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return v | 0;
}

/**
 * Menerapkan filter scan dokumen ala Google Drive / CamScanner pada ImageData
 */
function applyDocumentFilter(imageData: ImageData, mode: ScanFilterMode) {
  if (mode === "ORIGINAL") return;

  const data = imageData.data;
  const pixelCount = data.length / 4;

  // Bangun histogram luminansi untuk menentukan white-point kertas & black-point teks
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    hist[lum]++;
  }

  let acc = 0;
  let blackPoint = 0;
  let whitePoint = 255;
  const lowTarget = Math.floor(pixelCount * 0.03);
  const highTarget = Math.floor(pixelCount * 0.88);

  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= lowTarget) {
      blackPoint = i;
      break;
    }
  }
  acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= highTarget) {
      whitePoint = i;
      break;
    }
  }

  if (whitePoint - blackPoint < 32) {
    blackPoint = 0;
    whitePoint = 255;
  }

  const range = Math.max(1, whitePoint - blackPoint);

  if (mode === "AUTO") {
    // Dokumen Jernih: angkat latar kertas jadi putih bersih sambil jaga warna stempel/tinta
    const scale = 255 / range;
    for (let i = 0; i < data.length; i += 4) {
      let r = (data[i] - blackPoint) * scale;
      let g = (data[i + 1] - blackPoint) * scale;
      let b = (data[i + 2] - blackPoint) * scale;

      // Sedikit boost kontras & cerahkan area hampir putih
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 185) {
        const lift = (lum - 185) * 0.55;
        r += lift;
        g += lift;
        b += lift;
      } else if (lum < 120) {
        r *= 0.92;
        g *= 0.92;
        b *= 0.92;
      }

      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
    }
  } else if (mode === "GRAY") {
    const scale = 255 / range;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const stretched = clampByte((lum - blackPoint) * scale);
      data[i] = stretched;
      data[i + 1] = stretched;
      data[i + 2] = stretched;
    }
  } else if (mode === "BW") {
    // Hitam-Putih tajam untuk nota/kuitansi (soft threshold agar teks tidak bergerigi)
    const scale = 255 / range;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const norm = (lum - blackPoint) * scale;
      let out: number;
      if (norm > 168) {
        out = 255;
      } else if (norm < 92) {
        out = Math.max(0, norm * 0.45);
      } else {
        // Transisi kontras tinggi agar anti-aliasing teks tetap terbaca halus
        out = ((norm - 92) / (168 - 92)) * 255;
      }
      const byte = clampByte(out);
      data[i] = byte;
      data[i + 1] = byte;
      data[i + 2] = byte;
    }
  }
}

/**
 * Memproses 1 halaman foto:
 * 1. Luruskan perspektif berdasarkan 4 sudut (Homography + Bilinear Sampling)
 * 2. Terapkan filter warna scan dokumen
 * 3. Terapkan rotasi 0/90/180/270 derajat
 * 4. Kompresi ke JPEG siap simpan / kompilasi PDF
 */
export async function processScannedImagePage({
  sourceDataUrl,
  corners,
  filter,
  rotation,
  maxDimension = 1600,
  jpegQuality = 0.8,
}: {
  sourceDataUrl: string;
  corners: FourCorners;
  filter: ScanFilterMode;
  rotation: 0 | 90 | 180 | 270;
  maxDimension?: number;
  jpegQuality?: number;
}): Promise<string> {
  const img = await loadImageElement(sourceDataUrl);

  // Batasi resolusi kanvas sumber agar komputasi warp sangat cepat di HP
  const srcMax = Math.max(maxDimension, 1800);
  let srcW = img.naturalWidth || img.width;
  let srcH = img.naturalHeight || img.height;
  if (srcW > srcMax || srcH > srcMax) {
    const ratio = Math.min(srcMax / srcW, srcMax / srcH);
    srcW = Math.round(srcW * ratio);
    srcH = Math.round(srcH * ratio);
  }

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!srcCtx) throw new Error("Canvas 2D tidak didukung browser");
  srcCtx.drawImage(img, 0, 0, srcW, srcH);

  // Konversi koordinat 4 sudut (0..1) ke piksel sumber
  const pTL: [number, number] = [corners.tl.x * srcW, corners.tl.y * srcH];
  const pTR: [number, number] = [corners.tr.x * srcW, corners.tr.y * srcH];
  const pBR: [number, number] = [corners.br.x * srcW, corners.br.y * srcH];
  const pBL: [number, number] = [corners.bl.x * srcW, corners.bl.y * srcH];

  // Estimasi dimensi output proporsional dari jarak tepi atas/bawah & kiri/kanan
  const widthTop = dist2D(pTL, pTR);
  const widthBottom = dist2D(pBL, pBR);
  const heightLeft = dist2D(pTL, pBL);
  const heightRight = dist2D(pTR, pBR);

  let outW = Math.max(200, Math.round(Math.max(widthTop, widthBottom)));
  let outH = Math.max(200, Math.round(Math.max(heightLeft, heightRight)));

  if (outW > maxDimension || outH > maxDimension) {
    const scale = Math.min(maxDimension / outW, maxDimension / outH);
    outW = Math.max(200, Math.round(outW * scale));
    outH = Math.max(200, Math.round(outH * scale));
  }

  const warpedCanvas = document.createElement("canvas");
  warpedCanvas.width = outW;
  warpedCanvas.height = outH;
  const warpedCtx = warpedCanvas.getContext("2d");
  if (!warpedCtx) throw new Error("Gagal membuat kanvas hasil scan");

  // Cek apakah 4 sudut adalah persegi penuh tanpa miring (shortcut ultra-cepat)
  const isFullRect =
    corners.tl.x <= 0.005 &&
    corners.tl.y <= 0.005 &&
    corners.tr.x >= 0.995 &&
    corners.tr.y <= 0.005 &&
    corners.br.x >= 0.995 &&
    corners.br.y >= 0.995 &&
    corners.bl.x <= 0.005 &&
    corners.bl.y >= 0.995;

  if (isFullRect) {
    warpedCtx.drawImage(srcCanvas, 0, 0, outW, outH);
  } else {
    const H = computeHomography(
      [
        [0, 0],
        [outW - 1, 0],
        [outW - 1, outH - 1],
        [0, outH - 1],
      ],
      [pTL, pTR, pBR, pBL]
    );

    if (!H) {
      warpedCtx.drawImage(srcCanvas, 0, 0, outW, outH);
    } else {
      const srcImgData = srcCtx.getImageData(0, 0, srcW, srcH);
      const srcData = srcImgData.data;
      const dstImgData = warpedCtx.createImageData(outW, outH);
      const dstData = dstImgData.data;

      const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = H;
      const maxX = srcW - 1;
      const maxY = srcH - 1;

      for (let y = 0; y < outH; y++) {
        const yOff = y * outW * 4;
        const h1y_h2 = h1 * y + h2;
        const h4y_h5 = h4 * y + h5;
        const h7y_h8 = h7 * y + h8;

        for (let x = 0; x < outW; x++) {
          const w = h6 * x + h7y_h8;
          const sx = (h0 * x + h1y_h2) / w;
          const sy = (h3 * x + h4y_h5) / w;
          const dIdx = yOff + x * 4;

          if (sx >= 0 && sx < maxX && sy >= 0 && sy < maxY) {
            const x0 = sx | 0;
            const y0 = sy | 0;
            const fx = sx - x0;
            const fy = sy - y0;
            const ifx = 1 - fx;
            const ify = 1 - fy;

            const i00 = (y0 * srcW + x0) * 4;
            const i10 = i00 + 4;
            const i01 = i00 + srcW * 4;
            const i11 = i01 + 4;

            const w00 = ifx * ify;
            const w10 = fx * ify;
            const w01 = ifx * fy;
            const w11 = fx * fy;

            dstData[dIdx] =
              (srcData[i00] * w00 +
                srcData[i10] * w10 +
                srcData[i01] * w01 +
                srcData[i11] * w11) |
              0;
            dstData[dIdx + 1] =
              (srcData[i00 + 1] * w00 +
                srcData[i10 + 1] * w10 +
                srcData[i01 + 1] * w01 +
                srcData[i11 + 1] * w11) |
              0;
            dstData[dIdx + 2] =
              (srcData[i00 + 2] * w00 +
                srcData[i10 + 2] * w10 +
                srcData[i01 + 2] * w01 +
                srcData[i11 + 2] * w11) |
              0;
            dstData[dIdx + 3] = 255;
          } else {
            // Area di luar foto diisi putih bersih
            dstData[dIdx] = 255;
            dstData[dIdx + 1] = 255;
            dstData[dIdx + 2] = 255;
            dstData[dIdx + 3] = 255;
          }
        }
      }
      warpedCtx.putImageData(dstImgData, 0, 0);
    }
  }

  // Terapkan filter scan dokumen
  if (filter !== "ORIGINAL") {
    const imgData = warpedCtx.getImageData(0, 0, outW, outH);
    applyDocumentFilter(imgData, filter);
    warpedCtx.putImageData(imgData, 0, 0);
  }

  // Terapkan rotasi jika != 0
  let finalCanvas = warpedCanvas;
  if (rotation !== 0) {
    const rotCanvas = document.createElement("canvas");
    if (rotation === 90 || rotation === 270) {
      rotCanvas.width = outH;
      rotCanvas.height = outW;
    } else {
      rotCanvas.width = outW;
      rotCanvas.height = outH;
    }
    const rCtx = rotCanvas.getContext("2d");
    if (rCtx) {
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate((rotation * Math.PI) / 180);
      rCtx.drawImage(warpedCanvas, -outW / 2, -outH / 2);
      finalCanvas = rotCanvas;
    }
  }

  return finalCanvas.toDataURL("image/jpeg", jpegQuality);
}

/**
 * Mengonversi File gambar menjadi Data URL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar"));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Mengompilasi kumpulan halaman (foto hasil scan + PDF impor) menjadi 1 file PDF A4 utuh di sisi client
 */
export async function compilePagesToPdf(
  pages: CompilerPageItem[],
  metadata?: { title?: string }
): Promise<{ pdfBytes: Uint8Array; totalPages: number }> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("SIPADIN Document Scanner");
  pdfDoc.setProducer("SIPADIN - Pemerintah Kabupaten Kutai Barat");
  if (metadata?.title) {
    pdfDoc.setTitle(metadata.title);
  }

  // Ukuran standar A4 dalam PDF points (72 DPI): 595.28 x 841.89
  const A4_SHORT = 595.28;
  const A4_LONG = 841.89;
  const MARGIN = 18;

  let totalPages = 0;

  for (const item of pages) {
    if (item.kind === "PDF") {
      const srcPdf = await PDFDocument.load(item.pdfBytes);
      const indices = srcPdf.getPageIndices();
      const copiedPages = await pdfDoc.copyPages(srcPdf, indices);
      for (const cp of copiedPages) {
        pdfDoc.addPage(cp);
        totalPages += 1;
      }
    } else {
      const jpgBytes = dataUrlToBytes(item.previewDataUrl);
      const embeddedImg = await pdfDoc.embedJpg(jpgBytes);
      const { width: imgW, height: imgH } = embeddedImg.scale(1);

      const isLandscape = imgW > imgH;
      const pageW = isLandscape ? A4_LONG : A4_SHORT;
      const pageH = isLandscape ? A4_SHORT : A4_LONG;

      const page = pdfDoc.addPage([pageW, pageH]);
      const availW = pageW - MARGIN * 2;
      const availH = pageH - MARGIN * 2;
      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;

      page.drawImage(embeddedImg, {
        x,
        y,
        width: drawW,
        height: drawH,
      });
      totalPages += 1;
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return { pdfBytes, totalPages };
}
