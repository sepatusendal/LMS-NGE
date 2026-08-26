import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/auth/assert-admin";
import { deleteFile, setPublicReadable } from "@/lib/google-drive/drive-client";

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
  const driveFileId = body?.driveFileId as string | undefined;
  const fileName = body?.fileName as string | undefined;
  const fileSize = body?.fileSize as number | undefined;

  if (!driveFileId || !fileName) {
    return NextResponse.json({ error: "Data upload tidak lengkap" }, { status: 400 });
  }

  const { data: curriculum, error } = await supabase
    .from("curriculums")
    .select("id, moduleDriveFileId")
    .eq("id", id)
    .single();
  if (error || !curriculum) {
    return NextResponse.json({ error: "Kurikulum tidak ditemukan" }, { status: 404 });
  }

  try {
    await setPublicReadable(driveFileId);

    const { error: updateError } = await supabase
      .from("curriculums")
      .update({
        moduleDriveFileId: driveFileId,
        moduleFileName: fileName,
        moduleFileSize: fileSize ?? null,
        moduleUpdatedAt: new Date().toISOString(),
      })
      .eq("id", id);
    if (updateError) throw updateError;

    const previousFileId = curriculum.moduleDriveFileId as string | null;
    if (previousFileId && previousFileId !== driveFileId) {
      await deleteFile(previousFileId).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Curriculum module upload complete error:", err);
    return NextResponse.json({ error: "Gagal menyimpan modul" }, { status: 500 });
  }
}
