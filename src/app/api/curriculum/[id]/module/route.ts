import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteFile } from "@/lib/google-drive/drive-client";

export async function DELETE(
  _request: NextRequest,
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

  const { data: curriculum, error } = await supabase
    .from("curriculums")
    .select("id, moduleDriveFileId")
    .eq("id", id)
    .single();
  if (error || !curriculum) {
    return NextResponse.json({ error: "Kurikulum tidak ditemukan" }, { status: 404 });
  }

  const fileId = curriculum.moduleDriveFileId as string | null;
  if (fileId) {
    await deleteFile(fileId).catch(() => {});
  }

  const { error: updateError } = await supabase
    .from("curriculums")
    .update({
      moduleDriveFileId: null,
      moduleFileName: null,
      moduleFileSize: null,
      moduleUpdatedAt: null,
    })
    .eq("id", id);
  if (updateError) {
    return NextResponse.json({ error: "Gagal menghapus modul" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
