import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { privatePdfResponse } from "@/features/policies/server";

/** A policy PDF, for the in-app reader and the download button. The query runs
 * as the signed-in user: row level security decides who may see the document
 * (admins, and tutors for published packets or ones they confirmed). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document, error } = await supabase
    .from("policy_documents")
    .select("driveFileId, fileName")
    .eq("id", documentId)
    .maybeSingle();
  if (error || !document) return NextResponse.json({ error: "Dokumen tidak ditemukan" }, { status: 404 });

  try {
    return await privatePdfResponse(
      document.driveFileId,
      document.fileName,
      request.nextUrl.searchParams.get("download") === "1",
    );
  } catch (e) {
    console.error("Policy document download failed:", e);
    return NextResponse.json({ error: "Gagal mengambil file dari Drive" }, { status: 502 });
  }
}
