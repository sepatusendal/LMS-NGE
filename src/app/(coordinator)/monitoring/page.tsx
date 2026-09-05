import { getTranslations } from "next-intl/server";
import { ComplianceAlert } from "@/features/lesson-plans/compliance-alert";
import { StatusBoard } from "@/features/monitoring/status-board";
import { AnalyticsCharts } from "@/features/monitoring/analytics-charts";
import { AnnouncementBanner } from "@/features/announcements/announcement-banner";
import { AnnouncementPopup } from "@/features/announcements/announcement-popup";

export default async function MonitoringPage() {
  const t = await getTranslations("coordinator.monitoring");
  return (
    <div className="space-y-6">
      <AnnouncementPopup />

      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <AnnouncementBanner />

      <StatusBoard />
      <AnalyticsCharts />
      <ComplianceAlert />
    </div>
  );
}
