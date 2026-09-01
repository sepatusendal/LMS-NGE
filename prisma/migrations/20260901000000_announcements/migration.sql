-- Admin-authored in-app announcements/pengumuman, shown as a dismissible
-- banner to every authenticated user (Admin, Coordinator, Teacher) until
-- they dismiss it. Dismissal is tracked per-user server-side in
-- announcement_reads (not localStorage) so it follows the user across
-- devices, same reasoning as every other per-row "self_*" policy in this app.

CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'SUCCESS', 'CELEBRATION', 'MAINTENANCE');

CREATE TABLE "announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "announcements"
  ADD CONSTRAINT "announcements_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "announcements_isActive_idx" ON "announcements"("isActive");

CREATE TABLE "announcement_reads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "announcementId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "announcement_reads"
  ADD CONSTRAINT "announcement_reads_announcementId_fkey"
  FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_reads"
  ADD CONSTRAINT "announcement_reads_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "announcement_reads_announcementId_userId_key" ON "announcement_reads"("announcementId", "userId");

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_announcements" ON public.announcements FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "authenticated_read_announcements" ON public.announcements FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_all_announcement_reads" ON public.announcement_reads FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "self_read_announcement_reads" ON public.announcement_reads FOR SELECT
  USING ("userId" = auth.uid());
CREATE POLICY "self_insert_announcement_reads" ON public.announcement_reads FOR INSERT
  WITH CHECK ("userId" = auth.uid());
