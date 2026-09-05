"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { useStatusBoard } from "@/features/monitoring/use-monitoring";
import { TeacherDayList } from "@/features/substitutes/teacher-day-list";
import { todayLocalDateStr } from "@/lib/date";

export default function SubstitutesPage() {
  const t = useTranslations("admin.substitutes");
  const locale = useLocale();
  const [date, setDate] = useState(todayLocalDateStr());
  const [schoolId, setSchoolId] = useState("");
  const [search, setSearch] = useState("");

  const { data: schools } = useSchools();
  const { data: rows, isLoading, isError, error } = useStatusBoard(date);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (schoolId && r.schoolId !== schoolId) return false;
      if (search && !r.teacherName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, schoolId, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          items={[
            { value: "", label: t("allSchools") },
            ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
          ]}
          value={schoolId}
          onValueChange={(v) => setSchoolId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("allSchools")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allSchools")}</SelectItem>
            {schools?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={t("searchTeacherPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {t("scheduledTeachers")} —{" "}
            {new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherDayList
            date={date}
            rows={filtered}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error?.message}
          />
        </CardContent>
      </Card>
    </div>
  );
}
