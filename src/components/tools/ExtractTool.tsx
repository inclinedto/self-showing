"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Column,
  Feedback,
  Grid,
  Heading,
  Icon,
  ProgressBar,
  Row,
  SegmentedControl,
  Spinner,
  TagInput,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { FileDrop } from "@/components/FileDrop";
import fileDropStyles from "@/components/FileDrop.module.scss";
import { DemoBanner, QuotaExceeded, QuotaHint } from "@/components/session/QuotaHint";
import { useSession } from "@/components/session/SessionProvider";
import { TableEditor } from "@/components/tools/TableEditor";
import { ApiError, apiFetch } from "@/lib/api";
import { exportExcel, exportJson } from "@/lib/export";
import { fitDataUrl, imageFileToJpeg } from "@/lib/images";
import { closePdf, openPdf, renderPage, type PdfDocument } from "@/lib/pdf";
import { mergeSameHeaderTables } from "@/lib/tables";
import type { ExtractedTable, ExtractMode, ExtractResponse } from "@/lib/types";

const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PAGES = 50;
const CONCURRENCY = 2;
const DEFAULT_FIELDS = ["发票号码", "开票日期", "金额", "税额", "销售方"];

type PageStatus = "idle" | "working" | "done" | "error";

type PageItem = {
  key: string;
  order: number;
  label: string;
  thumb: string;
  selected: boolean;
  status: PageStatus;
  error?: string;
  tableCount?: number;
  pdfPage?: number;
  file?: File;
};

type TableItem = ExtractedTable & { order: number };

// These fail every remaining page the same way, so the batch stops at the first one.
const FATAL_STATUSES = [401, 402, 403, 429, 503];

