import type { ExtractedTable } from "./types";

type RawTable = { title?: unknown; headers?: unknown; rows?: unknown };

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Coerces model output into a rectangular table of strings, or null if nothing usable is left. */
export function normalizeTable(raw: RawTable): Omit<ExtractedTable, "id" | "source"> | null {
  const headers = Array.isArray(raw.headers) ? raw.headers.map(cellText) : [];
  const rows = Array.isArray(raw.rows)
    ? raw.rows.filter(Array.isArray).map((row: unknown[]) => row.map(cellText))
    : [];
  const width = Math.max(headers.length, ...rows.map((row) => row.length), 0);
  if (width === 0) return null;

  const pad = (row: string[]) => [...row, ...Array(width - row.length).fill("")];
  const filledHeaders = pad(headers).map((header, index) => header || `列${index + 1}`);
  const nonEmptyRows = rows.map(pad).filter((row) => row.some((cell) => cell !== ""));
  if (nonEmptyRows.length === 0 && headers.length === 0) return null;

  return {
    title: cellText(raw.title) || "未命名表格",
    headers: filledHeaders,
    rows: nonEmptyRows,
  };
}

function sameHeaders(a: string[], b: string[]) {
  return a.length === b.length && a.every((header, index) => header === b[index]);
}

function mergeSources(first: string, last: string): string {
  const firstPage = first.match(/\d+/)?.[0];
  const lastPage = last.match(/\d+(?!.*\d)/)?.[0];
  if (firstPage && lastPage && firstPage !== lastPage) return `第 ${firstPage}-${lastPage} 页`;
  return first;
}

/** Joins consecutive tables with identical headers, which is how tables split across pages come back. */
export function mergeSameHeaderTables(tables: ExtractedTable[]): ExtractedTable[] {
  const merged: ExtractedTable[] = [];
  for (const table of tables) {
    const previous = merged[merged.length - 1];
    if (previous && sameHeaders(previous.headers, table.headers)) {
      merged[merged.length - 1] = {
        ...previous,
        source: mergeSources(previous.source, table.source),
        rows: [...previous.rows, ...table.rows],
      };
    } else {
      merged.push({ ...table, rows: [...table.rows] });
    }
  }
  return merged;
}

const FORMULA_PREFIX = /^[=+@\t\r]/;
const NUMERIC = /^-?[\d.,]+%?$/;

/** Stops spreadsheet apps from evaluating document text such as "=HYPERLINK(...)" as a formula. */
function neutralizeFormula(value: string): string {
  if (FORMULA_PREFIX.test(value) || (value.startsWith("-") && !NUMERIC.test(value))) {
    return `'${value}`;
  }
  return value;
}

function csvCell(value: string): string {
  const safe = neutralizeFormula(value);
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function tableToCsv(table: Pick<ExtractedTable, "headers" | "rows">): string {
  return [table.headers, ...table.rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Excel sheet names: at most 31 chars, no []:*?/\ and unique within the workbook. */
export function sheetNames(titles: string[]): string[] {
  const used = new Set<string>();
  return titles.map((title, index) => {
    const base = (title.replace(/[[\]:*?/\\]/g, " ").trim() || `表格${index + 1}`).slice(0, 28);
    let name = base;
    let suffix = 2;
    while (used.has(name.toLowerCase())) {
      name = `${base.slice(0, 27 - String(suffix).length)}-${suffix}`;
      suffix += 1;
    }
    used.add(name.toLowerCase());
    return name;
  });
}

export function safeFileName(name: string): string {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .slice(0, 60) || "结果"
  );
}
