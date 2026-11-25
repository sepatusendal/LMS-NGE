import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { privatePdfResponse } from "@/features/policies/server";

/** A signed receipt. Row level security limits it to its owner and admins. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ acknowledgementId: string }> }) {
  const { acknowledgementId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: acknowledgement, error } = await supabase
    .from("policy_acknowledgements")
    .select("receiptDriveFileId, receiptFileName")
    .eq("id", acknowledgementId)
    .maybeSingle();
  if (error || !acknowledgement) return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 });

  try {
    return await privatePdfResponse(
      acknowledgement.receiptDriveFileId,
      acknowledgement.receiptFileName,
      request.nextUrl.searchParams.get("download") === "1",
    );
  } catch (e) {
    console.error("Policy receipt download failed:", e);
    return NextResponse.json({ error: "Gagal mengambil file dari Drive" }, { status: 502 });
  }
}
