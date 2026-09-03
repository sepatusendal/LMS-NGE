"use client";

import { AlertCircle, UserRoundSearch } from "lucide-react";
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
  const { data, isLoading, isError } = useOpenFollowUps();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserRoundSearch className="size-4" style={{ color: "var(--status-warning)" }} />
          Siswa Perlu Follow-up
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-destructive flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            Gagal memuat data follow-up.
          </p>
        ) : isLoading ? (
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
              {data.map((f) => (
                <TableRow key={`${f.studentName}-${f.className}-${f.createdAt}`}>
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
