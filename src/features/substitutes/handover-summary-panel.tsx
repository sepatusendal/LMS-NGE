"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useHandoverSummary } from "./use-substitutes";

interface Props {
  classId: string;
  lessonPlanId: string;
}

export function HandoverSummaryPanel({ classId, lessonPlanId }: Props) {
  const { data, isLoading } = useHandoverSummary(classId, lessonPlanId);
  const t = useTranslations("handoverSummary");

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-3 text-sm">
        <Loader2 className="size-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-3 text-sm">
      <div>
        <p className="text-muted-foreground text-xs">{t("originalTeacher")}</p>
        <p className="font-medium">{data.originalTeacherName}</p>
      </div>

      {data.previousLesson && (
        <div>
          <p className="text-muted-foreground text-xs">
            {t("previousLesson", { number: data.previousLesson.meetingNumber })}
          </p>
          <p className="font-medium">{data.previousLesson.topic}</p>
        </div>
      )}

      {data.previousReport && (
        <div className="space-y-1.5 rounded-md border p-2.5">
          {data.previousReport.whatWentWell && (
            <p>
              <span className="text-muted-foreground">{t("whatWentWell")}: </span>
              {data.previousReport.whatWentWell}
            </p>
          )}
          {data.previousReport.whatNeedsImprovement && (
            <p>
              <span className="text-muted-foreground">{t("whatNeedsImprovement")}: </span>
              {data.previousReport.whatNeedsImprovement}
            </p>
          )}
          {data.previousReport.nextLessonNotes && (
            <p>
              <span className="text-muted-foreground">{t("nextLessonNotes")}: </span>
              {data.previousReport.nextLessonNotes}
            </p>
          )}
          {data.previousReport.homeworkAssigned && (
            <p>
              <span className="text-muted-foreground">{t("previousHomework")}: </span>
              {data.previousReport.homeworkAssigned}
            </p>
          )}
        </div>
      )}

      {data.followUps.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">{t("followUpStudents")}</p>
          <div className="space-y-1">
            {data.followUps.map((f, i) => (
              <Badge key={i} variant="secondary" className="mr-1 mb-1">
                {f.studentName}: {f.note}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.currentLesson && (
        <div>
          <p className="text-muted-foreground text-xs">
            {t("currentLesson", { number: data.currentLesson.meetingNumber })}
          </p>
          <p className="font-medium">{data.currentLesson.topic}</p>
        </div>
      )}

      {data.nextLesson && (
        <div>
          <p className="text-muted-foreground text-xs">
            {t("nextLesson", { number: data.nextLesson.meetingNumber })}
          </p>
          <p className="font-medium">{data.nextLesson.topic}</p>
        </div>
      )}
    </div>
  );
}
