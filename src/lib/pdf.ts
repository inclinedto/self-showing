"use client";

type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<Pdfjs> | null = null;

// The legacy build supports older in-app browsers (WeChat, QQ) that the modern build drops.
function loadPdfjs(): Promise<Pdfjs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function openPdf(data: ArrayBuffer) {
  const pdfjs = await loadPdfjs();
  return pdfjs.getDocument({
    data: new Uint8Array(data),
    // Without CMaps, text in many Chinese PDFs (CID-keyed fonts) comes back empty or garbled.
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    wasmUrl: "/pdfjs/wasm/",
  }).promise;
}

export type PdfDocument = Awaited<ReturnType<typeof openPdf>>;

/** Frees the worker-side document; pdf.js 6 moved destroy() onto the loading task. */
export function closePdf(doc: PdfDocument | null) {
  doc?.loadingTask.destroy().catch(() => {});
}

const CJK_EDGE = /[\u3400-\u9fff\uff00-\uffef\u3000-\u303f]/;

type TextItem = { str: string; hasEOL?: boolean; transform: number[] };

export async function extractPageText(doc: PdfDocument, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();
  let text = "";
  let lastY: number | null = null;

  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const item = raw as TextItem;
    const y = item.transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2 && !text.endsWith("\n")) {
      text += "\n";
    }
    const previous = text.slice(-1);
    const next = item.str.slice(0, 1);
    const needsSpace =
      previous &&
      next &&
      previous !== "\n" &&
      previous !== " " &&
      next !== " " &&
      !(CJK_EDGE.test(previous) || CJK_EDGE.test(next));
    text += (needsSpace ? " " : "") + item.str;
    if (item.hasEOL) text += "\n";
    lastY = y;
  }
  page.cleanup();
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

type RenderOptions = { maxWidth: number; maxHeight?: number; quality?: number };

/** Renders a page to a JPEG data URL on a white background. */
export async function renderPage(
  doc: PdfDocument,
  pageNumber: number,
  { maxWidth, maxHeight = maxWidth * 2, quality = 0.85 }: RenderOptions,
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(maxWidth / base.width, maxHeight / base.height, 3);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  page.cleanup();
  const url = canvas.toDataURL("image/jpeg", quality);
  canvas.width = 0;
  canvas.height = 0;
  return url;
}

/** Renders a page at a fixed scale (1 = 72 dpi) to an image blob. */
export async function renderPageToBlob(
  doc: PdfDocument,
  pageNumber: number,
  { scale, type, quality = 0.92 }: { scale: number; type: "image/png" | "image/jpeg"; quality?: number },
): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  // Browsers refuse canvases much beyond ~16k px per side or ~250M px in total.
  const safeScale = Math.min(scale, 8000 / base.width, 8000 / base.height);
  const viewport = page.getViewport({ scale: safeScale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  page.cleanup();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("图片生成失败");
  return blob;
}
