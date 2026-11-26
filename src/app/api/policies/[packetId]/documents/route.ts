import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/auth/assert-admin";
import { deleteFile, uploadPrivateFile } from "@/lib/google-drive/drive-client";
import { ensurePacketFolders, safeFileName, sha256Hex } from "@/features/policies/server";
import { MAX_POLICY_FILE_BYTES } from "@/features/policies/schema";
import { toPrintable, unprintableCharacters } from "@/features/policies/printable";

/** A first upload also creates the Drive folders; allow for a slow Drive. */
export const maxDuration = 60;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function optionalText(value: FormDataEntryValue | null, max: number): string | null {
  const text = typeof value === "string" ? toPrintable(value).trim().slice(0, max) : "";
  return text || null;
}

/** Admin adds one PDF to a draft packet. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ packetId: string }> }) {
  const { packetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return error("Unauthorized", 401);
  if (!(await isAdminUser(supabase, user.id))) return error("Forbidden", 403);

  try {
    const form = await request.formData();
    const file = form.get("file");
    const title = optionalText(form.get("title"), 150);
    const documentNumber = optionalText(form.get("documentNumber"), 80);
    const versionLabel = optionalText(form.get("versionLabel"), 40);
    const effectiveDate = optionalText(form.get("effectiveDate"), 10);
    const pageCount = Number(form.get("pageCount"));

    if (!(file instanceof File) || !title) return error("Judul dan file PDF wajib diisi", 400);
    // These are printed in every signed receipt.
    const unprintable = unprintableCharacters([title, documentNumber, versionLabel].join(" "));
    if (unprintable.length > 0) {
      return error(`Karakter ini tidak bisa dicetak di bukti PDF, ganti dulu: ${unprintable.join(" ")}`, 400);
    }
    if (file.size > MAX_POLICY_FILE_BYTES) return error("File terlalu besar (max 4MB)", 400);
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 500) {
      return error("Jumlah halaman PDF tidak terbaca", 400);
    }
    if (effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return error("Tanggal berlaku tidak valid", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    // Check the real signature; the declared type is only what the client says.
    if (buffer.subarray(0, 4).toString("ascii") !== "%PDF") return error("File harus berupa PDF", 400);

    const { data: packet, error: packetError } = await supabase
      .from("policy_packets")
      .select("id, title, version, status, driveFolderId, driveDocumentsFolderId, driveReceiptsFolderId")
      .eq("id", packetId)
      .maybeSingle();
    if (packetError) throw packetError;
    if (!packet) return error("Paket dokumen tidak ditemukan", 404);
    if (packet.status !== "DRAFT") return error("Dokumen yang sudah terbit tidak bisa diubah", 409);

    const { data: last, error: lastError } = await supabase
      .from("policy_documents")
      .select("sortOrder")
      .eq("packetId", packetId)
      .order("sortOrder", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;
    const sortOrder = (last?.sortOrder ?? 0) + 1;

    // A draft without documents is resolved afresh, so folders remembered from
    // an attempt that failed (for instance in a shared location) are dropped.
    let documentsFolderId: string | null = packet.driveDocumentsFolderId;
    if (!last || !documentsFolderId || !packet.driveReceiptsFolderId) {
      const folders = await ensurePacketFolders(packet);
      const { error: folderError } = await supabase.from("policy_packets").update(folders).eq("id", packetId);
      if (folderError) throw folderError;
      documentsFolderId = folders.driveDocumentsFolderId;
    }

    const fileName = `${safeFileName(`${sortOrder} - ${title}`)}.pdf`;
    const driveFileId = await uploadPrivateFile(buffer, fileName, "application/pdf", documentsFolderId);

    const { error: insertError } = await supabase.from("policy_documents").insert({
      packetId,
      sortOrder,
      title,
      documentNumber,
      versionLabel,
      effectiveDate,
      driveFileId,
      fileName,
      fileSize: buffer.length,
      sha256: sha256Hex(buffer),
      pageCount,
    });
    if (insertError) {
      await deleteFile(driveFileId).catch(() => {});
      throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Policy document upload failed:", e);
    return error(e instanceof Error ? e.message : "Gagal mengunggah dokumen", 500);
  }
}
