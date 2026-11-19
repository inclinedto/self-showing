"use client";

import { Button } from "@once-ui-system/core";
import { useEffect, useId, useRef, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { baseName, downloadBlob, zipFiles } from "@/lib/files";
import { beijingToday, formatYmd } from "@/lib/kit/datecalc";
import { fitScale } from "@/lib/kit/grid";
import {
  fontSizeFor,
  OUTPUT_TYPES,
  outputType,
  stampGrid,
  watermarkLabel,
} from "@/lib/kit/watermark";
import { Check, ErrorText, Field, kit, Panel, Range, TextInput } from "../ui";
import styles from "./watermark.module.scss";

type Item = { id: string; file: File; url: string };
type Options = {
  text: string;
  sizePct: number;
  color: string;
  opacity: number;
  angle: number;
  density: number;
  withDate: boolean;
};

const MAX_FILES = 20;
const PREVIEW_SIDE = 1200;
const EXPORT_MAX_SIDE = 8192;
const COLORS = [
  { value: "#1a1a1a", label: "深色" },
  { value: "#ffffff", label: "白色" },
  { value: "#e5484d", label: "红色" },
];

let nextId = 0;

/** Decodes with EXIF orientation (phone photos stay upright) and draws onto a canvas capped at `maxSide`. */
async function drawToCanvas(
  file: File,
  maxSide: number,
  fill?: string,
): Promise<HTMLCanvasElement> {
  let source: { image: CanvasImageSource; width: number; height: number; release: () => void };
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = {
      image: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.src = url;
    await element.decode().catch((reason) => {
      URL.revokeObjectURL(url);
      throw reason;
    });
    const release = () => URL.revokeObjectURL(url);
    source = {
      image: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
      release,
    };
  }
  const { image, width, height, release } = source;
  const scale = fitScale(width, height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  if (fill) {
    context.fillStyle = fill;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  release();
  return canvas;
}

function drawWatermark(context: CanvasRenderingContext2D, options: Options) {
  const { width, height } = context.canvas;
  const label = watermarkLabel(
    options.text,
    options.withDate ? formatYmd(beijingToday()) : undefined,
  );
  if (!label) return;
  const fontSize = fontSizeFor(width, height, options.sizePct);
  context.save();
  context.font = `600 ${fontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`;
  context.fillStyle = options.color;
  context.globalAlpha = options.opacity / 100;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const textWidth = context.measureText(label).width;
  const { stepX, stepY, halfCols, halfRows } = stampGrid(
    width,
    height,
    fontSize,
    textWidth,
    options.density,
  );
  context.translate(width / 2, height / 2);
  context.rotate((options.angle * Math.PI) / 180);
  for (let row = -halfRows; row <= halfRows; row++) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    for (let col = -halfCols; col <= halfCols; col++) {
      context.fillText(label, col * stepX + offset, row * stepY);
    }
  }
  context.restore();
}

async function renderFull(file: File, options: Options): Promise<{ blob: Blob; name: string }> {
  const type = outputType(file.type);
  const canvas = await drawToCanvas(
    file,
    EXPORT_MAX_SIDE,
    type === "image/jpeg" ? "#ffffff" : undefined,
  );
  try {
    const context = canvas.getContext("2d");
    if (context) drawWatermark(context, options);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("toBlob"))),
        type,
        0.92,
      ),
    );
    return { blob, name: `${baseName(file.name)}-水印.${OUTPUT_TYPES[blob.type] ?? "png"}` };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

