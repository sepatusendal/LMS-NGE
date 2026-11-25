import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteFile, uploadPrivateFile } from "@/lib/google-drive/drive-client";
import { PolicyReceiptPdf } from "@/features/policies/receipt-pdf";
import { safeFileName, sha256Hex } from "@/features/policies/server";
import {
  acknowledgeRequestSchema,
  isSignatureSufficient,
  type AcknowledgeError,
} from "@/features/policies/schema";

function fail(code: AcknowledgeError, status: number) {
  return NextResponse.json({ code }, { status });
}

function logoDataUri(): string {
  try {
    const buffer = readFileSync(resolve(process.cwd(), "public/brand/nufa-logo.png"));
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

/** A tutor confirms receipt of a published packet. The confirmation is only
 * recorded after the signed receipt PDF is safely in Drive, so a recorded
 * acknowledgement always has its evidence. Everything is re-checked here: the
 * browser's checkboxes and buttons are not trusted. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ packetId: string }> }) {
  const { packetId } = await params;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("SESSION", 401);

    const parsed = acknowledgeRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("SIGNATURE", 400);
    const { checked, signature } = parsed.data;

    // All reads below run as the tutor, so row level security applies.
    const [{ data: profile }, { data: teacher }] = await Promise.all([
      supabase.from("users").select("fullName, email, role, isActive, deletedAt").eq("id", user.id).single(),
      supabase.from("teachers").select("tutorId, isActive, deletedAt").eq("userId", user.id).maybeSingle(),
    ]);
    if (
      !profile || profile.role !== "TEACHER" || !profile.isActive || profile.deletedAt ||
      !teacher || !teacher.isActive || teacher.deletedAt
    ) {
      return fail("NOT_ELIGIBLE", 403);
    }

    const { data: packet, error: packetError } = await supabase
      .from("policy_packets")
      .select("id, title, version, status, checklistItems, statement, driveReceiptsFolderId")
      .eq("id", packetId)
      .maybeSingle();
    if (packetError) throw packetError;
    if (!packet || packet.status !== "PUBLISHED" || !packet.driveReceiptsFolderId) {
      return fail("NOT_AVAILABLE", 404);
    }

    const { data: existing, error: existingError } = await supabase
      .from("policy_acknowledgements")
      .select("id")
      .eq("packetId", packetId)
      .eq("userId", user.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return fail("ALREADY", 409);

    const { data: documents, error: documentsError } = await supabase
      .from("policy_documents")
      .select("id, title, documentNumber, versionLabel, effectiveDate, pageCount, sha256")
      .eq("packetId", packetId)
      .order("sortOrder")
      .order("id");
    if (documentsError) throw documentsError;
    if (!documents || documents.length === 0) return fail("NOT_AVAILABLE", 404);

    const { data: progress, error: progressError } = await supabase
      .from("policy_read_progress")
      .select("documentId, completedAt")
      .eq("userId", user.id)
      .in("documentId", documents.map((d) => d.id));
    if (progressError) throw progressError;
    const completed = new Set((progress ?? []).filter((p) => p.completedAt).map((p) => p.documentId));
    if (!documents.every((d) => completed.has(d.id))) return fail("NOT_READ", 400);

    const items = packet.checklistItems as string[];
    if (checked.length !== items.length || !checked.every(Boolean)) return fail("CHECKLIST", 400);
    if (!isSignatureSufficient(signature)) return fail("SIGNATURE", 400);

    const id = randomUUID();
    const acknowledgedAt = new Date();
    const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Asia/Jakarta" }).format(acknowledgedAt);
    const receiptNumber = `ACK-${year}-${id.slice(0, 8).toUpperCase()}`;
    const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

    const pdf = Buffer.from(
      await renderToBuffer(
        PolicyReceiptPdf({
          data: {
            receiptNumber,
            packetTitle: packet.title,
            packetVersion: packet.version,
            fullName: profile.fullName,
            tutorId: teacher.tutorId,
            email: profile.email,
            documents,
            checklistItems: items,
            statement: packet.statement,
            acknowledgedAt,
            userAgent,
            signature,
            logoDataUri: logoDataUri(),
          },
        }),
      ),
    );

    const receiptFileName = `${safeFileName(`${receiptNumber} - ${teacher.tutorId || "tanpa ID"} - ${profile.fullName}`)}.pdf`;
    let driveFileId: string;
    try {
      driveFileId = await uploadPrivateFile(pdf, receiptFileName, "application/pdf", packet.driveReceiptsFolderId);
    } catch (driveError) {
      console.error("Policy receipt upload failed:", driveError);
      return fail("DRIVE", 502);
    }

    // Only the service role may write acknowledgements (see the migration).
    const { error: insertError } = await createAdminClient().from("policy_acknowledgements").insert({
      id,
      packetId,
      userId: user.id,
      receiptNumber,
      fullName: profile.fullName,
      email: profile.email,
      tutorId: teacher.tutorId,
      userAgent,
      receiptDriveFileId: driveFileId,
      receiptFileName,
      receiptSha256: sha256Hex(pdf),
      acknowledgedAt: acknowledgedAt.toISOString(),
    });
    if (insertError) {
      // Nothing was recorded, so the uploaded copy would be a stray file.
      await deleteFile(driveFileId).catch(() => {});
      if (insertError.code === "23505") return fail("ALREADY", 409);
      throw insertError;
    }

    return NextResponse.json({ id, receiptNumber });
  } catch (error) {
    console.error("Policy acknowledgement failed:", error);
    return fail("SERVER", 500);
  }
}
