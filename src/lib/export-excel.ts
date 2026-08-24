export interface ExcelColumn<T> {
  header: string;
  key: string;
  width?: number;
  value: (row: T) => string | number | null;
}

export interface ExcelSheet<T = unknown> {
  name: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[*?:/\\[\]]/g, " ").slice(0, 31);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function downloadExcel(filename: string, sheets: ExcelSheet<any>[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NUFA Global Education";
  workbook.created = new Date();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sanitizeSheetName(sheet.name));
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    for (const row of sheet.rows) {
      const values: Record<string, string | number | null> = {};
      for (const col of sheet.columns) values[col.key] = col.value(row);
      ws.addRow(values);
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
