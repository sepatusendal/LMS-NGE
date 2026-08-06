"use client";

import { UserRoundSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOpenFollowUps } from "./use-dashboard";

export function FollowUpsTable() {
  const { data, isLoading } = useOpenFollowUps();

  return (
    <Card className="border-l-4" style={{ borderLeftColor: "var(--status-warning)" }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserRoundSearch className="size-4" style={{ color: "var(--status-warning)" }} />
          Siswa Perlu Follow-up
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Tidak ada follow-up terbuka.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium whitespace-nowrap">{f.studentName}</TableCell>
                  <TableCell className="whitespace-nowrap">{f.className}</TableCell>
                  <TableCell className="text-muted-foreground">{f.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