let idCounter = 0;
const nextId = () => `t${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function ExtractTool() {
  const { addToast } = useToast();
  const { refresh } = useSession();
  const pdfRef = useRef<PdfDocument | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);
  const [mode, setMode] = useState<ExtractMode>("tables");
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [instructions, setInstructions] = useState("");
  const [tables, setTables] = useState<TableItem[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string>();
  const [quotaError, setQuotaError] = useState<string>();

  const releaseFiles = () => {
    closePdf(pdfRef.current);
    pdfRef.current = null;
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current = [];
  };

  useEffect(
    () => () => {
      closePdf(pdfRef.current);
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const updatePage = (key: string, patch: Partial<PageItem>) =>
    setPages((previous) =>
      previous.map((page) => (page.key === key ? { ...page, ...patch } : page)),
    );

  const reset = () => {
    releaseFiles();
    setPages([]);
    setTables([]);
    setFileName("");
    setError(undefined);
    setProgress({ done: 0, total: 0 });
  };

  const loadPdf = async (file: File) => {
    if (file.size > MAX_PDF_BYTES) throw new Error("PDF 不能超过 30 MB");
    const doc = await openPdf(await file.arrayBuffer());
    pdfRef.current = doc;
    const count = Math.min(doc.numPages, MAX_PAGES);
    if (doc.numPages > MAX_PAGES) {
      addToast({
        variant: "danger",
        message: `文档共 ${doc.numPages} 页，只能处理前 ${MAX_PAGES} 页`,
      });
    }
    const items: PageItem[] = Array.from({ length: count }, (_, index) => ({
      key: `p${index + 1}`,
      order: index,
      label: `第 ${index + 1} 页`,
      thumb: "",
      selected: count <= 10 || index === 0,
      status: "idle",
      pdfPage: index + 1,
    }));
    setPages(items);
    for (const item of items) {
      if (pdfRef.current !== doc) return;
      const thumb = await renderPage(doc, item.pdfPage as number, { maxWidth: 200, quality: 0.7 });
      updatePage(item.key, { thumb });
    }
  };

  const loadImages = (files: File[]) => {
    const tooLarge = files.filter((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge.length > 0)
      addToast({ variant: "danger", message: "单张图片不能超过 15 MB，已跳过" });
    const accepted = files.filter((file) => file.size <= MAX_IMAGE_BYTES).slice(0, MAX_PAGES);
    const items: PageItem[] = accepted.map((file, index) => ({
      key: `i${index}-${file.name}`,
      order: index,
      label: file.name,
      thumb: URL.createObjectURL(file),
      selected: true,
      status: "idle",
      file,
    }));
    objectUrlsRef.current = items.map((item) => item.thumb);
    setPages(items);
  };

  const onFiles = async (files: File[]) => {
    reset();
    const pdf = files.find((file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name));
    const images = files.filter((file) => /^image\/(png|jpeg|webp)$/.test(file.type));
    if (!pdf && images.length === 0) {
      setError("只支持 PDF、PNG、JPG、WebP 格式");
      return;
    }
    setLoadingFile(true);
    try {
      if (pdf) {
        setFileName(pdf.name);
        await loadPdf(pdf);
      } else {
        setFileName(images.length === 1 ? images[0].name : `${images.length} 张图片`);
        loadImages(images);
      }
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError instanceof Error && loadError.message.length < 60
          ? loadError.message
          : "文件读取失败，可能已损坏或加密",
      );
      setPages([]);
    } finally {
      setLoadingFile(false);
    }
  };

  const pageImage = async (page: PageItem): Promise<string> => {
    if (page.file) return imageFileToJpeg(page.file);
    if (!pdfRef.current || !page.pdfPage) throw new Error("文档已关闭");
    return fitDataUrl(
      await renderPage(pdfRef.current, page.pdfPage, { maxWidth: 1600, maxHeight: 2400 }),
    );
  };

  const insertTables = (page: PageItem, result: ExtractResponse) => {
    const items: TableItem[] = result.tables.map((table) => ({
      ...table,
      id: nextId(),
      source: page.pdfPage ? page.label : `图片：${page.label}`,
      order: page.order,
    }));
    setTables((previous) => {
      const kept = previous.filter((table) => table.order !== page.order);
      return [...kept, ...items].sort((a, b) => a.order - b.order);
    });
  };

  const processPage = async (page: PageItem) => {
    updatePage(page.key, { status: "working", error: undefined });
    try {
      const image = await pageImage(page);
      const response = await apiFetch("/api/extract", {
        body: { image, mode, fields, instructions },
      });
      const data = (await response.json()) as ExtractResponse;
      insertTables(page, data);
      updatePage(page.key, { status: "done", tableCount: data.tables.length });
    } catch (pageError) {
      const message = pageError instanceof Error ? pageError.message : "处理失败";
      updatePage(page.key, { status: "error", error: message });
      throw pageError;
    } finally {
      setProgress((previous) => ({ ...previous, done: previous.done + 1 }));
    }
  };

  const run = async (targets: PageItem[]) => {
    if (targets.length === 0) return;
    if (mode === "fields" && fields.length === 0) {
      setError("请至少填写一个要提取的字段");
      return;
    }
    setError(undefined);
    setQuotaError(undefined);
    setRunning(true);
    setProgress({ done: 0, total: targets.length });

    const queue = [...targets];
    let failures = 0;
    let fatal: ApiError | undefined;
    const worker = async () => {
      while (queue.length > 0 && !fatal) {
        const page = queue.shift() as PageItem;
        try {
          await processPage(page);
        } catch (pageError) {
          failures += 1;
          if (pageError instanceof ApiError && FATAL_STATUSES.includes(pageError.status)) {
            fatal = pageError;
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    setRunning(false);
    refresh();

    if (fatal?.code === "quota_exceeded") setQuotaError(fatal.message);
    else if (fatal) setError(fatal.message);
    else if (failures > 0) setError(`${failures} 页处理失败，可以点击“重试失败的页面”`);
  };

  const selectedPages = pages.filter((page) => page.selected);
  const failedPages = pages.filter((page) => page.status === "error");
  const canMerge = mergeSameHeaderTables(tables).length < tables.length;
  const baseName = fileName || "表格提取结果";

  const download = async (kind: "excel" | "json") => {
    try {
      if (kind === "excel") await exportExcel(tables, baseName);
      else exportJson(tables, baseName);
    } catch (downloadError) {
      console.error(downloadError);
      addToast({ variant: "danger", message: "导出失败，请重试" });
    }
  };

  const merge = () => {
    const merged = mergeSameHeaderTables(tables);
    setTables(merged.map((table) => ({ ...(table as TableItem) })));
    addToast({ variant: "success", message: `已合并为 ${merged.length} 个表格` });
  };

  return (
    <Column fillWidth gap="32">
      <Column gap="8">
        <Heading as="h1" variant="display-strong-s">
          表格提取
        </Heading>
        <Text onBackground="neutral-weak" variant="body-default-l">
          上传 PDF 或图片，AI 把其中的表格转成可编辑的数据，导出 Excel / CSV / JSON。
        </Text>
        <QuotaHint feature="extract" />
      </Column>
      <DemoBanner />

      {pages.length === 0 ? (
        <Column gap="12">
          <FileDrop
            accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
            multiple
            disabled={loadingFile}
            title={loadingFile ? "正在读取文件…" : "点击或拖拽上传"}
            hint={`一个 PDF（最多 ${MAX_PAGES} 页、30 MB），或多张 PNG / JPG / WebP 图片`}
            onFiles={onFiles}
          />
          <Row gap="8" vertical="center">
            <Icon name="shield" size="xs" onBackground="neutral-weak" />
            <Text variant="body-default-xs" onBackground="neutral-weak">
              文件在浏览器本地读取，只有你选中的页面会以图片形式发给 AI 模型识别，服务器不保存。
            </Text>
          </Row>
        </Column>
      ) : (
        <Column gap="16">
          <Row
            fillWidth
            horizontal="between"
            vertical="center"
            gap="12"
            s={{ direction: "column", vertical: "start" }}
          >
            <Row gap="8" vertical="center">
              <Icon name="documentText" onBackground="brand-medium" />
              <Text variant="heading-strong-s">{fileName}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                已选 {selectedPages.length} / {pages.length}
              </Text>
            </Row>
            <Row gap="8">
              <Button
                variant="tertiary"
                size="s"
                disabled={running}
                onClick={() =>
                  setPages((previous) => previous.map((page) => ({ ...page, selected: true })))
                }
              >
                全选
              </Button>
              <Button
                variant="tertiary"
                size="s"
                disabled={running}
                onClick={() =>
                  setPages((previous) => previous.map((page) => ({ ...page, selected: false })))
                }
              >
                清空选择
              </Button>
              <Button
                variant="secondary"
                size="s"
                prefixIcon="refresh"
                disabled={running}
                onClick={reset}
              >
                换个文件
              </Button>
            </Row>
          </Row>
          <Grid columns="6" m={{ columns: 4 }} s={{ columns: 3 }} gap="12" fillWidth>
            {pages.map((page) => (
              <PageThumb
                key={page.key}
                page={page}
                disabled={running}
                onToggle={() => updatePage(page.key, { selected: !page.selected })}
              />
            ))}
          </Grid>
        </Column>
      )}

      {pages.length > 0 && (
        <Column gap="16" padding="20" radius="l" border="neutral-alpha-weak" background="surface">
          <Row gap="12" vertical="center" s={{ direction: "column", vertical: "start" }}>
            <Text variant="label-strong-m" style={{ whiteSpace: "nowrap" }}>
              提取方式
            </Text>
            <SegmentedControl
              selected={mode}
              onToggle={(value) => setMode(value as ExtractMode)}
              buttons={[
                { value: "tables", label: "自动识别所有表格", prefixIcon: "table" },
                { value: "fields", label: "按字段提取", prefixIcon: "documentText" },
              ]}
            />
          </Row>
          {mode === "fields" && (
            <TagInput
              id="fields"
              label="要提取的字段（回车添加）"
              value={fields}
              onChange={setFields}
              description="适合发票、合同、证件、报告等：每个字段一列，多条记录会分多行。"
            />
          )}
          <Textarea
            id="instructions"
            label="补充说明（可选）"
            lines={2}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            description="例如：只要第二个表格；金额去掉货币符号；忽略合计行"
          />
          <Row gap="12" vertical="center" s={{ direction: "column", vertical: "start" }}>
            <Button
              prefixIcon="sparkles"
              loading={running}
              disabled={running || selectedPages.length === 0}
              onClick={() => run(selectedPages)}
            >
              {running ? "正在提取…" : `提取所选 ${selectedPages.length} 页`}
            </Button>
            {failedPages.length > 0 && !running && (
              <Button variant="secondary" prefixIcon="refresh" onClick={() => run(failedPages)}>
                重试失败的页面（{failedPages.length}）
              </Button>
            )}
            {tables.length > 0 && !running && (
              <Text variant="body-default-xs" onBackground="neutral-weak">
                再次提取会替换对应页面的结果
              </Text>
            )}
          </Row>
          {running && (
            <Column gap="4">
              <ProgressBar
                value={progress.total ? (progress.done / progress.total) * 100 : 0}
                label={false}
              />
              <Text variant="body-default-xs" onBackground="neutral-weak">
                已完成 {progress.done} / {progress.total} 页，复杂页面每页约需 10–30 秒
              </Text>
            </Column>
          )}
        </Column>
      )}

      {error && <Feedback variant="danger" description={error} />}
      {quotaError && <QuotaExceeded message={quotaError} />}

      {tables.length > 0 && (
        <Column gap="16">
          <Row
            fillWidth
            horizontal="between"
            vertical="center"
            gap="12"
            s={{ direction: "column", vertical: "start" }}
          >
            <Heading as="h2" variant="heading-strong-l">
              提取结果（{tables.length} 个表格）
            </Heading>
            <Row gap="8" wrap>
              {canMerge && (
                <Button variant="secondary" size="s" onClick={merge}>
                  合并相同表头的表格
                </Button>
              )}
              <Button
                variant="secondary"
                size="s"
                prefixIcon="download"
                onClick={() => download("json")}
              >
                JSON
              </Button>
              <Button size="s" prefixIcon="download" onClick={() => download("excel")}>
                导出 Excel
              </Button>
            </Row>
          </Row>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            AI 识别可能有误，导出前请对照原文检查关键数字。单元格可以直接点击修改。
          </Text>
          {tables.map((table) => (
            <TableEditor
              key={table.id}
              table={table}
              fileName={baseName}
              onChange={(updated) =>
                setTables((previous) =>
                  previous.map((item) => (item.id === table.id ? { ...item, ...updated } : item)),
                )
              }
              onRemove={() =>
                setTables((previous) => previous.filter((item) => item.id !== table.id))
              }
            />
          ))}
        </Column>
      )}

      {!running && pages.some((page) => page.status === "done") && tables.length === 0 && (
        <Feedback
          variant="info"
          description="所选页面里没有识别到表格。可以换成“按字段提取”，或在补充说明里描述你要的内容。"
        />
      )}
    </Column>
  );
}

function PageThumb({
  page,
  disabled,
  onToggle,
}: { page: PageItem; disabled: boolean; onToggle: () => void }) {
  const statusText: Record<PageStatus, string> = {
    idle: "",
    working: "识别中",
    done: page.tableCount ? `${page.tableCount} 个表格` : "无表格",
    error: "失败",
  };
  return (
    <Column
      as="label"
      className={fileDropStyles.zone}
      gap="4"
      padding="4"
      radius="m"
      border={page.selected ? "brand-medium" : "neutral-alpha-weak"}
      background={page.selected ? "brand-alpha-weak" : "transparent"}
      cursor={disabled ? undefined : "interactive"}
      title={page.error}
    >
      <input
        type="checkbox"
        className={fileDropStyles.input}
        checked={page.selected}
        disabled={disabled}
        onChange={onToggle}
        aria-label={page.label}
      />
      <Row
        fillWidth
        radius="s"
        overflow="hidden"
        background="neutral-alpha-weak"
        center
        style={{ aspectRatio: "3 / 4" }}
      >
        {page.thumb ? (
          <img
            src={page.thumb}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain", background: "#fff" }}
          />
        ) : (
          <Spinner size="s" />
        )}
      </Row>
      <Row fillWidth horizontal="between" vertical="center" paddingX="4" gap="4">
        <Text
          variant="body-default-xs"
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {page.label}
        </Text>
        {page.status === "working" ? (
          <Spinner size="xs" />
        ) : page.status === "error" ? (
          <Icon name="warning" size="xs" onBackground="danger-medium" />
        ) : page.status === "done" ? (
          <Text
            variant="body-default-xs"
            onBackground="brand-medium"
            style={{ whiteSpace: "nowrap" }}
          >
            {statusText.done}
          </Text>
        ) : null}
      </Row>
    </Column>
  );
}
