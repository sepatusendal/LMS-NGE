"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight, FileCheck2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/loading-state";
import { cn } from "@/lib/utils";
import { formatDateTime, formatDay } from "@/features/policies/format";
import { isPendingPolicy, type MyPolicy } from "@/features/policies/queries";
import { isOverdue } from "@/features/policies/schema";
import { useMyPolicies } from "@/features/policies/use-policies";

export default function PoliciesLibraryPage() {
  const t = useTranslations("policies");
  const { data, isLoading, isError } = useMyPolicies();
  // Anything still waiting comes first.
  const items = [...(data?.items ?? [])].sort((a, b) => Number(isPendingPolicy(b)) - Number(isPendingPolicy(a)));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      {isLoading && <LoadingState />}

      {isError && (
        <div className="bg-card flex flex-col items-center rounded-3xl px-6 py-14 text-center shadow-sm">
          <AlertCircle className="text-destructive mb-2 size-6" />
          <p className="text-muted-foreground text-sm">{t("loadError")}</p>
        </div>
      )}

      {data && items.length === 0 && (
        <div className="bg-card flex flex-col items-center rounded-3xl px-6 py-14 text-center shadow-sm">
          <FileCheck2 className="text-muted-foreground/40 mb-3 size-10" />
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <PolicyCard key={item.packet.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function PolicyCard({ item }: { item: MyPolicy }) {
  const t = useTranslations("policies");
  const locale = useLocale();
  const { packet, acknowledgement, documents } = item;
  const pending = isPendingPolicy(item);
  const overdue = pending && isOverdue(packet.deadline);
  const retired = packet.status === "ARCHIVED";

  return (
    <Link
      href={`/kebijakan/${packet.id}`}
      className={cn(
        "bg-card flex items-center gap-3 rounded-2xl border p-4 shadow-sm",
        pending && "border-chart-4/40",
        overdue && "border-destructive/50",
      )}
    >
      <FileCheck2 className={cn("size-6 shrink-0", retired ? "text-muted-foreground" : "text-primary")} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold">{packet.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {retired && <Badge variant="secondary">{t("status.retired")}</Badge>}
          {acknowledgement && <Badge>{t("status.done")}</Badge>}
          {pending && <Badge variant={overdue ? "destructive" : "outline"}>{t("status.pending")}</Badge>}
          <span className="text-muted-foreground text-xs">{t("version", { version: packet.version })}</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {acknowledgement
            ? t("confirmedOn", { date: formatDateTime(acknowledgement.acknowledgedAt, locale) })
            : t("readCount", { done: documents.filter((d) => d.completed).length, total: documents.length })}
          {pending && packet.deadline && ` · ${t("deadline", { date: formatDay(packet.deadline, locale) })}`}
        </p>
      </div>
      <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" />
    </Link>
  );
}
