"use client";

import { closePdf, extractPageText, openPdf } from "./pdf";
import { sectionsFromPlainText, type Section } from "./retrieval";

export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
const MAX_PDF_PAGES = 500;

export type ParsedDocument = {
  name: string;
  sections: Section[];
  pageCount: number;
  /** Pages with no extractable text, usually scans. */
  emptyLabels: string[];
  truncated: boolean;
};

export class DocumentError extends Error {}

export const ACCEPTED_DOCUMENTS = ".pdf,.docx,.txt,.md,.markdown,application/pdf";

export async function parseDocument(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<ParsedDocument> {
  if (file.size > MAX_DOCUMENT_BYTES) throw new DocumentError("文件不能超过 50 MB");
  const name = file.name;
  const lower = name.toLowerCase();

  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    let doc: Awaited<ReturnType<typeof openPdf>>;
    try {
      doc = await openPdf(await file.arrayBuffer());
    } catch (error) {
      console.error(error);
      throw new DocumentError("PDF 无法打开，可能已损坏或设置了密码");
    }
    try {
      const total = Math.min(doc.numPages, MAX_PDF_PAGES);
      const sections: Section[] = [];
      const emptyLabels: string[] = [];
      for (let page = 1; page <= total; page++) {
        const label = `第 ${page} 页`;
        const text = await extractPageText(doc, page);
        if (text.replace(/\s/g, "").length < 10) emptyLabels.push(label);
        else sections.push({ label, text });
        onProgress(page, total);
      }
      return { name, sections, pageCount: total, emptyLabels, truncated: doc.numPages > total };
    } finally {
      closePdf(doc);
    }
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    try {
      const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      const sections = sectionsFromPlainText(value);
      onProgress(1, 1);
      return { name, sections, pageCount: sections.length, emptyLabels: [], truncated: false };
    } catch (error) {
      console.error(error);
      throw new DocumentError("Word 文档无法读取，请确认是 .docx 格式");
    }
  }

  if (lower.endsWith(".doc")) {
    throw new DocumentError("暂不支持旧版 .doc，请在 Word 里另存为 .docx 或 PDF");
  }

  if (/\.(txt|md|markdown)$/.test(lower) || file.type.startsWith("text/")) {
    const sections = sectionsFromPlainText(await file.text());
    onProgress(1, 1);
    return { name, sections, pageCount: sections.length, emptyLabels: [], truncated: false };
  }

  throw new DocumentError("只支持 PDF、Word（.docx）、TXT、Markdown");
}
