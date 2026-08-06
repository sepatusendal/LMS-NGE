-- Substitute Teacher (context.md Section 6.3) needs to show the original
-- teacher's name, and vice versa — but `users` RLS only let a teacher read
-- their OWN row ("self_read_users"), so the name always came back blank for
-- anyone but Admin/Coordinator. Teachers already coordinate substitute
-- coverage directly; let any teacher read the basic profile (fullName,
-- email — no more than what they can already see about themselves) of other
-- TEACHER-role users. Admin/Coordinator rows stay invisible to teachers.

CREATE POLICY "teacher_read_teacher_users" ON public.users FOR SELECT
  USING (public.current_user_role() = 'TEACHER' AND role = 'TEACHER');

CREATE POLICY "teacher_read_other_teachers" ON public.teachers FOR SELECT
  USING (public.current_user_role() = 'TEACHER');
