"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Download, MessageCircleQuestion } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { cn } from "@/lib/utils";
import { ConfirmPanel } from "@/features/policies/confirm-panel";
import { formatDateTime, formatDay } from "@/features/policies/format";
import { isPendingPolicy, type MyPolicy, type MyPolicyDocument } from "@/features/policies/queries";
import { isOverdue, whatsappLink } from "@/features/policies/schema";
import { useMyPolicies } from "@/features/policies/use-policies";

export default function PolicyPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("policies");
  const { data, isLoading, isError } = useMyPolicies();
  const policy = data?.items.find((item) => item.packet.id === id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/kebijakan" className="text-muted-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>
      {isLoading && <LoadingState />}
      {isError && <p className="text-destructive text-sm">{t("loadError")}</p>}
      {data && !policy && <p className="text-muted-foreground text-sm">{t("notFound")}</p>}
      {policy && <PolicyDetail policy={policy} />}
    </div>
  );
}

function PolicyDetail({ policy }: { policy: MyPolicy }) {
  const t = useTranslations("policies");
  const locale = useLocale();
  const { packet, acknowledgement } = policy;
  const pending = isPendingPolicy(policy);

  return (
    <>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{packet.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {packet.status === "ARCHIVED" && <Badge variant="secondary">{t("status.retired")}</Badge>}
          <span className="text-muted-foreground text-xs">{t("version", { version: packet.version })}</span>
          {pending && packet.deadline && (
            <span className={cn("text-xs font-medium", isOverdue(packet.deadline) ? "text-destructive" : "text-chart-4")}>
              {t("deadline", { date: formatDay(packet.deadline, locale) })}
              {isOverdue(packet.deadline) && ` · ${t("overdue")}`}
            </span>
          )}
        </div>
      </div>

      {acknowledgement && (
        <Card className="ring-chart-3/40">
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-chart-3 size-6 shrink-0" />
              <div>
                <p className="font-semibold">{t("success.title")}</p>
                <p className="text-muted-foreground text-sm">
                  {t("confirmedOn", { date: formatDateTime(acknowledgement.acknowledgedAt, locale) })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("success.number", { number: acknowledgement.receiptNumber })}
                </p>
              </div>
            </div>
            <a
              href={`/api/policies/receipts/${acknowledgement.id}?download=1`}
              className={cn(buttonVariants(), "w-full")}
            >
              <Download className="size-4" />
              {t("success.download")}
            </a>
          </CardContent>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">{t("documents.title")}</h2>
        {pending && <p className="text-muted-foreground text-xs">{t("documents.hint")}</p>}
        {policy.documents.map((doc, index) => (
          <DocumentCard key={doc.id} packetId={packet.id} doc={doc} index={index} />
        ))}
      </section>

      {pending && <ConfirmPanel policy={policy} />}

      <HrQuestion policy={policy} />
    </>
  );
}

function DocumentCard({ packetId, doc, index }: { packetId: string; doc: MyPolicyDocument; index: number }) {
  const t = useTranslations("policies.documents");
  const status = doc.completed
    ? t("done")
    : doc.furthestPage > 0
      ? t("reading", { page: doc.furthestPage, total: doc.pageCount })
      : doc.opened
        ? t("opened", { total: doc.pageCount })
        : t("notOpened", { total: doc.pageCount });

  return (
    <div className="bg-card space-y-3 rounded-2xl border p-4 shadow-sm">
      <div>
        <p className="text-sm font-semibold">
          {index + 1}. {doc.title}
        </p>
        {doc.documentNumber && <p className="text-muted-foreground text-xs">{doc.documentNumber}</p>}
        <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", doc.completed ? "text-chart-3" : "text-muted-foreground")}>
          {doc.completed && <CheckCircle2 className="size-3.5" />}
          {status}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/kebijakan/${packetId}/baca/${doc.id}`}
          className={cn(buttonVariants({ variant: doc.completed ? "outline" : "default" }), "flex-1")}
        >
          <BookOpen className="size-4" />
          {doc.completed ? t("readAgain") : doc.furthestPage > 0 ? t("continue") : t("read")}
        </Link>
        <a href={`/api/policies/documents/${doc.id}/file?download=1`} className={buttonVariants({ variant: "outline" })}>
          <Download className="size-4" />
          {t("download")}
        </a>
      </div>
    </div>
  );
}

/** Asking HR is always possible and never counts as a confirmation. */
function HrQuestion({ policy }: { policy: MyPolicy }) {
  const t = useTranslations("policies.question");
  const { data: user } = useCurrentUser();
  const { hrWhatsapp, hrEmail, hrContactName, title } = policy.packet;
  const message = t("message", { name: user?.fullName ?? "", title });
  const href = hrWhatsapp
    ? whatsappLink(hrWhatsapp, message)
    : hrEmail
      ? `mailto:${hrEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`
      : null;

  return (
    <div className="space-y-1.5 text-center">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <MessageCircleQuestion className="size-4" />
          {t("button")}
        </a>
      ) : (
        <p className="text-sm font-medium">{t("fallback")}</p>
      )}
      <p className="text-muted-foreground text-xs">
        {hrContactName ? `${t("contact", { name: hrContactName })} · ` : ""}
        {t("hint")}
      </p>
    </div>
  );
}
