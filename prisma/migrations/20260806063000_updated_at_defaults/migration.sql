-- Prisma's @updatedAt is only applied by Prisma Client at query time, not as
-- a DB-level default. Any insert that bypasses Prisma Client (the auth
-- trigger, seed scripts, manual SQL) hits a NOT NULL violation without this.
-- users."updatedAt" was already fixed in 20260806061000; cover the rest here.

ALTER TABLE public.teachers ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.schools ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.students ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.curriculums ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.classes ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.class_enrollments ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.lesson_plans ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.meetings ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.attendances ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.teaching_reports ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.parent_reports ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
