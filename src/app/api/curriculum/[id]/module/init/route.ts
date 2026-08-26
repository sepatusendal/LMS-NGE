import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/auth/assert-admin";
import {
  findOrCreateFolder,
  getRootFolderId,
  initResumableUpload,
} from "@/lib/google-drive/drive-client";

// Modules are PDFs of a whole program's syllabus/materi — 70-130MB is normal
// for these. 500MB is a sane upper bound to catch someone picking the wrong
// file, not a real expected size.
const MAX_MODULE_SIZE = 500 * 1024 * 1024;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdminUser(supabase, user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const fileName = body?.fileName as string | undefined;
  const fileSize = body?.fileSize as number | undefined;

  if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "File modul harus berupa PDF" }, { status: 400 });
  }
  if (!fileSize || fileSize <= 0 || fileSize > MAX_MODULE_SIZE) {
    return NextResponse.json({ error: "Ukuran file tidak valid (maks 500MB)" }, { status: 400 });
  }

  const { data: curriculum, error } = await supabase
    .from("curriculums")
    .select("id, name")
    .eq("id", id)
    .single();
  if (error || !curriculum) {
    return NextResponse.json({ error: "Kurikulum tidak ditemukan" }, { status: 404 });
  }

  try {
    const modulesRoot = await findOrCreateFolder("Modul Kelas", getRootFolderId());
    const folderId = await findOrCreateFolder(curriculum.name, modulesRoot);
    const uploadUrl = await initResumableUpload(fileName, "application/pdf", fileSize, folderId);
    return NextResponse.json({ uploadUrl });
  } catch (err) {
    console.error("Curriculum module upload init error:", err);
    return NextResponse.json({ error: "Gagal memulai upload ke Drive" }, { status: 500 });
  }
}
