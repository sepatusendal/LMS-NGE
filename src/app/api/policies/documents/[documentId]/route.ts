import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/auth/assert-admin";
import { deleteFile } from "@/lib/google-drive/drive-client";

/** Admin removes a document from a draft packet. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(supabase, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // The database guard rejects this once the packet is published.
  const { data: deleted, error } = await supabase
    .from("policy_documents")
    .delete()
    .eq("id", documentId)
    .select("driveFileId");
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });
  }

  await deleteFile(deleted[0].driveFileId).catch(() => {});
  return NextResponse.json({ ok: true });
}
