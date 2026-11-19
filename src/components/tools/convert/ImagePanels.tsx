"use client";

import classNames from "classnames";
import { Button, Column, Feedback, IconButton, Row, Text } from "@once-ui-system/core";
import { useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import {
  baseName,
  convertImage,
  formatBytes,
  IMAGE_EXTENSIONS,
  type ImageFormat,
  imagesToPdf,
  type PageSize,
  pdfBlob,
  zipFiles,
} from "@/lib/convert";
import { downloadBlob } from "@/lib/export";
import { Choice } from "@/components/ui/Choice";
import { FileQueue, OptionRow, Progress, type QueuedFile, queueFiles } from "./shared";
import styles from "./convert.module.scss";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif";
const MAX_IMAGES = 50;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

function acceptImages(files: File[], existing: number): { files: File[]; error?: string } {
  const images = files.filter((file) => file.type.startsWith("image/"));
  const tooBig = images.filter((file) => file.size > MAX_IMAGE_BYTES);
  const kept = images.filter((file) => file.size <= MAX_IMAGE_BYTES).slice(0, Math.max(0, MAX_IMAGES - existing));
  let error: string | undefined;
  if (images.length < files.length) error = "已跳过不是图片的文件。";
  if (tooBig.length > 0) error = `已跳过 ${tooBig.length} 张超过 40 MB 的图片。`;
  if (existing + images.length > MAX_IMAGES) error = `一次最多处理 ${MAX_IMAGES} 张图片。`;
  return { files: kept, error };
}

type Result = { id: string; name: string; before: number; blob: Blob };

export function ImageConvertPanel() {
  const [items, setItems] = useState<QueuedFile[]>([]);
  const [format, setFormat] = useState<ImageFormat>("image/jpeg");
  const [quality, setQuality] = useState(82);
  const [maxSide, setMaxSide] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string>();

  const add = (files: File[]) => {
    const accepted = acceptImages(files, items.length);
    setError(accepted.error);
    setItems((previous) => [...previous, ...queueFiles(accepted.files)]);
    setResults([]);
  };

  const run = async () => {
    setError(undefined);
    setResults([]);
    setProgress({ done: 0, total: items.length });
    const output: Result[] = [];
    const failures: string[] = [];
    for (const [index, item] of items.entries()) {
      try {
        const blob = await convertImage(item.file, { format, quality: quality / 100, maxSide: maxSide || undefined });
        output.push({
          id: item.id,
          name: `${baseName(item.file.name)}.${IMAGE_EXTENSIONS[format]}`,
          before: item.file.size,
          blob,
        });
      } catch (convertError) {
        failures.push(`${item.file.name}：${convertError instanceof Error ? convertError.message : "转换失败"}`);
        if (index === 0 && convertError instanceof Error && convertError.message.includes("不支持导出")) break;
      }
      setProgress({ done: index + 1, total: items.length });
      setResults([...output]);
    }
    setProgress(null);
    if (failures.length > 0) setError(failures.slice(0, 3).join("\n"));
  };

  const downloadAll = async () => {
    const files = await Promise.all(
      results.map(async (result) => ({ name: result.name, data: new Uint8Array(await result.blob.arrayBuffer()) })),
    );
    downloadBlob(zipFiles(files), "图片转换结果.zip");
  };

  const busy = progress !== null;
  return (
    <div className={styles.panel}>
      <FileDrop
        accept={IMAGE_ACCEPT}
        multiple
        disabled={busy}
        title="点击或拖拽添加图片"
        hint={`支持 JPG、PNG、WebP、GIF、BMP，最多 ${MAX_IMAGES} 张`}
        onFiles={add}
      />
      {items.length > 0 && <FileQueue items={items} onChange={setItems} disabled={busy} reorder={false} />}

      <Column gap="12">
        <OptionRow label="输出格式">
          <Choice
            name="输出格式"
            value={format}
            disabled={busy}
            onChange={setFormat}
            options={[
              { value: "image/jpeg", label: "JPG" },
              { value: "image/png", label: "PNG" },
              { value: "image/webp", label: "WebP" },
            ]}
          />
        </OptionRow>
        {format !== "image/png" && (
          <OptionRow label="压缩质量">
            <input
              type="range"
              min={30}
              max={100}
              step={1}
              value={quality}
              disabled={busy}
              className={styles.range}
              aria-label="压缩质量"
              onChange={(event) => setQuality(Number(event.target.value))}
            />
            <Text variant="body-default-s">{quality}%</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              越低文件越小，70–85 一般看不出区别
            </Text>
          </OptionRow>
        )}
        <OptionRow label="最长边">
          <Choice
            name="最长边"
            value={maxSide}
            disabled={busy}
            onChange={setMaxSide}
            options={[
              { value: 0, label: "原尺寸" },
              { value: 3840, label: "3840" },
              { value: 1920, label: "1920" },
              { value: 1280, label: "1280" },
              { value: 800, label: "800" },
            ]}
          />
        </OptionRow>
      </Column>

      {error && <Feedback variant="warning" description={error} />}
      {progress && <Progress done={progress.done} total={progress.total} label="正在转换" />}

      <Row gap="8" wrap>
        <Button onClick={run} disabled={items.length === 0 || busy} loading={busy} prefixIcon="convert">
          开始转换
        </Button>
        {items.length > 0 && (
          <Button
            variant="tertiary"
            disabled={busy}
            onClick={() => {
              setItems([]);
              setResults([]);
              setError(undefined);
            }}
          >
            清空
          </Button>
        )}
      </Row>

      {results.length > 0 && (
        <Column gap="12">
          <Row horizontal="between" vertical="center">
            <Text variant="heading-strong-s">转换结果</Text>
            {results.length > 1 && (
              <Button size="s" variant="secondary" prefixIcon="download" onClick={downloadAll} disabled={busy}>
                全部下载（ZIP）
              </Button>
            )}
          </Row>
          <ul className={styles.results}>
            {results.map((result) => {
              const ratio = result.blob.size / result.before;
              return (
                <li key={result.id} className={styles.resultItem}>
                  <span className={styles.queueName}>{result.name}</span>
                  <span className={classNames(ratio <= 1 ? styles.smaller : styles.larger)} style={{ whiteSpace: "nowrap" }}>
                    {formatBytes(result.before)} → {formatBytes(result.blob.size)}（
                    {ratio <= 1 ? `-${Math.round((1 - ratio) * 100)}%` : `+${Math.round((ratio - 1) * 100)}%`}）
                  </span>
                  <IconButton
                    icon="download"
                    size="s"
                    variant="secondary"
                    aria-label={`下载 ${result.name}`}
                    onClick={() => downloadBlob(result.blob, result.name)}
                  />
                </li>
              );
            })}
          </ul>
        </Column>
      )}
    </div>
  );
}

export function ImagesToPdfPanel() {
  const [items, setItems] = useState<QueuedFile[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState(18);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const add = (files: File[]) => {
    const accepted = acceptImages(files, items.length);
    setError(accepted.error);
    setDone(undefined);
    setItems((previous) => [...previous, ...queueFiles(accepted.files)]);
  };

  const run = async () => {
    setError(undefined);
    setDone(undefined);
    setProgress({ done: 0, total: items.length });
    try {
      const data = await imagesToPdf(
        items.map((item) => item.file),
        { pageSize, margin },
        (count) => setProgress({ done: count, total: items.length }),
      );
      const blob = pdfBlob(data);
      const name = `${baseName(items[0].file.name)}${items.length > 1 ? `等${items.length}张` : ""}.pdf`;
      downloadBlob(blob, name);
      setDone(`已生成 ${name}（${items.length} 页，${formatBytes(blob.size)}），浏览器已开始下载。`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "生成失败");
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  return (
    <div className={styles.panel}>
      <FileDrop
        accept={IMAGE_ACCEPT}
        multiple
        disabled={busy}
        title="点击或拖拽添加图片"
        hint="每张图片一页，可以调整顺序"
        onFiles={add}
      />
      {items.length > 0 && <FileQueue items={items} onChange={setItems} disabled={busy} />}
      <Column gap="12">
        <OptionRow label="页面大小">
          <Choice
            name="页面大小"
            value={pageSize}
            disabled={busy}
            onChange={setPageSize}
            options={[
              { value: "a4", label: "A4（自动横竖）" },
              { value: "fit", label: "和图片一样大" },
            ]}
          />
        </OptionRow>
        <OptionRow label="页边距">
          <Choice
            name="页边距"
            value={margin}
            disabled={busy}
            onChange={setMargin}
            options={[
              { value: 0, label: "无" },
              { value: 18, label: "窄" },
              { value: 42, label: "宽" },
            ]}
          />
        </OptionRow>
      </Column>
      {error && <Feedback variant="danger" description={error} />}
      {done && <Feedback variant="success" description={done} />}
      {progress && <Progress done={progress.done} total={progress.total} label="正在生成" />}
      <Row gap="8">
        <Button onClick={run} disabled={items.length === 0 || busy} loading={busy} prefixIcon="documentText">
          生成 PDF
        </Button>
        {items.length > 0 && (
          <Button variant="tertiary" disabled={busy} onClick={() => setItems([])}>
            清空
          </Button>
        )}
      </Row>
    </div>
  );
}
