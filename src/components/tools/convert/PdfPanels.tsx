"use client";

import { Button, Column, Feedback, Input, Row, Text } from "@once-ui-system/core";
import { useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import {
  baseName,
  extractPages,
  formatBytes,
  mergePdfs,
  pdfBlob,
  pdfPageCount,
  splitEveryPage,
  zipFiles,
} from "@/lib/convert";
import { downloadBlob } from "@/lib/export";
import { PageRangeError, parsePageRanges } from "@/lib/pageRanges";
import { closePdf, openPdf, renderPageToBlob } from "@/lib/pdf";
import { Choice } from "@/components/ui/Choice";
import { FileQueue, OptionRow, Progress, type QueuedFile, queueFiles } from "./shared";
import styles from "./convert.module.scss";

const PDF_ACCEPT = "application/pdf,.pdf";
const MAX_PDF_BYTES = 200 * 1024 * 1024;

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

type Picked = { file: File; pages: number };

function usePickedPdf() {
  const [picked, setPicked] = useState<Picked | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string>();

  const pick = async ([file]: File[]) => {
    setError(undefined);
    setPicked(null);
    if (!file || !isPdf(file)) return setError("请选择 PDF 文件。");
    if (file.size > MAX_PDF_BYTES) return setError("文件超过 200 MB，暂不支持。");
    setReading(true);
    try {
      setPicked({ file, pages: await pdfPageCount(file) });
    } catch (readError) {
      setError(message(readError, "PDF 读取失败"));
    } finally {
      setReading(false);
    }
  };
  return { picked, reading, error, setError, pick, clear: () => setPicked(null) };
}

function PickedSummary({ picked, onClear, disabled }: { picked: Picked; onClear: () => void; disabled: boolean }) {
  return (
    <Row className={styles.queueItem} gap="8" vertical="center">
      <span className={styles.queueName}>{picked.file.name}</span>
      <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: "nowrap" }}>
        {picked.pages} 页 · {formatBytes(picked.file.size)}
      </Text>
      <Button size="s" variant="tertiary" onClick={onClear} disabled={disabled}>
        换一个
      </Button>
    </Row>
  );
}

