-- Tutor pay rate moves out of "teachers" into its own admin-only table.
--
-- "teachers" has to stay readable by every tutor (teacher_read_other_teachers,
-- needed to show co-tutor names), and RLS is row-level only — so any column on
-- it is readable by every tutor through the API, including feePerMeeting.
-- Verified on staging: a tutor session could read all other tutors' rates.
-- A separate table with an admin-only policy is the only way to actually
-- hide it.
--
-- No row = fee not set (same meaning as the old NULL).
--
-- Phase 1 of 2: this only adds the table and copies the current values.
-- "teachers"."feePerMeeting" is left in place so the previous app version keeps
-- working while the new code deploys; a follow-up migration drops it (that
-- is what actually closes the leak).

CREATE TABLE "teacher_fees" (
    "teacherId" UUID NOT NULL,
    "feePerMeeting" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

    CONSTRAINT "teacher_fees_pkey" PRIMARY KEY ("teacherId"),
    CONSTRAINT "teacher_fees_feePerMeeting_check" CHECK ("feePerMeeting" >= 0)
);

ALTER TABLE "teacher_fees" ADD CONSTRAINT "teacher_fees_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "teacher_fees" ("teacherId", "feePerMeeting")
SELECT "id", "feePerMeeting" FROM "teachers" WHERE "feePerMeeting" IS NOT NULL;

ALTER TABLE public.teacher_fees ENABLE ROW LEVEL SECURITY;

-- Admin only: no coordinator or teacher policy on purpose.
CREATE POLICY "admin_all_teacher_fees" ON public.teacher_fees FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
