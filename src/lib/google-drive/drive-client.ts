import { google } from "googleapis";

// A standalone (non-Workspace) service account has zero Drive storage quota
// of its own — uploads fail outright unless the target is a Shared Drive,
// which requires paid Workspace. This app authenticates as a real Google
// account instead (via a refresh token obtained once through
// scripts/google-oauth-setup.ts), so files land in that account's own
// storage and behave like a normal Drive upload.
//
// Parent Reports and check-in/report photos are deliberately shared as
// "anyone with the link can view" — parents have already consented to this
// (see USER-MANAGEMENT.md / product context) so the link just works with no
// extra login step. That design choice is intentional; what follows here is
// about making sure the *mechanics* of getting a file onto Drive and shared
// don't silently fail.
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

/** `forceRefresh` bypasses the cache — used when a request comes back 401,
 * since that means the cached token is no longer valid regardless of our
 * local expiry clock (revoked, clock skew, Google-side invalidation). */
async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedExpiry) {
    return cachedToken;
  }

  if (!process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    throw new Error(
      "GOOGLE_OAUTH_REFRESH_TOKEN belum di-set — jalankan scripts/google-oauth-setup.ts untuk mendapatkan refresh token baru.",
    );
  }

  const auth = getAuth();
  let token: string | null | undefined;
  try {
    ({ token } = await auth.getAccessToken());
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    // googleapis throws its own shape here (often just { message: "invalid_grant" }
    // wrapped in a GaxiosError) — normalize to a clear, actionable message rather
    // than letting a cryptic library error bubble up to the caller.
    throw new Error(
      `Gagal menyegarkan token Google Drive (${reason}). Kemungkinan refresh token sudah dicabut/kedaluwarsa — perlu dijalankan ulang scripts/google-oauth-setup.ts.`,
    );
  }

  if (!token) throw new Error("Google tidak mengembalikan access token.");

  cachedToken = token;
  cachedExpiry = Date.now() + 55 * 60 * 1000;
  return token;
}

export function getRootFolderId(): string {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "root";
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return (body as { error?: { message?: string } } | null)?.error?.message ?? fallback;
}

/**
 * Wraps a single Drive REST call with the retry/recovery behavior every
 * caller in this file needs:
 *  - a 401 means the access token is bad *right now* (expired early,
 *    revoked, clock skew) regardless of what our local cache thinks — clear
 *    it and retry once with a freshly-minted token.
 *  - a 429/5xx is Google's API being transiently unavailable/rate-limited —
 *    retry with exponential backoff instead of failing the whole feature on
 *    one hiccup.
 *  - anything else (4xx like a bad request, or persistent failure after
 *    retries) throws a clear `Error` with Drive's own message where
 *    available, so callers can log/report something actionable instead of
 *    "Drive upload failed (500)".
 *
 * `build` receives the current access token and must return the raw
 * `Response` (never throw for a non-2xx status — let this wrapper decide
 * whether that status is retryable).
 */
async function driveRequest(build: (token: string) => Promise<Response>, action: string): Promise<Response> {
  let forceRefresh = false;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const token = await getAccessToken(forceRefresh);
    forceRefresh = false;

    let res: Response;
    try {
      res = await build(token);
    } catch (networkErr) {
      // fetch itself threw (DNS/timeout/connection reset) — treat like a
      // retryable transient failure rather than surfacing a raw network
      // exception straight to the feature route.
      lastError = networkErr instanceof Error ? networkErr.message : String(networkErr);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(300 * 2 ** (attempt - 1));
        continue;
      }
      throw new Error(`${action}: gagal menghubungi Google Drive (${lastError}).`);
    }

    if (res.ok) return res;

    if (res.status === 401 && attempt < MAX_ATTEMPTS) {
      forceRefresh = true;
      continue;
    }

    if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_ATTEMPTS) {
      lastError = await parseErrorMessage(res, res.statusText);
      await sleep(300 * 2 ** (attempt - 1));
      continue;
    }

    const message = await parseErrorMessage(res, res.statusText);
    throw new Error(`${action} gagal (${res.status}): ${message}`);
  }

  throw new Error(`${action} gagal setelah ${MAX_ATTEMPTS} percobaan${lastError ? `: ${lastError}` : ""}.`);
}

/** Finds a folder by exact name directly under `parentId`, creating it if it
 * doesn't exist yet. Used to lay out Parent Report PDFs as
 * root / {school} / {student} / Laporan-....pdf instead of dumping every
 * file flat into one folder. */
