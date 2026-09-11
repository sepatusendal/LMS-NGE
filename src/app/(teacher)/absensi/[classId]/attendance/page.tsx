"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { WizardHeader } from "@/features/meetings/wizard-header";
import { useTodayClasses } from "@/features/meetings/use-today";
import { AttendanceForm } from "@/features/meetings/attendance-form";
import { FileUpload } from "@/features/drive/file-upload";
import { updateCheckInPhoto } from "@/features/meetings/queries";

export default function AttendancePage() {
  const params = useParams<{ classId: string }>();
  const router = useRouter();
  const t = useTranslations("workflowWizard");
  const tWorkflow = useTranslations("workflow");
  const { data: classes, isLoading } = useTodayClasses();
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const c = classes?.find((cls) => cls.classId === params.classId);

  if (isLoading) return <LoadingState />;

  if (!c || !c.meetingId) {
    return (
      <div className="space-y-4">
        <WizardHeader className="" step={2} totalSteps={3} backHref="/absensi" />
        <p className="text-muted-foreground text-sm">{t("classNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <WizardHeader className={c.className} step={2} totalSteps={3} backHref="/absensi" />

      <Card className="overflow-hidden py-0">
        <CardContent className="pt-5 pb-4">
          <h2 className="mb-3 text-sm font-semibold">{tWorkflow("studentAttendance")}</h2>
          <AttendanceForm
            meetingId={c.meetingId}
            classId={c.classId}
            onDone={() => router.push(`/absensi/meeting/${c.meetingId}/report`)}
          />
        </CardContent>
        <div className="border-t px-4 py-3">
          <button
            type="button"
            onClick={() => setShowPhotoUpload((prev) => !prev)}
            className="text-muted-foreground flex w-full items-center justify-center gap-1.5 text-xs hover:text-foreground"
          >
            <Camera className="size-3.5" />
            {showPhotoUpload ? tWorkflow("closeClassPhoto") : tWorkflow("addClassPhoto")}
          </button>
        </div>
        {showPhotoUpload && (
          <div className="border-t bg-chart-4/5 px-4 py-4">
            <FileUpload
              label={tWorkflow("uploadClassPhoto")}
              onUploaded={(driveFileId, fileName) => {
                if (driveFileId && c.meetingId) {
                  updateCheckInPhoto(c.meetingId, driveFileId, fileName);
                }
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
