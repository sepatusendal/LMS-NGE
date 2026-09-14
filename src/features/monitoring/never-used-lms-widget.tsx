"use client";

import { UserRoundX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseLocalDate } from "@/lib/date";
import { useDormantTutors } from "./use-monitoring";

const LOOKBACK_DAYS = 14;

export function NeverUsedLmsWidget() {
  const t = useTranslations("admin.dormantTutors");
  const locale = useLocale();
  const { data: rows, isLoading } = useDormantTutors(LOOKBACK_DAYS);

  if (isLoading || !rows || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserRoundX className="text-destructive size-4" />
          {t("title")}
        </CardTitle>
        <p className="text-muted-foreground text-xs">{t("description", { days: LOOKBACK_DAYS })}</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("teacher")}</TableHead>
                <TableHead>{t("classes")}</TableHead>
                <TableHead className="text-center">{t("missedSessions")}</TableHead>
                <TableHead>{t("lastActive")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.teacherId}>
                  <TableCell className="font-medium whitespace-nowrap">{r.teacherName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {r.classNames.join(", ")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive" className="text-[10px]">
                      {t("missedOfExpected", { missed: r.missedSessions, expected: r.expectedSessions })}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {r.lastActiveDate
                      ? parseLocalDate(r.lastActiveDate).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : t("never")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