export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const query = `name = '${escapedName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  // A failed *search* (401/5xx) must not silently fall through to creating a
  // folder — driveRequest already retries transient failures, so reaching
  // this point with a thrown error means it's real and should propagate
  // instead of risking a duplicate folder being created every time the
  // search happens to fail.
  const searchRes = await driveRequest(
    (token) =>
      fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    `Mencari folder Drive "${name}"`,
  );
  const searchData = (await searchRes.json()) as { files?: { id: string }[] };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await driveRequest(
    (token) =>
      fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
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
      }),
    `Membuat folder Drive "${name}"`,
  );
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

/** Newly created files are private to the uploading account by default —
 * nobody else (teachers, parents, admins) could open the link the app shows
 * them without this. "reader" + type "anyone" mirrors a standard "Anyone
 * with the link can view" share — the deliberate, consented-to sharing model
 * for this app (see the file-level comment above).
 *
 * This used to fire-and-forget the permissions call: if it failed, the
 * upload would still report success while the file stayed private, so the
 * "seamless" link parents were promised would 403 for them. It now goes
 * through the same retry/error wrapper as everything else and throws if it
 * genuinely can't be set, so a failure here surfaces instead of hiding. */
export async function setPublicReadable(driveFileId: string) {
  await driveRequest(
    (token) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      }),
    "Membagikan file Drive",
  );
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string,
): Promise<{ driveFileId: string; webViewLink: string }> {
  const targetFolder = folderId || getRootFolderId();

  const metadata = {
    name: fileName,
    mimeType,
    parents: [targetFolder],
  };

  // Rebuilt fresh on every attempt — a FormData/Blob pair can only be read
  // (uploaded) once, so driveRequest's retry path needs a brand new one
  // each time `build` runs rather than reusing one across attempts.
  const res = await driveRequest((token) => {
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeType }));
    return fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  }, `Upload file "${fileName}" ke Drive`);

  const data = (await res.json()) as { id: string; webViewLink?: string };

  // If sharing fails after an otherwise-successful upload, don't leave an
  // orphaned private file behind with no trace — clean it up so a retry
  // starts fresh instead of accumulating unreachable duplicates, then
  // surface the original sharing error.
  try {
    await setPublicReadable(data.id);
  } catch (shareErr) {
    await deleteFile(data.id).catch(() => {});
    throw shareErr;
  }

  return {
    driveFileId: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

/** Starts a resumable upload session and returns the pre-authenticated
 * session URL the browser can PUT the file bytes to directly — bypassing
 * our own server (and Vercel's serverless request-body limits) entirely.
 * Needed for module PDFs that can run 70-130MB, far past what a normal
 * multipart upload through a serverless function can handle.
 *
 * `browserOrigin` is required for the follow-up browser PUT to actually
 * work: Google only allows a resumable session to be completed via a
 * cross-origin browser request from the origin that was declared with an
 * `Origin` header on *this* session-creation call. Since this call itself
 * runs server-side (a browser can't set its own `Origin` header — the
 * runtime sets it automatically per-request, but Node's fetch has no such
 * request to inherit it from), it has to be passed in explicitly from the
 * route handler, which reads it off the incoming request. Without this,
 * Google issues the session fine but the browser's subsequent PUT to it
 * fails with a CORS error, since Google never learned an origin was allowed. */
export async function initResumableUpload(
  fileName: string,
  mimeType: string,
  fileSize: number,
  folderId: string,
  browserOrigin: string,
): Promise<string> {
  const res = await driveRequest(
    (token) =>
      fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": mimeType,
          "X-Upload-Content-Length": String(fileSize),
          Origin: browserOrigin,
        },
        body: JSON.stringify({ name: fileName, mimeType, parents: [folderId] }),
      }),
    `Memulai upload resumable "${fileName}"`,
  );

  const sessionUrl = res.headers.get("Location");
  if (!sessionUrl) throw new Error("Drive tidak mengembalikan sesi upload (header Location kosong).");
  return sessionUrl;
}

export async function deleteFile(driveFileId: string) {
  await driveRequest(
    (token) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
    "Menghapus file Drive",
  );
}

export async function getFileUrl(driveFileId: string): Promise<string> {
  try {
    const res = await driveRequest(
      (token) =>
        fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=webViewLink`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      "Mengambil URL file Drive",
    );
    const data = (await res.json()) as { webViewLink?: string };
    return data.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;
  } catch {
    // This one's a convenience lookup (the caller already has a usable
    // fallback URL pattern) — worth trying with the same retry behavior as
    // everything else, but not worth failing the whole request over.
    return `https://drive.google.com/file/d/${driveFileId}/view`;
  }
}
