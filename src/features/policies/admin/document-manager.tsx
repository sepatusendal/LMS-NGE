"use client";

import { useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countPdfPages } from "../pdf-js";
import { formatDay } from "../format";
import { MAX_POLICY_FILE_BYTES, type PolicyDocument } from "../schema";
import { useDeletePolicyDocument, useUploadPolicyDocument } from "../use-policies";

const EMPTY = { title: "", documentNumber: "", versionLabel: "", effectiveDate: "" };

export function DocumentManager({
  packetId,
  documents,
  editable,
}: {
  packetId: string;
  documents: PolicyDocument[];
  editable: boolean;
}) {
  const t = useTranslations("admin.policies.documents");
  const locale = useLocale();
  const upload = useUploadPolicyDocument(packetId);
  const remove = useDeletePolicyDocument();
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState(EMPTY);
  const [isReading, setIsReading] = useState(false);
  // Remounting the file input is the only way to clear it.
  const [inputKey, setInputKey] = useState(0);
  const busy = isReading || upload.isPending;

  const set = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    if (picked && picked.size > MAX_POLICY_FILE_BYTES) {
      toast.error(t("tooLarge"));
      setInputKey((k) => k + 1);
      return setFile(null);
    }
    setFile(picked);
    if (picked) {
      setFields((current) => ({ ...current, title: current.title || picked.name.replace(/(\.docx)?\.pdf$/i, "") }));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !fields.title.trim()) return;
    let pageCount: number;
    setIsReading(true);
    try {
      pageCount = await countPdfPages(file);
    } catch (error) {
      console.error(error);
      toast.error(t("unreadable"));
      return;
    } finally {
      setIsReading(false);
    }
    const form = new FormData();
    form.append("file", file);
    form.append("pageCount", String(pageCount));
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    upload.mutate(form, {
      onSuccess: () => {
        setFile(null);
        setFields(EMPTY);
        setInputKey((k) => k + 1);
      },
    });
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 && <p className="text-muted-foreground text-sm">{t("empty")}</p>}

      <ul className="space-y-2">
        {documents.map((doc, index) => (
          <li key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
            <FileText className="text-primary size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {index + 1}. {doc.title}
              </p>
              <p className="text-muted-foreground text-xs">
                {[
                  doc.documentNumber,
                  doc.versionLabel,
                  doc.effectiveDate && t("effectiveFrom", { date: formatDay(doc.effectiveDate, locale) }),
                  t("pages", { count: doc.pageCount }),
                  `${Math.ceil(doc.fileSize / 1024)} KB`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <a
              href={`/api/policies/documents/${doc.id}/file?download=1`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <Download className="size-4" />
              <span className="sr-only">{t("download")}</span>
            </a>
            {editable && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm(t("removeConfirm", { title: doc.title }))) remove.mutate(doc.id);
                }}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">{t("remove")}</span>
              </Button>
            )}
          </li>
        ))}
      </ul>

      {editable && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">{t("add")}</p>
          <div className="space-y-1.5">
            <Label htmlFor="policy-file">{t("file")}</Label>
            <Input key={inputKey} id="policy-file" type="file" accept="application/pdf" onChange={pickFile} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="policy-doc-title">{t("title")}</Label>
              <Input id="policy-doc-title" maxLength={150} value={fields.title} onChange={set("title")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="policy-doc-number">{t("documentNumber")}</Label>
              <Input id="policy-doc-number" maxLength={80} value={fields.documentNumber} onChange={set("documentNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="policy-doc-version">{t("versionLabel")}</Label>
              <Input id="policy-doc-version" maxLength={40} value={fields.versionLabel} onChange={set("versionLabel")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="policy-doc-effective">{t("effectiveDate")}</Label>
              <Input id="policy-doc-effective" type="date" value={fields.effectiveDate} onChange={set("effectiveDate")} />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{t("hint")}</p>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !file || !fields.title.trim()}>
              <Upload className="size-4" />
              {busy ? t("uploading") : t("upload")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