export function PdfToImagesPanel() {
  const { picked, reading, error, setError, pick, clear } = usePickedPdf();
  const [format, setFormat] = useState<"image/png" | "image/jpeg">("image/png");
  const [scale, setScale] = useState(2);
  const [range, setRange] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState<string>();

  const run = async () => {
    if (!picked) return;
    setError(undefined);
    setDone(undefined);
    let pages: number[];
    try {
      pages = range.trim()
        ? parsePageRanges(range, picked.pages)
        : Array.from({ length: picked.pages }, (_, index) => index + 1);
    } catch (rangeError) {
      return setError(rangeError instanceof PageRangeError ? rangeError.message : "页码格式有误");
    }

    setProgress({ done: 0, total: pages.length });
    const doc = await openPdf(await picked.file.arrayBuffer()).catch(() => null);
    if (!doc) {
      setProgress(null);
      return setError("PDF 打开失败，文件可能已损坏或加密。");
    }
    try {
      const extension = format === "image/png" ? "png" : "jpg";
      const width = String(picked.pages).length;
      const files: { name: string; data: Uint8Array }[] = [];
      for (const [index, page] of pages.entries()) {
        const blob = await renderPageToBlob(doc, page, { scale, type: format });
        files.push({
          name: `${baseName(picked.file.name)}-第${String(page).padStart(width, "0")}页.${extension}`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
        setProgress({ done: index + 1, total: pages.length });
      }
      if (files.length === 1) {
        downloadBlob(new Blob([files[0].data as BlobPart], { type: format }), files[0].name);
      } else {
        downloadBlob(zipFiles(files), `${baseName(picked.file.name)}-图片.zip`);
      }
      setDone(`已导出 ${files.length} 张图片，浏览器已开始下载。`);
    } catch (runError) {
      setError(message(runError, "导出失败"));
    } finally {
      closePdf(doc);
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <div className={styles.panel}>
      {picked ? (
        <PickedSummary picked={picked} onClear={clear} disabled={busy} />
      ) : (
        <FileDrop
          accept={PDF_ACCEPT}
          disabled={reading}
          title={reading ? "正在读取…" : "点击或拖拽上传 PDF"}
          hint="每一页导出为一张图片，多页会打包成 ZIP"
          onFiles={pick}
        />
      )}
      <Column gap="12">
        <OptionRow label="图片格式">
          <Choice
            name="图片格式"
            value={format}
            disabled={busy}
            onChange={setFormat}
            options={[
              { value: "image/png", label: "PNG（清晰）" },
              { value: "image/jpeg", label: "JPG（体积小）" },
            ]}
          />
        </OptionRow>
        <OptionRow label="清晰度">
          <Choice
            name="清晰度"
            value={scale}
            disabled={busy}
            onChange={setScale}
            options={[
              { value: 1, label: "标准 72dpi" },
              { value: 2, label: "高清 144dpi" },
              { value: 3, label: "超清 216dpi" },
            ]}
          />
        </OptionRow>
        <OptionRow label="页码">
          <div className={styles.rangeInput}>
            <Input
              id="pdf-image-range"
              label="留空导出全部，例如 1-3,5"
              value={range}
              disabled={busy}
              onChange={(event) => setRange(event.target.value)}
            />
          </div>
        </OptionRow>
      </Column>
      {error && <Feedback variant="danger" description={error} />}
      {done && <Feedback variant="success" description={done} />}
      {progress && <Progress done={progress.done} total={progress.total} label="正在导出" />}
      <Row>
        <Button onClick={run} disabled={!picked || busy} loading={busy} prefixIcon="image">
          导出图片
        </Button>
      </Row>
    </div>
  );
}

export function PdfMergePanel() {
  const [items, setItems] = useState<QueuedFile[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const add = (files: File[]) => {
    const pdfs = files.filter(isPdf).filter((file) => file.size <= MAX_PDF_BYTES);
    setError(pdfs.length < files.length ? "已跳过不是 PDF 或超过 200 MB 的文件。" : undefined);
    setDone(undefined);
    setItems((previous) => [...previous, ...queueFiles(pdfs)].slice(0, 50));
  };

  const run = async () => {
    setError(undefined);
    setDone(undefined);
    setProgress({ done: 0, total: items.length });
    try {
      const data = await mergePdfs(
        items.map((item) => item.file),
        (count) => setProgress({ done: count, total: items.length }),
      );
      const blob = pdfBlob(data);
      const name = `${baseName(items[0].file.name)}-合并.pdf`;
      downloadBlob(blob, name);
      setDone(`已合并为 ${name}（${formatBytes(blob.size)}），浏览器已开始下载。`);
    } catch (runError) {
      setError(message(runError, "合并失败"));
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <div className={styles.panel}>
      <FileDrop
        accept={PDF_ACCEPT}
        multiple
        disabled={busy}
        title="点击或拖拽添加 PDF"
        hint="按列表顺序合并，可以调整顺序"
        onFiles={add}
      />
      {items.length > 0 && <FileQueue items={items} onChange={setItems} disabled={busy} />}
      {error && <Feedback variant="danger" description={error} />}
      {done && <Feedback variant="success" description={done} />}
      {progress && <Progress done={progress.done} total={progress.total} label="正在合并" />}
      <Row gap="8">
        <Button onClick={run} disabled={items.length < 2 || busy} loading={busy} prefixIcon="documents">
          合并 PDF
        </Button>
        {items.length > 0 && (
          <Button variant="tertiary" disabled={busy} onClick={() => setItems([])}>
            清空
          </Button>
        )}
      </Row>
      {items.length === 1 && (
        <Text variant="body-default-xs" onBackground="neutral-weak">
          至少添加 2 个 PDF 才能合并。
        </Text>
      )}
    </div>
  );
}

export function PdfSplitPanel() {
  const { picked, reading, error, setError, pick, clear } = usePickedPdf();
  const [mode, setMode] = useState<"extract" | "every">("extract");
  const [range, setRange] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState<string>();

  const run = async () => {
    if (!picked) return;
    setError(undefined);
    setDone(undefined);
    try {
      if (mode === "extract") {
        const pages = parsePageRanges(range, picked.pages);
        setProgress({ done: 0, total: 1 });
        const blob = pdfBlob(await extractPages(picked.file, pages));
        const name = `${baseName(picked.file.name)}-第${range.replace(/\s+/g, "")}页.pdf`;
        downloadBlob(blob, name.length > 120 ? `${baseName(picked.file.name)}-提取.pdf` : name);
        setDone(`已提取 ${pages.length} 页（${formatBytes(blob.size)}），浏览器已开始下载。`);
      } else {
        setProgress({ done: 0, total: picked.pages });
        const files = await splitEveryPage(picked.file, (count, total) => setProgress({ done: count, total }));
        downloadBlob(zipFiles(files), `${baseName(picked.file.name)}-拆分.zip`);
        setDone(`已拆分为 ${files.length} 个 PDF，打包下载中。`);
      }
    } catch (runError) {
      setError(runError instanceof PageRangeError ? runError.message : message(runError, "拆分失败"));
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <div className={styles.panel}>
      {picked ? (
        <PickedSummary picked={picked} onClear={clear} disabled={busy} />
      ) : (
        <FileDrop
          accept={PDF_ACCEPT}
          disabled={reading}
          title={reading ? "正在读取…" : "点击或拖拽上传 PDF"}
          hint="提取其中几页，或者每页拆成一个文件"
          onFiles={pick}
        />
      )}
      <Column gap="12">
        <OptionRow label="拆分方式">
          <Choice
            name="拆分方式"
            value={mode}
            disabled={busy}
            onChange={setMode}
            options={[
              { value: "extract", label: "提取指定页" },
              { value: "every", label: "每页一个文件" },
            ]}
          />
        </OptionRow>
        {mode === "extract" && (
          <OptionRow label="页码">
            <div className={styles.rangeInput}>
              <Input
                id="pdf-split-range"
                label="例如 1-3,5,8-"
                value={range}
                disabled={busy}
                onChange={(event) => setRange(event.target.value)}
              />
            </div>
          </OptionRow>
        )}
      </Column>
      {error && <Feedback variant="danger" description={error} />}
      {done && <Feedback variant="success" description={done} />}
      {progress && <Progress done={progress.done} total={progress.total} label="正在处理" />}
      <Row>
        <Button
          onClick={run}
          disabled={!picked || busy || (mode === "extract" && !range.trim())}
          loading={busy}
          prefixIcon="scissors"
        >
          {mode === "extract" ? "提取页面" : "拆分"}
        </Button>
      </Row>
    </div>
  );
}
