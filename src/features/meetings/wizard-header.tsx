"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { ClassAvatar } from "@/components/shared/class-avatar";

/** Shared header for the check-in → attendance → report wizard pages
 * (src/app/(teacher)/absensi/[classId]/... and .../meeting/[meetingId]/...).
 * Each step is its own page/URL (not an accordion) so a dropped connection
 * or a closed app mid-flow always resumes at the right screen — see the
 * revamp plan discussed for the Absensi flow. The step dots give a
 * non-technical user a quick "how much is left" glance. */
export function WizardHeader({
  className,
  step,
  totalSteps,
  backHref,
}: {
  className: string;
  step: number;
  totalSteps: number;
  backHref: string;
}) {
  const t = useTranslations("workflowWizard");

  return (
    <div className="space-y-3">
      <Link href={backHref} className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline">
        <ChevronLeft className="size-4" />
        {t("backToAbsensi")}
      </Link>

      <div className="flex items-center gap-3">
        <ClassAvatar name={className} size="md" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{className}</h1>
          <div className="mt-1 flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("stepOf", { step, total: totalSteps })}
          </p>
        </div>
      </div>
    </div>
  );
}
