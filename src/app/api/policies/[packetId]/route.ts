import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/auth/assert-admin";
import { deleteFile } from "@/lib/google-drive/drive-client";

/** Admin discards a draft. The database refuses to delete anything that was
 * ever published. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ packetId: string }> }) {
  const { packetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(supabase, user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: documents, error: documentsError } = await supabase
    .from("policy_documents")
    .select("driveFileId")
    .eq("packetId", packetId);
  if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 500 });

  const { data: deleted, error } = await supabase
    .from("policy_packets")
    .delete()
    .eq("id", packetId)
    .eq("status", "DRAFT")
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: "Hanya draft yang bisa dihapus" }, { status: 409 });
  }

  // Files go only after the rows are gone; a leftover file is harmless.
  await Promise.all((documents ?? []).map((d) => deleteFile(d.driveFileId).catch(() => {})));
  return NextResponse.json({ ok: true });
}
