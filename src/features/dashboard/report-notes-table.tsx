"use client";

import { AlertCircle, NotebookPen } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseLocalDate } from "@/lib/date";
import { useReportNotes } from "./use-dashboard";

export function ReportNotesTable() {
  const t = useTranslations("admin.dashboard");
  const locale = useLocale();
  const { data, isLoading, isError } = useReportNotes();
  const formatDate = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <NotebookPen className="size-4" style={{ color: "var(--chart-1)" }} />
          {t("recentTeachingReportNotes")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-destructive flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            {t("failedToLoadNotes")}
          </p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">{t("loadingData")}</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noNotesYet")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">{t("date")}</TableHead>
                <TableHead className="w-28">{t("class")}</TableHead>
                <TableHead>{t("note")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((n) => (
                <TableRow key={`${n.className}-${n.date}-${n.note}`}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(n.date)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{n.className}</TableCell>
                  <TableCell className="text-muted-foreground">{n.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
