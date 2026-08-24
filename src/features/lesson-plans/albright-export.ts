import { createClient } from "@/lib/supabase/client";

interface AlbrightSession {
  meetingNumber: number;
  topic: string;
  teacherName: string;
  scheduledDate: string;
  languageSkillsFocus: string | null;
  activitiesLog: string | null;
  resourcesUsed: string | null;
  homeworkAssigned: string | null;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

async function fetchAlbrightSessions(classId: string): Promise<AlbrightSession[]> {
  const supabase = createClient();

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, meetingNumber, topic, scheduledDate")
    .eq("classId", classId)
    .is("deletedAt", null)
    .order("meetingNumber");
  if (lpErr) throw lpErr;

  const plans = lessonPlans as unknown as { id: string; meetingNumber: number; topic: string; scheduledDate: string }[];
  if (plans.length === 0) return [];

  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select("id, lessonPlanId, assignedTeacherId, actualTeacherId")
    .in(
      "lessonPlanId",
      plans.map((p) => p.id),
    );
  if (meetErr) throw meetErr;

  const meetingRows = meetings as unknown as {
    id: string;
    lessonPlanId: string;
    assignedTeacherId: string;
    actualTeacherId: string | null;
  }[];
  const meetingByLp = new Map(meetingRows.map((m) => [m.lessonPlanId, m]));

  const meetingIds = meetingRows.map((m) => m.id);
  const { data: reports, error: repErr } =
    meetingIds.length > 0
      ? await supabase
          .from("teaching_reports")
          .select("meetingId, languageSkillsFocus, activitiesLog, resourcesUsed, homeworkAssigned")
          .in("meetingId", meetingIds)
      : { data: [], error: null };
  if (repErr) throw repErr;

  const reportByMeeting = new Map(
    (
      reports as unknown as {
        meetingId: string;
        languageSkillsFocus: string | null;
        activitiesLog: string | null;
        resourcesUsed: string | null;
        homeworkAssigned: string | null;
      }[]
    ).map((r) => [r.meetingId, r]),
  );

  const teacherIds = [
    ...new Set(meetingRows.flatMap((m) => [m.assignedTeacherId, m.actualTeacherId].filter(Boolean) as string[])),
  ];
  const { data: teachers, error: teachErr } =
    teacherIds.length > 0
      ? await supabase.from("teachers").select("id, users(fullName)").in("id", teacherIds)
      : { data: [], error: null };
  if (teachErr) throw teachErr;

  const teacherNameById = new Map(
    (teachers as unknown as { id: string; users: { fullName: string } | { fullName: string }[] | null }[]).map((t) => [
      t.id,
      toOne(t.users)?.fullName ?? "-",
    ]),
  );

  return plans.map((p) => {
    const meeting = meetingByLp.get(p.id);
    const report = meeting ? reportByMeeting.get(meeting.id) : undefined;
    const teacherId = meeting?.actualTeacherId ?? meeting?.assignedTeacherId;
    return {
      meetingNumber: p.meetingNumber,
      topic: p.topic,
      teacherName: teacherId ? (teacherNameById.get(teacherId) ?? "-") : "-",
      scheduledDate: p.scheduledDate,
      languageSkillsFocus: report?.languageSkillsFocus ?? null,
      activitiesLog: report?.activitiesLog ?? null,
      resourcesUsed: report?.resourcesUsed ?? null,
      homeworkAssigned: report?.homeworkAssigned ?? null,
    };
  });
}

function formatSessionDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const FIELD_ROWS: { label: string; get: (s: AlbrightSession) => string }[] = [
  { label: "Unit & Topic", get: (s) => s.topic || "" },
  { label: "Teacher(s)", get: (s) => s.teacherName },
  { label: "Day & Date", get: (s) => formatSessionDate(s.scheduledDate) },
  { label: "Language &\nSkills Focus", get: (s) => s.languageSkillsFocus ?? "" },
  { label: "Activities", get: (s) => s.activitiesLog ?? "" },
  { label: "Resources", get: (s) => s.resourcesUsed ?? "" },
  { label: "Homework", get: (s) => s.homeworkAssigned ?? "" },
];

const SESSIONS_PER_BLOCK = 4;
const LABEL_COL_WIDTH = 22;
const SESSION_COL_WIDTH = 34;

export async function downloadAlbrightTeachingRecords(
  classId: string,
  className: string,
  level: string,
) {
  const ExcelJS = (await import("exceljs")).default;
  const sessions = await fetchAlbrightSessions(classId);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NUFA Global Education";
  workbook.created = new Date();

  const ws = workbook.addWorksheet(className.slice(0, 31), {
    views: [{ showGridLines: false }],
  });
  ws.columns = [
    { width: LABEL_COL_WIDTH },
    { width: SESSION_COL_WIDTH },
    { width: SESSION_COL_WIDTH },
    { width: SESSION_COL_WIDTH },
    { width: SESSION_COL_WIDTH },
  ];

  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = "NUFA GLOBAL INSTITUTE";
  ws.getCell("A2").font = { bold: true, size: 14 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:E3");
  ws.getCell("A3").value = `Teaching Records  2026–2027   |   ${level}`;
  ws.getCell("A3").font = { bold: true, size: 11 };
  ws.getCell("A3").alignment = { horizontal: "center" };

  let row = 5;
  for (let blockStart = 0; blockStart < sessions.length; blockStart += SESSIONS_PER_BLOCK) {
    const block = sessions.slice(blockStart, blockStart + SESSIONS_PER_BLOCK);

    const headerRow = ws.getRow(row);
    headerRow.getCell(1).value = `  Pertemuan ${block[0].meetingNumber}–${block[block.length - 1].meetingNumber}`;
    headerRow.getCell(1).font = { bold: true };
    block.forEach((s, i) => {
      const cell = headerRow.getCell(2 + i);
      cell.value = `Session ${s.meetingNumber}`;
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    });
    row += 1;

    for (const field of FIELD_ROWS) {
      const r = ws.getRow(row);
      r.getCell(1).value = field.label;
      r.getCell(1).font = { bold: true };
      r.getCell(1).alignment = { wrapText: true, vertical: "top" };
      block.forEach((s, i) => {
        const cell = r.getCell(2 + i);
        cell.value = field.get(s);
        cell.alignment = { wrapText: true, vertical: "top" };
      });
      row += 1;
    }

    row += 1; // blank separator row between blocks
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${className}-Teaching-Records-Albright.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
