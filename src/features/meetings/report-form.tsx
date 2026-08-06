"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useCreateReport } from "@/features/reports/use-reports";
import { useClassRoster } from "@/features/classes/use-roster";
import {
  reportSchema,
  SKILL_OPTIONS,
  OBJECTIVES_OPTIONS,
  OBJECTIVES_LABEL,
  type ReportInput,
} from "@/features/reports/schema";

interface Props {
  meetingId: string;
  classId: string;
}

export function ReportForm({ meetingId, classId }: Props) {
  const createReport = useCreateReport(meetingId);
  const { data: roster } = useClassRoster(classId);
  const [followUps, setFollowUps] = useState<{ studentId: string; studentName: string; note: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  const {
    register,
    control,
    handleSubmit,
  } = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      meetingId,
      skills: [],
      followUps: [],
    },
  });

  function addFollowUp() {
    if (!selectedStudentId || !followUpNote.trim()) return;
    const student = roster?.find((s) => s.studentId === selectedStudentId);
    setFollowUps((prev) => [
      ...prev,
      { studentId: selectedStudentId, studentName: student?.fullName ?? selectedStudentId, note: followUpNote.trim() },
    ]);
    setSelectedStudentId("");
    setFollowUpNote("");
  }

  function removeFollowUp(index: number) {
    setFollowUps((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: Record<string, unknown>) {
    const v = values as unknown as ReportInput;
    await createReport.mutateAsync({
      skills: v.skills || [],
      objectivesAchieved: v.objectivesAchieved,
      whatWentWell: v.whatWentWell,
      whatNeedsImprovement: v.whatNeedsImprovement,
      nextLessonNotes: v.nextLessonNotes,
      homeworkAssigned: v.homeworkAssigned,
      followUps: followUps.map((f) => ({ studentId: f.studentId, note: f.note })),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Skill yang Diajarkan</Label>
        <div className="grid grid-cols-2 gap-2">
          {SKILL_OPTIONS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                value={skill}
                className="accent-primary size-4"
                {...register("skills")}
              />
              {skill}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tujuan Pembelajaran</Label>
        <Controller
          control={control}
          name="objectivesAchieved"
          render={({ field }) => (
            <Select
              items={OBJECTIVES_OPTIONS.map((o) => ({ value: o, label: OBJECTIVES_LABEL[o] }))}
              value={field.value}
              onValueChange={(v) => v && field.onChange(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih..." />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVES_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {OBJECTIVES_LABEL[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatWentWell">Hal Positif Hari Ini</Label>
        <Textarea id="whatWentWell" rows={2} {...register("whatWentWell")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatNeedsImprovement">Yang Perlu Ditingkatkan</Label>
        <Textarea id="whatNeedsImprovement" rows={2} {...register("whatNeedsImprovement")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextLessonNotes">Catatan untuk Pertemuan Selanjutnya</Label>
        <Textarea id="nextLessonNotes" rows={2} {...register("nextLessonNotes")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="homeworkAssigned">PR / Tugas (opsional)</Label>
        <Textarea id="homeworkAssigned" rows={2} {...register("homeworkAssigned")} />
      </div>

      <div className="space-y-2">
        <Label>Siswa yang Perlu Follow-up</Label>
        <div className="flex gap-2">
          <Select
            items={roster?.filter((s) => !followUps.some((f) => f.studentId === s.studentId)).map((s) => ({ value: s.studentId, label: s.fullName })) ?? []}
            value={selectedStudentId}
            onValueChange={(v) => v && setSelectedStudentId(v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Pilih siswa" />
            </SelectTrigger>
            <SelectContent>
              {roster
                ?.filter((s) => !followUps.some((f) => f.studentId === s.studentId))
                .map((s) => (
                  <SelectItem key={s.studentId} value={s.studentId}>
                    {s.fullName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <input
            className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder="Catatan..."
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={addFollowUp}>
            +
          </Button>
        </div>
        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {followUps.map((f, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {f.studentName}: {f.note}
                <button type="button" onClick={() => removeFollowUp(i)} className="ml-1">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={createReport.isPending}>
        {createReport.isPending ? "Menyimpan..." : "Submit Daily Teaching Report"}
      </Button>
    </form>
  );
}