export default function WatermarkTool() {
  const colorId = useId();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [options, setOptions] = useState<Options>({
    text: "仅供办理业务使用，他用无效",
    sizePct: 4,
    color: "#1a1a1a",
    opacity: 35,
    angle: -30,
    density: 5,
    withDate: false,
  });
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<string>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<Item[]>([]);
  const selected = items.find((item) => item.id === selectedId);
  const set =
    <K extends keyof Options>(key: K) =>
    (value: Options[K]) =>
      setOptions((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(
    () => () => {
      for (const item of itemsRef.current) URL.revokeObjectURL(item.url);
    },
    [],
  );

  useEffect(() => {
    if (!selected) {
      setBase(null);
      return;
    }
    let cancelled = false;
    drawToCanvas(selected.file, PREVIEW_SIDE)
      .then((canvas) => {
        if (!cancelled) setBase(canvas);
      })
      .catch(() => {
        if (cancelled) return;
        setBase(null);
        setError(`“${selected.file.name}”读取失败，可能格式不支持（HEIC 请先转成 JPG）。`);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !base) return;
    canvas.width = base.width;
    canvas.height = base.height;
    context.drawImage(base, 0, 0);
    drawWatermark(context, options);
  }, [base, options]);

  const addFiles = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    const accepted = images.slice(0, Math.max(0, MAX_FILES - items.length));
    const skipped = files.length - accepted.length;
    setError(
      skipped > 0
        ? `最多 ${MAX_FILES} 张图片，有 ${skipped} 个文件没有加入（非图片或超出数量）。`
        : undefined,
    );
    if (accepted.length === 0) return;
    const added = accepted.map((file) => ({
      id: String(nextId++),
      file,
      url: URL.createObjectURL(file),
    }));
    setItems((previous) => [...previous, ...added]);
    if (!selected) setSelectedId(added[0].id);
  };

  const removeSelected = () => {
    if (!selected) return;
    URL.revokeObjectURL(selected.url);
    const rest = items.filter((item) => item.id !== selected.id);
    setItems(rest);
    setSelectedId(rest[0]?.id);
  };

  /** One image at a time, so only a single full-size canvas is alive at once. */
  const exportImages = async (list: Item[], zip: boolean) => {
    const files: { name: string; data: Uint8Array }[] = [];
    try {
      for (const [index, item] of list.entries()) {
        setProgress(zip ? `正在处理 ${index + 1}/${list.length}` : "正在生成…");
        const { blob, name } = await renderFull(item.file, options);
        if (!zip) return downloadBlob(blob, name);
        files.push({ name, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      setProgress("正在打包…");
      downloadBlob(zipFiles(files), "水印图片.zip");
    } catch {
      setError("有图片处理失败了，可能图片太大或格式不支持，可以先移除它再试。");
    } finally {
      setProgress(undefined);
    }
  };

  if (items.length === 0) {
    return (
      <div className={kit.stack}>
        <FileDrop
          accept="image/*"
          multiple
          title="选择或拖入图片（最多 20 张）"
          hint="图片只在你的浏览器里处理，不会上传"
          onFiles={addFiles}
        />
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    );
  }

  const busy = Boolean(progress);

  return (
    <div className={kit.grid2}>
      <Panel
        title="预览"
        actions={<span className={kit.hint}>{`${items.length}/${MAX_FILES} 张`}</span>}
      >
        {base ? (
          <canvas ref={canvasRef} className={styles.canvas} aria-label="加水印后的预览" />
        ) : (
          <p className={kit.empty}>正在读取图片…</p>
        )}
        <div className={styles.thumbs}>
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={styles.thumb}
              aria-pressed={item.id === selectedId}
              aria-label={`预览第 ${index + 1} 张：${item.file.name}`}
              onClick={() => setSelectedId(item.id)}
            >
              <img src={item.url} alt="" />
            </button>
          ))}
        </div>
        {items.length < MAX_FILES && (
          <FileDrop
            accept="image/*"
            multiple
            title="继续添加图片"
            hint="可以一次选多张"
            onFiles={addFiles}
          />
        )}
        <p className={kit.hint}>图片只在你的浏览器里处理，不会上传。</p>
      </Panel>

      <Panel title="水印设置">
        <TextInput label="水印文字" value={options.text} onChange={set("text")} maxLength={60} />
        <Check label="添加日期（北京时间）" checked={options.withDate} onChange={set("withDate")} />
        <Range
          label="字号（图片短边的百分比）"
          value={options.sizePct}
          onChange={set("sizePct")}
          min={2}
          max={12}
          step={0.5}
          suffix="%"
        />
        <div className={kit.grid2}>
          <Field label="颜色" htmlFor={colorId}>
            <input
              id={colorId}
              type="color"
              className={styles.color}
              value={options.color}
              onChange={(event) => set("color")(event.target.value)}
            />
          </Field>
          <Field label="常用颜色">
            <div className={kit.row}>
              {COLORS.map((color) => (
                <Button
                  key={color.value}
                  size="s"
                  variant={options.color === color.value ? "primary" : "secondary"}
                  onClick={() => set("color")(color.value)}
                >
                  {color.label}
                </Button>
              ))}
            </div>
          </Field>
        </div>
        <Range
          label="透明度"
          value={options.opacity}
          onChange={set("opacity")}
          min={5}
          max={100}
          suffix="%"
        />
        <Range
          label="角度"
          value={options.angle}
          onChange={set("angle")}
          min={-90}
          max={90}
          suffix="°"
        />
        <Range
          label="密度（左稀疏，右密集）"
          value={options.density}
          onChange={set("density")}
          min={1}
          max={10}
        />
        <div className={kit.row}>
          <Button
            variant="primary"
            prefixIcon="download"
            onClick={() => selected && exportImages([selected], false)}
            disabled={!selected || busy}
          >
            下载当前
          </Button>
          <Button
            variant="secondary"
            prefixIcon="download"
            onClick={() => exportImages(items, true)}
            disabled={busy}
          >
            全部打包下载
          </Button>
          <Button
            variant="tertiary"
            prefixIcon="trash"
            onClick={removeSelected}
            disabled={!selected || busy}
          >
            移除当前
          </Button>
        </div>
        {progress && (
          <p className={kit.hint} aria-live="polite">
            {progress}
          </p>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <p className={kit.hint}>
          导出保持原图尺寸（超过 8192 像素会缩小）和格式，JPG、PNG、WebP 以外的格式导出为 PNG。
        </p>
      </Panel>
    </div>
  );
}
