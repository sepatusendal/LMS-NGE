import { useMemo, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { computeThisMonthRange } from "@/components/shared/date-range-filter";
import { defaultVisibilityFor, type AnalyticsColumnDef } from "./schema";

/** Shared filter/visibility state for every analytics report page — date
 * range (default: this month), school/class filters, and column-visibility,
 * plus the derived `visibleKeys` set every export-column builder needs. */
export function useReportFilters(columns: AnalyticsColumnDef[]) {
  const initialRange = computeThisMonthRange();
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [visibility, setVisibility] = useState<VisibilityState>(defaultVisibilityFor(columns));

  const visibleKeys = useMemo(
    () => new Set(Object.keys(visibility).filter((k) => visibility[k] !== false)),
    [visibility],
  );

  function reset() {
    const range = computeThisMonthRange();
    setDateFrom(range.from);
    setDateTo(range.to);
    setSchoolId("");
    setClassId("");
  }

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    schoolId,
    setSchoolId,
    classId,
    setClassId,
    visibility,
    setVisibility,
    visibleKeys,
    reset,
  };
}
