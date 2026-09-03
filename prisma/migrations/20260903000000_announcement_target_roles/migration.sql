-- Audit Fase 2: "Tambahin field target audiens/role di pengumuman".
-- Empty array = visible to every role, matching current behaviour for all
-- existing rows (backward compatible) — a non-empty array restricts an
-- announcement to just those roles. Filtering happens in application code
-- (fetchAnnouncementsForCurrentUser, src/features/announcements/queries.ts),
-- not RLS: the existing "authenticated_read_announcements" policy already
-- lets any authenticated user SELECT every row, same as before this change,
-- so no RLS policy update is needed here.

ALTER TABLE "announcements" ADD COLUMN "targetRoles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[];
