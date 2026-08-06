"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTeachers } from "@/features/teachers/use-teachers";
import {
  useAssignSubstitute,
  useCancelSubstitute,
  useCurrentMeetingInfo,
} from "./use-substitutes";
import { ABSENCE_REASONS, ABSENCE_REASON_LABEL } from "./schema";

interface Props {
  classId: string;
}

export function SubstitutePanel({ classId }: Props) {
  const { data: info, isLoading } = useCurrentMeetingInfo(classId);
  const { data: teachers } = useTeachers();
  const assign = useAssignSubstitute(classId);
  const cancel = useCancelSubstitute(classId);

  const [assigning, setAssigning] = useState(false);
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) return null;
  if (!info) {
    return (
      <div className="rounded-lg border px-3 py-2.5">
        <p className="text-muted-foreground text-sm">
          Belum ada lesson plan — belum bisa assign substitute.
        </p>
      </div>
    );
  }

  async function handleAssign() {
    if (!substituteTeacherId || !reason) return;
    await assign.mutateAsync({ substituteTeacherId, reason });
    setAssigning(false);
    setSubstituteTeacherId("");
    setReason("");
  }

  const teacherOptions = (teachers ?? []).filter((t) => t.id !== info.effectiveTeacherId);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">Substitute Teacher</h2>
        <p className="text-muted-foreground text-sm">
          Meeting {info.meetingNumber}: {info.topic}
        </p>
      </div>

      <div className="rounded-lg border px-3 py-2.5">
        {info.hasCheckIn ? (
          <p className="text-sm">
            {info.isSubstituted ? (
              <>
                Diajar oleh <span className="font-medium">{info.substituteTeacherName}</span>{" "}
                (pengganti {info.effectiveTeacherName}) — sudah check-in, tidak bisa diubah.
              </>
            ) : (
              <>
                Diajar oleh <span className="font-medium">{info.effectiveTeacherName}</span> —
                sudah check-in.
              </>
            )}
          </p>
        ) : info.isSubstituted ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <p>
                <span className="font-medium">{info.effectiveTeacherName}</span> ditandai absen —
                digantikan <span className="font-medium">{info.substituteTeacherName}</span>
              </p>
              <Badge variant="secondary" className="mt-1">
                {ABSENCE_REASON_LABEL[info.substituteReason ?? ""] ?? info.substituteReason}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={cancel.isPending || !info.meetingId}
              onClick={() => info.meetingId && cancel.mutate(info.meetingId)}
            >
              Batalkan
            </Button>
          </div>
        ) : assigning ? (
          <div className="space-y-2">
            <Select
              items={teacherOptions.map((t) => ({ value: t.id, label: t.fullName }))}
              value={substituteTeacherId}
              onValueChange={(v) => v && setSubstituteTeacherId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih substitute teacher" />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              items={ABSENCE_REASONS.map((r) => ({ value: r, label: ABSENCE_REASON_LABEL[r] }))}
              value={reason}
              onValueChange={(v) => v && setReason(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Alasan absen" />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ABSENCE_REASON_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!substituteTeacherId || !reason || assign.isPending}
                onClick={handleAssign}
              >
                {assign.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAssigning(false)}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Diajar oleh <span className="font-medium">{info.effectiveTeacherName}</span>
            </p>
            <Button size="sm" variant="outline" onClick={() => setAssigning(true)}>
              Tandai Guru Absen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
