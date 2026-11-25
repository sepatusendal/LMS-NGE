"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { LoadingState } from "@/components/shared/loading-state";
import { todayLocalDateStr } from "@/lib/date";
import { formatDateTime } from "../format";
import type { MonitorRow } from "../queries";
import type { PolicyPacket } from "../schema";
import { usePacketMonitor } from "../use-policies";

type Filter = "all" | "pending" | "done";
const FILTERS: Filter[] = ["all", "pending", "done"];

/** Who has confirmed, who has not, and each tutor's signed receipt. */
export function MonitorTable({ packet }: { packet: PolicyPacket }) {
  const t = useTranslations("admin.policies.monitor");
  const locale = useLocale();
  const { data, isLoading, isError, error } = usePacketMonitor(packet.id, true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.rows ?? []).filter(
      (row) =>
        (filter === "all" || (filter === "done") === Boolean(row.acknowledgement)) &&
        (!needle || `${row.fullName} ${row.tutorId ?? ""} ${row.email}`.toLowerCase().includes(needle)),
    );
  }, [data, search, filter]);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <p className="text-destructive text-sm">{error?.message}</p>;

  const active = data.rows.filter((r) => r.isActiveTutor);
  const done = active.filter((r) => r.acknowledgement).length;
  const status = (row: MonitorRow) => (row.acknowledgement ? t("done") : t("pending"));

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t("summary", { done, total: active.length })}</p>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all"
            style={{ width: `${active.length ? (done / active.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder={t("search")}
          aria-label={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1">
          {FILTERS.map((value) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {t(`filter.${value}`)}
            </Button>
          ))}
        </div>
        <div className="ml-auto">
          <ExportExcelButton
            label={t("export")}
            filename={`Rekap-acknowledgement-v${packet.version}-${todayLocalDateStr()}`}
            sheets={[
              {
                name: t("sheetName"),
                rows,
                columns: [
                  { header: t("columns.name"), key: "name", width: 30, value: (r: MonitorRow) => r.fullName },
                  { header: t("columns.tutorId"), key: "tutorId", width: 16, value: (r: MonitorRow) => r.tutorId ?? "" },
                  { header: "Email", key: "email", width: 30, value: (r: MonitorRow) => r.email },
                  {
                    header: t("columns.reading"),
                    key: "reading",
                    width: 16,
                    value: (r: MonitorRow) => `${r.documentsRead}/${data.documentCount}`,
                  },
                  { header: t("columns.status"), key: "status", width: 20, value: status },
                  {
                    header: t("columns.confirmedAt"),
                    key: "confirmedAt",
                    width: 28,
                    value: (r: MonitorRow) =>
                      r.acknowledgement ? formatDateTime(r.acknowledgement.acknowledgedAt, locale) : "",
                  },
                  {
                    header: t("columns.receipt"),
                    key: "receipt",
                    width: 22,
                    value: (r: MonitorRow) => r.acknowledgement?.receiptNumber ?? "",
                  },
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.tutorId")}</TableHead>
              <TableHead className="text-center">{t("columns.reading")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.confirmedAt")}</TableHead>
              <TableHead>{t("columns.receipt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-6 text-center text-sm">
                  {t("empty")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell>
                  <p className="font-medium whitespace-nowrap">{row.fullName}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.email}
                    {!row.isActiveTutor && ` · ${t("inactive")}`}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.tutorId || "-"}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {row.documentsRead}/{data.documentCount}
                </TableCell>
                <TableCell>
                  <Badge variant={row.acknowledgement ? "default" : "secondary"}>{status(row)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {row.acknowledgement ? formatDateTime(row.acknowledgement.acknowledgedAt, locale) : "-"}
                </TableCell>
                <TableCell>
                  {row.acknowledgement ? (
                    <a
                      href={`/api/policies/receipts/${row.acknowledgement.id}?download=1`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      <Download className="size-3.5" />
                      PDF
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
