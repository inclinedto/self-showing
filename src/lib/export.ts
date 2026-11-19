"use client";

import { safeFileName, sheetNames, tableToCsv } from "./tables";
import type { ExtractedTable } from "./types";

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Plain numbers become real Excel numbers; IDs (leading zeros, >15 digits) stay text. */
function excelValue(cell: string): string | number | null {
  if (cell === "") return null;
  const plain = cell.replace(/,/g, "");
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(plain) && plain.replace(/[-.]/g, "").length <= 15) {
    return Number(plain);
  }
  return cell;
}

export async function exportExcel(tables: ExtractedTable[], baseName: string) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const names = sheetNames(tables.map((table) => table.title));
  await writeExcelFile(
    tables.map((table, index) => ({
      sheet: names[index],
      data: [
        table.headers.map((header) => ({ value: header, fontWeight: "bold" as const })),
        ...table.rows.map((row) => row.map(excelValue)),
      ],
    })),
  ).toFile(`${safeFileName(baseName)}.xlsx`);
}

export function exportCsv(table: ExtractedTable, baseName: string) {
  // The BOM makes Excel on Windows open UTF-8 CSV with Chinese text correctly.
  const blob = new Blob([`\uFEFF${tableToCsv(table)}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${safeFileName(baseName)}-${safeFileName(table.title)}.csv`);
}

export function exportJson(tables: ExtractedTable[], baseName: string) {
  const payload = {
    file: baseName,
    tables: tables.map((table) => ({
      title: table.title,
      source: table.source,
      columns: table.headers,
      records: table.rows.map((row) =>
        Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""])),
      ),
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${safeFileName(baseName)}.json`);
}

/** Tab-separated text pastes straight into Excel / WPS / 飞书表格 as cells. */
export async function copyAsTsv(table: ExtractedTable) {
  const clean = (cell: string) => cell.replace(/[\t\r\n]+/g, " ");
  const text = [table.headers, ...table.rows].map((row) => row.map(clean).join("\t")).join("\n");
  await navigator.clipboard.writeText(text);
}
