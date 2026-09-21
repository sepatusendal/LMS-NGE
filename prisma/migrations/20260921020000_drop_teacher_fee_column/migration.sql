-- Phase 2 of 2 for the tutor pay rate move (see 20260921010000_teacher_fees_table).
--
-- The app now reads and writes teacher_fees only, and the old column was
-- verified identical to teacher_fees on staging and production right before
-- this ran. Dropping it is what actually stops tutors from reading each
-- other's rate through the "teachers" table.
ALTER TABLE "teachers" DROP COLUMN IF EXISTS "feePerMeeting";
