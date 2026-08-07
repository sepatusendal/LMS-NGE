-- Classes previously had ONE scheduleStartTime/scheduleEndTime shared across
-- every day in scheduleDaysOfWeek — couldn't represent e.g. Senin 08:00-09:00
-- + Kamis 15:00-16:00 for the same (primary) teacher. This table holds the
-- per-day time for the class's own regular schedule.
--
-- Distinct from class_schedule_overrides: overrides represent a DIFFERENT
-- teacher covering a day (mandatory teacherId, substitute scenario). Slots
-- here are just "what time does this class meet on this day", always under
-- the class's own primary teacher.

CREATE TABLE "class_schedule_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_schedule_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_schedule_slots_classId_dayOfWeek_key"
  ON "class_schedule_slots"("classId", "dayOfWeek");

ALTER TABLE "class_schedule_slots"
  ADD CONSTRAINT "class_schedule_slots_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.class_schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_class_schedule_slots" ON public.class_schedule_slots FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_class_schedule_slots" ON public.class_schedule_slots FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_class_schedule_slots" ON public.class_schedule_slots FOR SELECT
  USING (public.is_teacher_class("classId"));

-- Backfill: one slot per existing scheduleDaysOfWeek entry, carrying over the
-- class's current single time — same behavior as before until an admin edits
-- a specific day to differ.
INSERT INTO "class_schedule_slots" ("classId", "dayOfWeek", "startTime", "endTime")
SELECT c.id, d.day, c."scheduleStartTime", c."scheduleEndTime"
FROM "classes" c, unnest(c."scheduleDaysOfWeek") AS d(day)
WHERE c."deletedAt" IS NULL;

ALTER TABLE "classes" DROP COLUMN "scheduleStartTime";
ALTER TABLE "classes" DROP COLUMN "scheduleEndTime";
