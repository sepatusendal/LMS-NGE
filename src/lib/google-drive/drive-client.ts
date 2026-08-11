import { google } from "googleapis";

// A standalone (non-Workspace) service account has zero Drive storage quota
// of its own — uploads fail outright unless the target is a Shared Drive,
// which requires paid Workspace. This app authenticates as a real Google
// account instead (via a refresh token obtained once through
// scripts/google-oauth-setup.ts), so files land in that account's own
// storage and behave like a normal Drive upload.
let cachedToken: string | null = null;
let cachedExpiry = 0;

function getAuth() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
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

/** Finds a folder by exact name directly under `parentId`, creating it if it
 * doesn't exist yet. Used to lay out Parent Report PDFs as
 * root / {school} / {student} / Laporan-....pdf instead of dumping every
 * file flat into one folder. */
export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const token = await getAccessToken();
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = `name = '${escapedName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (searchRes.ok) {
    const searchData = (await searchRes.json()) as { files?: { id: string }[] };
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ error: { message: createRes.statusText } }));
    throw new Error(err.error?.message ?? `Gagal membuat folder Drive "${name}" (${createRes.status})`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
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
