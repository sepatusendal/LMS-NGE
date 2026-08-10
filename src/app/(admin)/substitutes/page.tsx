"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { useStatusBoard } from "@/features/monitoring/use-monitoring";
import { TeacherDayList } from "@/features/substitutes/teacher-day-list";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SubstitutesPage() {
  const [date, setDate] = useState(todayStr());
  const [schoolId, setSchoolId] = useState("");
  const [search, setSearch] = useState("");

  const { data: schools } = useSchools();
  const { data: rows, isLoading } = useStatusBoard(date);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (schoolId && r.schoolId !== schoolId) return false;
      if (search && !r.teacherName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, schoolId, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Guru Pengganti</h1>
        <p className="text-muted-foreground text-sm">
          Tandai guru yang absen/izin di tanggal tertentu — tutor pengganti otomatis
          diterapkan ke semua kelas guru itu hari itu, dan pertemuan berikutnya kembali
          ke guru asal dengan sendirinya.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          items={[
            { value: "", label: "Semua sekolah" },
            ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
          ]}
          value={schoolId}
          onValueChange={(v) => setSchoolId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua sekolah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua sekolah</SelectItem>
            {schools?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Cari nama guru..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Guru Terjadwal —{" "}
            {new Date(date).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherDayList date={date} rows={filtered} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
