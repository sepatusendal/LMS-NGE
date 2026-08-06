-- Some classes meet with a different tutor and/or time on each of their two
-- weekly days (e.g. "Houstan": Bu Eni Wed 14:30-15:30, Latifa Sat
-- 07:30-08:30). classes.teacherId/scheduleStartTime/scheduleEndTime stay the
-- single default; this table holds per-day exceptions layered on top.

CREATE TABLE "class_schedule_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "classId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "teacherId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_schedule_overrides_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_schedule_overrides_classId_dayOfWeek_key"
  ON "class_schedule_overrides"("classId", "dayOfWeek");
CREATE INDEX "class_schedule_overrides_teacherId_idx"
  ON "class_schedule_overrides"("teacherId");

ALTER TABLE "class_schedule_overrides"
  ADD CONSTRAINT "class_schedule_overrides_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_schedule_overrides"
  ADD CONSTRAINT "class_schedule_overrides_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public.class_schedule_overrides ENABLE ROW LEVEL SECURITY;

-- A class is "in scope" for a teacher if they're its default teacher, they've
-- been assigned/substituted on one of its meetings, OR they hold a per-day
-- schedule override for it (Houstan/Canberra-style split classes).
CREATE OR REPLACE FUNCTION public.is_teacher_class(target_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = target_class_id AND c."teacherId" = public.current_teacher_id()
  ) OR EXISTS (
    SELECT 1 FROM public.meetings m
    JOIN public.lesson_plans lp ON lp.id = m."lessonPlanId"
    WHERE lp."classId" = target_class_id
      AND (m."assignedTeacherId" = public.current_teacher_id() OR m."actualTeacherId" = public.current_teacher_id())
  ) OR EXISTS (
    SELECT 1 FROM public.class_schedule_overrides cso
    WHERE cso."classId" = target_class_id AND cso."teacherId" = public.current_teacher_id()
  );
$$;

CREATE POLICY "admin_all_class_schedule_overrides" ON public.class_schedule_overrides FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_class_schedule_overrides" ON public.class_schedule_overrides FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_class_schedule_overrides" ON public.class_schedule_overrides FOR SELECT
  USING (public.is_teacher_class("classId"));
