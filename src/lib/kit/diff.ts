/** 文本对比的纯逻辑：拆行、生成统一视图的行、折叠相同内容、统计差异。差异本身由 jsdiff 计算。 */

/** Structural subset of jsdiff's ChangeObject. */
export type Change<T> = { value: T; added: boolean; removed: boolean; count?: number };

export type LineRow =
  | { kind: "same" | "add" | "del"; text: string; oldNo?: number; newNo?: number }
  | { kind: "skip"; hidden: number /** Old-side number of the first hidden line. */; at: number };

/** Splits text into lines; a single trailing newline does not create an extra empty line. */
export function splitLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export function makeLineComparator(ignoreCase: boolean, ignoreTrim: boolean) {
  const normalize = (line: string) => {
    const trimmed = ignoreTrim ? line.trim() : line;
    return ignoreCase ? trimmed.toLowerCase() : trimmed;
  };
  return (left: string, right: string) => left === right || normalize(left) === normalize(right);
}

/**
 * Turns array changes (one entry per line) into unified-view rows with line numbers.
 * Unchanged runs keep `context` lines next to each change; the rest becomes one "skip" row.
 */
export function buildLineRows(
  changes: readonly Change<readonly string[]>[],
  context = 3,
  collapse = true,
): LineRow[] {
  const rows: LineRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  changes.forEach((change, index) => {
    const lines = change.value;
    if (change.added) {
      for (const text of lines) rows.push({ kind: "add", text, newNo: newNo++ });
      return;
    }
    if (change.removed) {
      for (const text of lines) rows.push({ kind: "del", text, oldNo: oldNo++ });
      return;
    }
    const head = index > 0 ? context : 0;
    const tail = index < changes.length - 1 ? context : 0;
    const hidden = lines.length - head - tail;
    const fold = collapse && hidden > 1;
    lines.forEach((text, i) => {
      if (fold && i === head) rows.push({ kind: "skip", hidden, at: oldNo + i });
      if (fold && i >= head && i < head + hidden) return;
      rows.push({ kind: "same", text, oldNo: oldNo + i, newNo: newNo + i });
    });
    oldNo += lines.length;
    newNo += lines.length;
  });
  return rows;
}

export type DiffSummary = {
  /** Number of inserted / deleted blocks ("处"). */
  added: number;
  removed: number;
  /** Number of inserted / deleted tokens (lines, words or characters). */
  addedUnits: number;
  removedUnits: number;
};

export function summarize<T>(changes: readonly Change<T>[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, addedUnits: 0, removedUnits: 0 };
  for (const change of changes) {
    const units = change.count ?? (Array.isArray(change.value) ? change.value.length : 1);
    if (change.added) {
      summary.added++;
      summary.addedUnits += units;
    } else if (change.removed) {
      summary.removed++;
      summary.removedUnits += units;
    }
  }
  return summary;
}

export function describeSummary(summary: DiffSummary): string {
  if (!summary.added && !summary.removed) return "两段文本完全相同";
  return `新增 ${summary.added} 处，删除 ${summary.removed} 处`;
}
