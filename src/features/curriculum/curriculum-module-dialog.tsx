"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Curriculum } from "./schema";
import {
  useDeleteCurriculumModule,
  useUploadCurriculumModule,
} from "./use-curriculum-module";

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function CurriculumModuleDialog({
  open,
  onOpenChange,
  curriculum,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculum?: Curriculum;
}) {
  const t = useTranslations("admin.curriculum.moduleDialog");
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadCurriculumModule();
  const remove = useDeleteCurriculumModule();
  const [progress, setProgress] = useState(0);

  if (!curriculum) return null;

  const hasModule = Boolean(curriculum.moduleDriveFileId);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !curriculum) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      e.target.value = "";
      return;
    }
    setProgress(0);
    try {
      await upload.mutateAsync({
        curriculumId: curriculum.id,
        file,
        onProgress: setProgress,
      });
    } finally {
      e.target.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("titlePrefix")} — {curriculum.name}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {hasModule && (
            <div className="bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0">
                  <a
                    href={`https://drive.google.com/file/d/${curriculum.moduleDriveFileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-medium hover:underline"
                  >
                    {curriculum.moduleFileName}
                  </a>
                  {formatBytes(curriculum.moduleFileSize) && (
                    <p className="text-muted-foreground text-xs">
                      {formatBytes(curriculum.moduleFileSize)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={remove.isPending}
                onClick={() => curriculum && remove.mutate(curriculum.id)}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
          )}

          {upload.isPending ? (
            <div className="space-y-2">
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-center text-xs">
                {t("uploading", { progress })}
              </p>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              <span className="ml-1.5">
                {hasModule ? t("replaceModule") : t("uploadModule")}
              </span>
            </Button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {tCommon("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
