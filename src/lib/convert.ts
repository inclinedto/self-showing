"use client";

import { baseName } from "./files";

export { baseName, formatBytes, zipFiles } from "./files";

export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";

export const IMAGE_EXTENSIONS: Record<ImageFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export class ConvertError extends Error {}

/** Decodes an image, applying its EXIF orientation so phone photos are upright. */
async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ConvertError("无法读取这张图片，可能格式不支持或文件已损坏。");
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: ImageFormat, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ConvertError("图片生成失败，可能图片太大。"))),
      type,
      quality,
    ),
  );
}

type ConvertOptions = { format: ImageFormat; quality: number; maxSide?: number };

export async function convertImage(file: Blob, { format, quality, maxSide }: ConvertOptions): Promise<Blob> {
  const bitmap = await decode(file);
  const scale = maxSide ? Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new ConvertError("浏览器不支持图片处理。");
  if (format === "image/jpeg") {
    // JPEG has no transparency; without a fill, transparent areas turn black.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await canvasToBlob(canvas, format, format === "image/png" ? undefined : quality);
  canvas.width = 0;
  canvas.height = 0;
  if (blob.type !== format) {
    throw new ConvertError(`当前浏览器不支持导出 ${IMAGE_EXTENSIONS[format].toUpperCase()}，换成 Chrome 或 Edge 试试。`);
  }
  return blob;
}

async function loadPdfLib() {
  return import("pdf-lib");
}

const A4 = { width: 595.28, height: 841.89 };
const PX_TO_PT = 0.75;

export type PageSize = "fit" | "a4";

export async function imagesToPdf(
  files: File[],
  { pageSize, margin }: { pageSize: PageSize; margin: number },
  onProgress?: (done: number) => void,
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const pdf = await PDFDocument.create();
  for (const [index, file] of files.entries()) {
    // PNGs are embedded losslessly; everything else is re-encoded so EXIF rotation is applied.
    const image =
      file.type === "image/png"
        ? await pdf.embedPng(await file.arrayBuffer())
        : await pdf.embedJpg(await (await convertImage(file, { format: "image/jpeg", quality: 0.92 })).arrayBuffer());
    const width = image.width * PX_TO_PT;
    const height = image.height * PX_TO_PT;
    if (pageSize === "fit") {
      const page = pdf.addPage([width + margin * 2, height + margin * 2]);
      page.drawImage(image, { x: margin, y: margin, width, height });
    } else {
      const landscape = width > height;
      const pageWidth = landscape ? A4.height : A4.width;
      const pageHeight = landscape ? A4.width : A4.height;
      const scale = Math.min((pageWidth - margin * 2) / width, (pageHeight - margin * 2) / height, 1);
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: (pageWidth - width * scale) / 2,
        y: (pageHeight - height * scale) / 2,
        width: width * scale,
        height: height * scale,
      });
    }
    onProgress?.(index + 1);
  }
  return pdf.save();
}

async function loadPdf(file: File) {
  const { PDFDocument } = await loadPdfLib();
  try {
    return await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message)) {
      throw new ConvertError(`“${file.name}”设置了密码或加密，无法处理。`);
    }
    throw new ConvertError(`“${file.name}”不是有效的 PDF 文件。`);
  }
}

export async function pdfPageCount(file: File): Promise<number> {
  return (await loadPdf(file)).getPageCount();
}

export async function mergePdfs(files: File[], onProgress?: (done: number) => void): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const output = await PDFDocument.create();
  for (const [index, file] of files.entries()) {
    const source = await loadPdf(file);
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
    onProgress?.(index + 1);
  }
  return output.save();
}

/** Copies the given 1-based pages, in order, into a new PDF. */
export async function extractPages(file: File, pages: number[]): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const source = await loadPdf(file);
  const output = await PDFDocument.create();
  const copied = await output.copyPages(
    source,
    pages.map((page) => page - 1),
  );
  for (const page of copied) output.addPage(page);
  return output.save();
}

export async function splitEveryPage(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<{ name: string; data: Uint8Array }[]> {
  const { PDFDocument } = await loadPdfLib();
  const source = await loadPdf(file);
  const total = source.getPageCount();
  const width = String(total).length;
  const results: { name: string; data: Uint8Array }[] = [];
  for (let index = 0; index < total; index++) {
    const output = await PDFDocument.create();
    const [page] = await output.copyPages(source, [index]);
    output.addPage(page);
    results.push({
      name: `${baseName(file.name)}-第${String(index + 1).padStart(width, "0")}页.pdf`,
      data: await output.save(),
    });
    onProgress?.(index + 1, total);
  }
  return results;
}

export function pdfBlob(data: Uint8Array): Blob {
  return new Blob([data as BlobPart], { type: "application/pdf" });
}
