"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, FileCheck2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { PacketForm } from "@/features/policies/admin/packet-form";
import { formatDay } from "@/features/policies/format";
import { useCreatePacket, usePacketsAdmin } from "@/features/policies/use-policies";

export default function PoliciesPage() {
  const t = useTranslations("admin.policies");
  const locale = useLocale();
  const router = useRouter();
  const { data: packets, isLoading, isError, error } = usePacketsAdmin();
  const create = useCreatePacket();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          {t("create")}
        </Button>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && isError && (
        <div className="bg-card flex flex-col items-center rounded-3xl px-6 py-16 text-center shadow-sm">
          <AlertCircle className="text-destructive mb-2 size-6" />
          <p className="text-muted-foreground text-sm">{error?.message}</p>
        </div>
      )}

      {!isLoading && !isError && packets?.length === 0 && (
        <div className="bg-card flex flex-col items-center rounded-3xl px-6 py-16 text-center shadow-sm">
          <FileCheck2 className="text-muted-foreground/40 mb-3 size-10" />
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      )}

      <div className="space-y-3">
        {packets?.map((packet) => (
          <Link
            key={packet.id}
            href={`/policies/${packet.id}`}
            className="bg-card hover:bg-card/70 flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors"
          >
            <FileCheck2 className="text-primary size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{packet.title}</p>
                <Badge variant="outline">{t("version", { version: packet.version })}</Badge>
                <Badge variant={packet.status === "PUBLISHED" ? "default" : "secondary"}>
                  {t(`status.${packet.status}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {packet.status === "DRAFT"
                  ? t("draftHint")
                  : t("confirmedCount", { done: packet.confirmed, total: packet.recipients })}
                {packet.deadline && ` · ${t("deadlineShort", { date: formatDay(packet.deadline, locale) })}`}
              </p>
            </div>
            <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" />
          </Link>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <PacketForm
              submitLabel={t("createSubmit")}
              isPending={create.isPending}
              onSubmit={(values) =>
                create.mutate(values, {
                  onSuccess: (id) => {
                    setDialogOpen(false);
                    router.push(`/policies/${id}`);
                  },
                })
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
