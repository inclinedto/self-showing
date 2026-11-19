export class PageRangeError extends Error {}

/**
 * Parses "1-3, 5, 8-" into 1-based page numbers in the order given, without duplicates.
 * An open end ("8-") runs to the last page.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const text = input.replace(/[，、；;\s]+/g, ",").replace(/[～~—–]/g, "-");
  const parts = text.split(",").filter(Boolean);
  if (parts.length === 0) throw new PageRangeError("请输入页码，例如 1-3,5");

  const pages: number[] = [];
  const seen = new Set<number>();
  for (const part of parts) {
    const match = part.match(/^(\d+)?(?:(-)(\d+)?)?$/);
    if (!match || (!match[1] && !match[3])) throw new PageRangeError(`无法识别“${part}”`);
    const start = Number(match[1] ?? 1);
    const end = match[2] ? Number(match[3] ?? pageCount) : start;
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      throw new PageRangeError(`页码“${part}”超出范围（共 ${pageCount} 页）`);
    }
    const step = start <= end ? 1 : -1;
    for (let page = start; step > 0 ? page <= end : page >= end; page += step) {
      if (!seen.has(page)) {
        seen.add(page);
        pages.push(page);
      }
    }
  }
  return pages;
}
