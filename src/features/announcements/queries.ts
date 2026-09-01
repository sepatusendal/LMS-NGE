import { createClient } from "@/lib/supabase/client";
import type { Announcement, AnnouncementDisplayMode, AnnouncementInput, AnnouncementType } from "./schema";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  displayMode: AnnouncementDisplayMode;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  users: { fullName: string } | { fullName: string }[] | null;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function mapRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    displayMode: row.displayMode,
    isActive: row.isActive,
    createdByName: toOne(row.users)?.fullName ?? "-",
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

const SELECT = "id, title, body, type, displayMode, isActive, expiresAt, createdAt, users(fullName)";

/** Full list for the admin management page — every announcement regardless
 * of active/expired state. */
export async function fetchAnnouncementsAdmin(): Promise<Announcement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select(SELECT)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data as unknown as AnnouncementRow[]).map(mapRow);
}

/** Active, not-yet-expired announcements the current user hasn't dismissed
 * yet — what the dashboard banner renders. Read status is server-side
 * (announcement_reads), so it follows the user across devices. */
export async function fetchAnnouncementsForCurrentUser(): Promise<Announcement[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();
  const [{ data: activeRows, error: activeError }, { data: readRows, error: readError }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select(SELECT)
        .eq("isActive", true)
        .or(`expiresAt.is.null,expiresAt.gt.${nowIso}`)
        .order("createdAt", { ascending: false }),
      supabase.from("announcement_reads").select("announcementId").eq("userId", user.id),
    ]);
  if (activeError) throw activeError;
  if (readError) throw readError;

  const readIds = new Set((readRows as { announcementId: string }[]).map((r) => r.announcementId));
  return (activeRows as unknown as AnnouncementRow[])
    .filter((r) => !readIds.has(r.id))
    .map(mapRow);
}

export async function createAnnouncement(input: AnnouncementInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak ditemukan, silakan login ulang");

  const { error } = await supabase.from("announcements").insert({
    title: input.title,
    body: input.body,
    type: input.type,
    displayMode: input.displayMode,
    expiresAt: input.expiresAt || null,
    createdByUserId: user.id,
  });
  if (error) throw error;
}

export async function setAnnouncementActive(id: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("announcements").update({ isActive }).eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

/** Dismiss for the current user only — doesn't affect anyone else. */
export async function dismissAnnouncement(announcementId: string): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("announcement_reads")
    .insert({ announcementId, userId: user.id });
  if (error) throw error;
}
