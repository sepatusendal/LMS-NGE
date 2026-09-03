"use client";

import { AlertCircle, NotebookPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseLocalDate } from "@/lib/date";
import { useReportNotes } from "./use-dashboard";

function formatDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function ReportNotesTable() {
  const { data, isLoading, isError } = useReportNotes();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <NotebookPen className="size-4" style={{ color: "var(--chart-1)" }} />
          Catatan Terbaru dari Teaching Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-destructive flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            Gagal memuat catatan.
          </p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada catatan.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Tanggal</TableHead>
                <TableHead className="w-28">Kelas</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((n) => (
                <TableRow key={`${n.className}-${n.date}-${n.note}`}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(n.date)}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{n.className}</TableCell>
                  <TableCell className="text-muted-foreground">{n.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
