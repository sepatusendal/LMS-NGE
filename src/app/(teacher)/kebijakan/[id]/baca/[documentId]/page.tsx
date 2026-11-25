"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { PdfReader } from "@/features/policies/pdf-reader";
import { useMyPolicies } from "@/features/policies/use-policies";

export default function PolicyReaderPage() {
  const { id, documentId } = useParams<{ id: string; documentId: string }>();
  const t = useTranslations("policies");
  const { data, isLoading, isError } = useMyPolicies();
  const document = data?.items
    .find((item) => item.packet.id === id)
    ?.documents.find((doc) => doc.id === documentId);

  return (
    <div className="space-y-3">
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <Link href={`/kebijakan/${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="size-4" />
          {t("reader.back")}
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{document?.title}</h1>
        {document && (
          <a
            href={`/api/policies/documents/${document.id}/file?download=1`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <Download className="size-4" />
            <span className="sr-only">{t("documents.download")}</span>
          </a>
        )}
      </div>
      {isLoading && <LoadingState />}
      {isError && <p className="text-destructive text-center text-sm">{t("loadError")}</p>}
      {data && !document && <p className="text-muted-foreground text-center text-sm">{t("notFound")}</p>}
      {document && <PdfReader key={document.id} document={document} />}
    </div>
  );
}
