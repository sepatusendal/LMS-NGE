-- "updatedAt" has no DB-level default (Prisma's @updatedAt is only applied by
-- the client), so raw inserts must set it explicitly. Add a DB default as a
-- safety net, and fix the auth trigger which was missing it.

ALTER TABLE public.users ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, "fullName", role, "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::"Role", 'TEACHER'::"Role"),
    CURRENT_TIMESTAMP
  );
  RETURN NEW;
END;
$$;
