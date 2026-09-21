import type { PostgrestError } from "@supabase/supabase-js";

/** PostgREST caps every response at the project's `max_rows` (Supabase's
 * default is 1000) and truncates silently — no error, just fewer rows than
 * exist. Any report that aggregates over a growing table (attendances,
 * check-ins, lesson plans, reports) must page through the result instead of
 * trusting a single `.select()`. */
export const PAGE_SIZE = 1000;

/** `.in("col", ids)` puts every id in the request URL. At ~37 bytes per UUID
 * the gateway starts rejecting the request somewhere around 380–400 ids
 * (~14KB) — verified against the Supabase API — so long id lists are split
 * into chunks that stay far below that. */
export const IN_CHUNK_SIZE = 100;

type Page = PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }>;

/** Runs `buildPage(from, to)` (attach `.range(from, to)` to the query) until a
 * page comes back short. The query MUST have a deterministic `.order()` that
 * ends in a unique column (e.g. `.order("id")`) — without it Postgres may
 * return overlapping/missing rows across pages. */
export async function fetchAllPages<T>(buildPage: (from: number, to: number) => Page): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/** Runs one paged query per chunk of `ids` (de-duplicated) and concatenates
 * the rows. Use for any `.in("col", ids)` whose id list is not guaranteed to
 * stay tiny. Row order across chunks is not preserved — sort afterwards. */
export async function fetchInChunks<T>(
  ids: readonly string[],
  buildPage: (chunk: string[], from: number, to: number) => Page,
  chunkSize = IN_CHUNK_SIZE,
): Promise<T[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }

  const results = await Promise.all(
    chunks.map((chunk) => fetchAllPages<T>((from, to) => buildPage(chunk, from, to))),
  );
  return results.flat();
}
