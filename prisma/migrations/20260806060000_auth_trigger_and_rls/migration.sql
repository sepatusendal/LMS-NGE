-- ─────────────────────────────────────────────────────────────
-- Auth sync: mirror auth.users into public.users on signup
-- Accounts are provisioned by an Admin via the Supabase Admin API,
-- with role/full_name passed in user_metadata.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, "fullName", role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::"Role", 'TEACHER'::"Role")
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Role helper functions, used throughout the RLS policies below
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "Role"
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.current_user_role() = 'ADMIN';
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.current_user_role() = 'COORDINATOR';
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.teachers WHERE "userId" = auth.uid();
$$;

-- A class is "in scope" for the current teacher if they are its primary
-- teacher, or they have ever been assigned/substituted on one of its meetings.
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
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_meeting(target_meeting_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = target_meeting_id
      AND (m."assignedTeacherId" = public.current_teacher_id() OR m."actualTeacherId" = public.current_teacher_id())
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_users" ON public.users FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_users" ON public.users FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "self_read_users" ON public.users FOR SELECT
  USING (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- teachers
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_teachers" ON public.teachers FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_teachers" ON public.teachers FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "self_read_teacher" ON public.teachers FOR SELECT
  USING ("userId" = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- schools (master data — Admin writes, Coordinator + scoped Teacher read)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_schools" ON public.schools FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_schools" ON public.schools FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_schools" ON public.schools FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.classes c WHERE c."schoolId" = schools.id AND public.is_teacher_class(c.id)));

-- ─────────────────────────────────────────────────────────────
-- curriculums (not school/class sensitive — any authenticated role reads)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_curriculums" ON public.curriculums FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "authenticated_read_curriculums" ON public.curriculums FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────
-- classes
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_classes" ON public.classes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_classes" ON public.classes FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_classes" ON public.classes FOR SELECT
  USING (public.is_teacher_class(id));

-- ─────────────────────────────────────────────────────────────
-- students
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_students" ON public.students FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_students" ON public.students FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_students" ON public.students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_enrollments ce
    WHERE ce."studentId" = students.id AND public.is_teacher_class(ce."classId")
  ));

-- ─────────────────────────────────────────────────────────────
-- class_enrollments
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_class_enrollments" ON public.class_enrollments FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_class_enrollments" ON public.class_enrollments FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_class_enrollments" ON public.class_enrollments FOR SELECT
  USING (public.is_teacher_class("classId"));

-- ─────────────────────────────────────────────────────────────
-- lesson_plans (Admin schedules; Teacher may only preview — no write)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_lesson_plans" ON public.lesson_plans FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_lesson_plans" ON public.lesson_plans FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_lesson_plans" ON public.lesson_plans FOR SELECT
  USING (public.is_teacher_class("classId"));

-- ─────────────────────────────────────────────────────────────
-- meetings (Admin/Coordinator assign substitutes; Teacher reads own,
-- and may update status as part of completing their own workflow)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_meetings" ON public.meetings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_meetings" ON public.meetings FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_meetings" ON public.meetings FOR SELECT
  USING ("assignedTeacherId" = public.current_teacher_id() OR "actualTeacherId" = public.current_teacher_id());
CREATE POLICY "teacher_update_own_meetings" ON public.meetings FOR UPDATE
  USING ("assignedTeacherId" = public.current_teacher_id() OR "actualTeacherId" = public.current_teacher_id())
  WITH CHECK ("assignedTeacherId" = public.current_teacher_id() OR "actualTeacherId" = public.current_teacher_id());

-- ─────────────────────────────────────────────────────────────
-- check_ins / check_outs (Teacher inserts own; immutable afterwards —
-- no UPDATE/DELETE policy for Teacher, matches context.md 5.1/5.3)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_check_ins" ON public.check_ins FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_check_ins" ON public.check_ins FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_check_ins" ON public.check_ins FOR SELECT
  USING (public.is_teacher_meeting("meetingId"));
CREATE POLICY "teacher_insert_own_check_ins" ON public.check_ins FOR INSERT
  WITH CHECK (public.is_teacher_meeting("meetingId") AND "teacherId" = public.current_teacher_id());

CREATE POLICY "admin_all_check_outs" ON public.check_outs FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_check_outs" ON public.check_outs FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_check_outs" ON public.check_outs FOR SELECT
  USING (public.is_teacher_meeting("meetingId"));
CREATE POLICY "teacher_insert_own_check_outs" ON public.check_outs FOR INSERT
  WITH CHECK (public.is_teacher_meeting("meetingId") AND "teacherId" = public.current_teacher_id());

-- ─────────────────────────────────────────────────────────────
-- attendances (Teacher may insert/update while taking attendance)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_attendances" ON public.attendances FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_attendances" ON public.attendances FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_attendances" ON public.attendances FOR SELECT
  USING (public.is_teacher_meeting("meetingId"));
CREATE POLICY "teacher_insert_own_attendances" ON public.attendances FOR INSERT
  WITH CHECK (public.is_teacher_meeting("meetingId"));
CREATE POLICY "teacher_update_own_attendances" ON public.attendances FOR UPDATE
  USING (public.is_teacher_meeting("meetingId")) WITH CHECK (public.is_teacher_meeting("meetingId"));

-- ─────────────────────────────────────────────────────────────
-- teaching_reports (Teacher inserts own; immutable afterwards —
-- one report per meeting, enforced at the schema level too)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_teaching_reports" ON public.teaching_reports FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_teaching_reports" ON public.teaching_reports FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_teaching_reports" ON public.teaching_reports FOR SELECT
  USING (public.is_teacher_meeting("meetingId"));
CREATE POLICY "teacher_insert_own_teaching_reports" ON public.teaching_reports FOR INSERT
  WITH CHECK (public.is_teacher_meeting("meetingId"));

-- ─────────────────────────────────────────────────────────────
-- student_follow_ups / progress_records (derived from teaching_reports)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_student_follow_ups" ON public.student_follow_ups FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_student_follow_ups" ON public.student_follow_ups FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_student_follow_ups" ON public.student_follow_ups FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = student_follow_ups."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));
CREATE POLICY "teacher_insert_own_student_follow_ups" ON public.student_follow_ups FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = student_follow_ups."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));

CREATE POLICY "admin_all_progress_records" ON public.progress_records FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_progress_records" ON public.progress_records FOR SELECT
  USING (public.is_coordinator());
CREATE POLICY "teacher_read_own_progress_records" ON public.progress_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = progress_records."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));
CREATE POLICY "teacher_insert_own_progress_records" ON public.progress_records FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teaching_reports tr
    WHERE tr.id = progress_records."teachingReportId" AND public.is_teacher_meeting(tr."meetingId")
  ));

-- ─────────────────────────────────────────────────────────────
-- parent_reports (Admin generates; Coordinator reviews; no Teacher access)
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admin_all_parent_reports" ON public.parent_reports FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coordinator_read_parent_reports" ON public.parent_reports FOR SELECT
  USING (public.is_coordinator());
