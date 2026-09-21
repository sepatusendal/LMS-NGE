export type ErrorKind = "network" | "session" | "permission" | "duplicate" | "other";

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

/** Buckets a raw error (Supabase PostgrestError, fetch failure, plain Error)
 * into the few causes a teacher can actually act on, so a failed save can
 * say *why* — lost connection, expired login, missing access — instead of
 * surfacing raw driver text or a generic "gagal". */
export function classifyError(error: unknown): ErrorKind {
  const e = (error ?? {}) as ErrorLike;
  const msg = (e.message ?? "").toLowerCase();

  if (e.code === "23505") return "duplicate";
  if (e.code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "permission";
  }
  if (
    e.status === 401 ||
    msg.includes("jwt") ||
    msg.includes("not authenticated") ||
    msg.includes("refresh token")
  ) {
    return "session";
  }
  if (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed")
  ) {
    return "network";
  }
  return "other";
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const m = (error as ErrorLike | null)?.message;
  return typeof m === "string" && m ? m : String(error);
}
