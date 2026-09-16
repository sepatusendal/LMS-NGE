-- 20260903000000 added targetRoles but deliberately left filtering to
-- application code (fetchAnnouncementsForCurrentUser), reasoning the old
-- "authenticated_read_announcements" policy already let everyone read every
-- row anyway so nothing regressed. That's true, but it also means the gap
-- was never actually closed: any authenticated user (e.g. a TEACHER) can
-- still SELECT every announcements row directly (REST/RPC, browser
-- devtools network tab, etc.) including ones targeted at ADMIN/COORDINATOR
-- only — the JS-side filter never reaches the network. Enforce targeting in
-- the policy itself: visible when targetRoles is empty (=> everyone, same
-- default as before) or contains the caller's role.
DROP POLICY IF EXISTS "authenticated_read_announcements" ON public.announcements;
CREATE POLICY "authenticated_read_announcements" ON public.announcements FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      "targetRoles" = ARRAY[]::"Role"[]
      OR public.current_user_role() = ANY("targetRoles")
    )
  );
