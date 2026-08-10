-- Admin-managed non-teaching days. schoolId = NULL applies to every school
-- (national holidays / cuti bersama); a set schoolId scopes the holiday to
-- just that school. Read access is open to any authenticated role (same as
-- curriculums) since holiday-awareness is checked from teacher-facing
-- queries too, not just the admin dashboard.

CREATE TABLE "holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "schoolId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "holidays_date_schoolId_key" ON "holidays"("date", "schoolId");
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

ALTER TABLE "holidays"
  ADD CONSTRAINT "holidays_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_holidays" ON public.holidays FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "authenticated_read_holidays" ON public.holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);
