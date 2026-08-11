import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/google-drive/drive-client";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// `file.type` is just the client-supplied multipart Content-Type — trivially
// spoofable (rename anything to .pdf, or forge the part header). Sniff the
// actual file signature instead of trusting it, so an arbitrary/executable
// upload can't pass itself off as a PDF or image.
function sniffFileType(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
      buffer.subarray(0, 6).toString("ascii") === "GIF89a")
  ) {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  // HEIC/HEIF — the default camera format on iPhone (unless "Most
  // Compatible" is set), so this MUST be recognized or every iPhone check-in
  // photo upload fails. ISO base media file format: bytes 4-8 are "ftyp",
  // followed by a 4-byte major brand.
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return "image/bmp";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File terlalu besar (max 10MB)" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "File harus berupa gambar atau PDF" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffedType = sniffFileType(buffer);
    if (!sniffedType) {
      return NextResponse.json(
        { error: "File tidak valid atau rusak (bukan gambar/PDF asli)" },
        { status: 400 },
      );
    }
    // The declared type only has to agree on category (image vs PDF) — a
    // JPEG re-saved as .png is still a legitimate image, we just don't want
    // an executable/script wearing a PDF's Content-Type.
    const declaredIsPdf = file.type === "application/pdf";
    const sniffedIsPdf = sniffedType === "application/pdf";
    if (declaredIsPdf !== sniffedIsPdf) {
      return NextResponse.json(
        { error: "File tidak valid atau rusak (bukan gambar/PDF asli)" },
        { status: 400 },
      );
    }

    const result = await uploadFile(buffer, file.name, sniffedType, folder);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Drive upload error:", error);
    return NextResponse.json(
      { error: "Gagal upload ke Drive" },
      { status: 500 },
    );
  }
}
