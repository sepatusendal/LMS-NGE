-- The composite UNIQUE("date", "schoolId") from the holidays migration
-- doesn't actually stop duplicate GLOBAL holidays (schoolId IS NULL):
-- Postgres treats every NULL as distinct in a unique index, so two rows
-- with the same date and schoolId = NULL don't collide. A partial unique
-- index scoped to the NULL case closes that gap.

CREATE UNIQUE INDEX "holidays_date_global_key" ON "holidays"("date") WHERE "schoolId" IS NULL;
