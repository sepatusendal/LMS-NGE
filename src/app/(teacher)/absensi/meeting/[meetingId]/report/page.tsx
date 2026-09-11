"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { WizardHeader } from "@/features/meetings/wizard-header";
import { ReportForm } from "@/features/meetings/report-form";
import { useReport, useReportPageContext } from "@/features/reports/use-reports";
import { isWithinEditWindow } from "@/lib/date";

export default function ReportPage() {
  const params = useParams<{ meetingId: string }>();
  const router = useRouter();
  const t = useTranslations("workflowWizard");
  const tWorkflow = useTranslations("workflow");
  const { data: context, isLoading: contextLoading } = useReportPageContext(params.meetingId);
  const { data: existingReport, isLoading: reportLoading } = useReport(params.meetingId);

  if (contextLoading || reportLoading) return <LoadingState />;

  if (!context) {
    return (
      <div className="space-y-4">
        <WizardHeader className="" step={3} totalSteps={3} backHref="/absensi" />
        <p className="text-muted-foreground text-sm">{t("classNotFound")}</p>
      </div>
    );
  }

  // Only an EDIT is time-gated — create_teaching_report() has no date
  // restriction at all (a report can be filed however late after the
  // class), only update_teaching_report()'s RLS does. And that gate keys
  // off the report's own actualTeachingDate (when it was actually
  // submitted), not the lesson plan's scheduledDate — those diverge
  // whenever a report is filed several days after the class, which is
  // exactly the case this feature exists for. Using scheduledDate here
  // would lock out edits the database would actually still allow.
  const readOnly = Boolean(existingReport) && !isWithinEditWindow(existingReport!.actualTeachingDate);

  return (
    <div className="space-y-5">
      <WizardHeader className={context.className} step={3} totalSteps={3} backHref="/absensi" />

      <Card>
        <CardContent className="pt-5">
          <h2 className="mb-1 text-sm font-semibold">{tWorkflow("dailyTeachingReport")}</h2>
          <p className="text-muted-foreground mb-4 text-xs">
            {tWorkflow("meetingTopic", { number: context.meetingNumber, topic: context.topic })}
          </p>
          <ReportForm
            meetingId={params.meetingId}
            classId={context.classId}
            learningObjectives={context.learningObjectives}
            curriculumReportFormat={context.curriculumReportFormat}
            existingReport={existingReport}
            readOnly={readOnly}
            onSubmitSuccess={() => router.push("/absensi")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
