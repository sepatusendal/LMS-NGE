"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomReportPage() {
  const t = useTranslations("admin.analytics.custom");

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in oklab, var(--chart-2) 16%, transparent)" }}
          >
            <Sparkles className="size-6" style={{ color: "var(--chart-2)" }} />
          </span>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
          <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">
            {t("comingSoon")}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
