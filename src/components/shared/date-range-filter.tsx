"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatLocalDateStr } from "@/lib/date";

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(d);
  result.setDate(d.getDate() + diff);
  return result;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function computeThisWeekRange(): { from: string; to: string } {
  const now = new Date();
  const from = startOfWeek(now);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: formatLocalDateStr(from), to: formatLocalDateStr(to) };
}

export function computeThisMonthRange(): { from: string; to: string } {
  const now = new Date();
  return { from: formatLocalDateStr(startOfMonth(now)), to: formatLocalDateStr(endOfMonth(now)) };
}

export function computeLastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { from: formatLocalDateStr(startOfMonth(lastMonth)), to: formatLocalDateStr(endOfMonth(lastMonth)) };
}

export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const t = useTranslations("common.dateRangeFilter");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="w-auto"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="w-auto"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const r = computeThisWeekRange();
            onChange(r.from, r.to);
          }}
        >
          {t("thisWeek")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const r = computeThisMonthRange();
            onChange(r.from, r.to);
          }}
        >
          {t("thisMonth")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const r = computeLastMonthRange();
            onChange(r.from, r.to);
          }}
        >
          {t("lastMonth")}
        </Button>
      </div>
    </div>
  );
}
