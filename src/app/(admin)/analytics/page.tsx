"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  UserRoundCheck,
  Users,
  NotebookTabs,
  CalendarDays,
  BookOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function HubCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: "color-mix(in oklab, var(--chart-2) 16%, transparent)" }}
            >
              <Icon className="size-4" style={{ color: "var(--chart-2)" }} />
            </span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AnalyticsHubPage() {
  const t = useTranslations("admin.analytics.hub");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HubCard
          href="/analytics/tutor-attendance"
          icon={UserRoundCheck}
          title={t("tutorAttendanceTitle")}
          description={t("tutorAttendanceDescription")}
        />
        <HubCard
          href="/analytics/student-attendance"
          icon={Users}
          title={t("studentAttendanceTitle")}
          description={t("studentAttendanceDescription")}
        />
        <HubCard
          href="/analytics/daily-teaching-report"
          icon={NotebookTabs}
          title={t("dailyTeachingReportTitle")}
          description={t("dailyTeachingReportDescription")}
        />
        <HubCard
          href="/analytics/lesson-plan"
          icon={CalendarDays}
          title={t("lessonPlanTitle")}
          description={t("lessonPlanDescription")}
        />
        <HubCard
          href="/analytics/classes"
          icon={BookOpen}
          title={t("classesTitle")}
          description={t("classesDescription")}
        />
        <HubCard
          href="/analytics/custom"
          icon={Sparkles}
          title={t("customTitle")}
          description={t("customDescription")}
        />
      </div>
    </div>
  );
}
