import { google } from "googleapis";

let cachedToken: string | null = null;
let cachedExpiry = 0;

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedExpiry) {
    return cachedToken;
  }

  const auth = getAuth();
  const { token } = await auth.getAccessToken();

  if (!token) throw new Error("Failed to get Google access token");

  cachedToken = token;
  cachedExpiry = Date.now() + 55 * 60 * 1000;
  return token;
}

export function getRootFolderId(): string {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string,
): Promise<{ driveFileId: string; webViewLink: string }> {
  const token = await getAccessToken();
  const targetFolder = folderId || getRootFolderId();

  const metadata = {
    name: fileName,
    mimeType,
    parents: [targetFolder],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }));

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `Drive upload failed (${res.status})`);
  }

  const data = (await res.json()) as { id: string; webViewLink?: string };
  return {
    driveFileId: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

export async function deleteFile(driveFileId: string) {
  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getFileUrl(driveFileId: string): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=webViewLink`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) return `https://drive.google.com/file/d/${driveFileId}/view`;
  const data = (await res.json()) as { webViewLink?: string };
  return data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
}
