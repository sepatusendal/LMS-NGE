-- Rupiah fee paid to a tutor per meeting actually attended (has a CheckIn
-- row) — admin-editable, drives the tutor payroll/expense report. Nullable:
-- a tutor with no fee set yet is excluded from expense totals, not treated
-- as free.
ALTER TABLE "teachers" ADD COLUMN "feePerMeeting" INTEGER;
