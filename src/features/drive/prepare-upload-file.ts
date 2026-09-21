// Hosting caps a serverless request body at ~4.5 MB, well below what a phone
// camera photo often is (5-12 MB). Anything over that is rejected by the
// platform itself, before /api/drive/upload ever runs, with a non-JSON 413 —
// so photos have to be shrunk in the browser first.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const COMPRESS_ABOVE_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1920;

export type UploadErrorCode = "TOO_LARGE" | "NETWORK" | "SESSION" | "FORBIDDEN" | "SERVER";

export class UploadError extends Error {
  code: UploadErrorCode;
  constructor(code: UploadErrorCode, message?: string) {
    super(message ?? code);
    this.name = "UploadError";
    this.code = code;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const baseScale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    // Progressively harsher passes until it fits; the last one is kept even
    // if still over the limit so the caller can decide what to do.
    const passes = [
      { scale: baseScale, quality: 0.82 },
      { scale: baseScale, quality: 0.65 },
      { scale: baseScale * 0.7, quality: 0.65 },
    ];

    let best: Blob | null = null;
    for (const { scale, quality } of passes) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      // JPEG has no alpha — paint white first so transparent PNGs don't go black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      best = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) break;
    }

    if (!best) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([best], name, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

/** Shrinks large photos in the browser and enforces the upload size limit.
 * PDFs and small images pass through untouched. Throws UploadError("TOO_LARGE")
 * when the file still can't fit (e.g. a big PDF). */
export async function prepareUploadFile(file: File): Promise<File> {
  let result = file;

  const isCompressibleImage =
    file.type.startsWith("image/") && file.type !== "image/gif" && file.size > COMPRESS_ABOVE_BYTES;
  if (isCompressibleImage) {
    try {
      const compressed = await compressImage(file);
      if (compressed.size < file.size) result = compressed;
    } catch {
      // Browser couldn't decode it (e.g. HEIC on a desktop browser) — fall
      // through and let the size check / server decide about the original.
    }
  }

  if (result.size > MAX_UPLOAD_BYTES) throw new UploadError("TOO_LARGE");
  return result;
}
