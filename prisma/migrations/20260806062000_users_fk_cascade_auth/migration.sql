-- public.users.id was only conventionally equal to auth.users.id, with no
-- actual FK — deleting a Supabase Auth user left an orphaned public.users
-- row. Clean up any such orphans, then add the FK so account deletion
-- cascades correctly going forward.

DELETE FROM public.users u WHERE NOT EXISTS (
  SELECT 1 FROM auth.users a WHERE a.id = u.id
);

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
