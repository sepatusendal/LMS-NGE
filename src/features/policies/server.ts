import "server-only";
import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { downloadFile, findOrCreateFolder, getRootFolderId } from "@/lib/google-drive/drive-client";

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Safe for a Drive file name and for a Content-Disposition header. */
export function safeFileName(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w .()&-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "dokumen"
  );
}

/** Drive layout, one folder per packet version:
 *  HR - Policy Acknowledgement / <title> (v1) <short id> / 01 Dokumen Terbit
 *                                                       / 02 Bukti Penerimaan
 * Only called while an admin is uploading to a draft, so people confirming at
 * the same time never race to create folders. */
export async function ensurePacketFolders(packet: { id: string; title: string; version: number }) {
  const rootId = await findOrCreateFolder("HR - Policy Acknowledgement", getRootFolderId());
  const packetFolderId = await findOrCreateFolder(
    `${safeFileName(packet.title)} (v${packet.version}) ${packet.id.slice(0, 8)}`,
    rootId,
  );
  return {
    driveFolderId: packetFolderId,
    driveDocumentsFolderId: await findOrCreateFolder("01 Dokumen Terbit", packetFolderId),
    driveReceiptsFolderId: await findOrCreateFolder("02 Bukti Penerimaan", packetFolderId),
  };
}

/** Streams a private Drive PDF to a caller whose access was already checked. */
export async function privatePdfResponse(driveFileId: string, fileName: string, asDownload: boolean) {
  const file = await downloadFile(driveFileId);
  return new NextResponse(file.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${safeFileName(fileName.replace(/\.pdf$/i, ""))}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
