import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/google-drive/drive-client";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

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
    const result = await uploadFile(buffer, file.name, file.type, folder);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Drive upload error:", error);
    return NextResponse.json(
      { error: "Gagal upload ke Drive" },
      { status: 500 },
    );
  }
}
