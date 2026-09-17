"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/components/shared/date-range-filter";

interface ReportFilterBarProps {
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
  schools: { id: string; name: string }[] | undefined;
  schoolId: string;
  onSchoolChange: (id: string) => void;
  classes: { id: string; name: string; schoolId: string }[] | undefined;
  classId: string;
  onClassChange: (id: string) => void;
  onReset: () => void;
  allSchoolsLabel: string;
  allClassesLabel: string;
  resetLabel: string;
  children?: React.ReactNode;
}

export function ReportFilterBar({
  dateFrom,
  dateTo,
  onDateChange,
  schools,
  schoolId,
  onSchoolChange,
  classes,
  classId,
  onClassChange,
  onReset,
  allSchoolsLabel,
  allClassesLabel,
  resetLabel,
  children,
}: ReportFilterBarProps) {
  // A class only belongs to one school, so once a school is picked the class
  // dropdown should only offer classes from that school — otherwise it keeps
  // listing every class org-wide even after narrowing by school.
  const scopedClasses = useMemo(
    () => (schoolId ? (classes ?? []).filter((c) => c.schoolId === schoolId) : (classes ?? [])),
    [classes, schoolId],
  );

  function handleSchoolChange(id: string) {
    onSchoolChange(id);
    if (id && classId && !(classes ?? []).some((c) => c.id === classId && c.schoolId === id)) {
      onClassChange("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <DateRangeFilter from={dateFrom} to={dateTo} onChange={onDateChange} />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={[{ value: "", label: allSchoolsLabel }, ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? [])]}
          value={schoolId}
          onValueChange={(v) => handleSchoolChange(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={allSchoolsLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{allSchoolsLabel}</SelectItem>
            {schools?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          items={[{ value: "", label: allClassesLabel }, ...scopedClasses.map((c) => ({ value: c.id, label: c.name }))]}
          value={classId}
          onValueChange={(v) => onClassChange(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={allClassesLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{allClassesLabel}</SelectItem>
            {scopedClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {children}
        <Button variant="ghost" size="sm" onClick={onReset}>{resetLabel}</Button>
      </div>
    </div>
  );
}
