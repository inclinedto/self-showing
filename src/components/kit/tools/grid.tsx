"use client";

import { Button, SegmentedControl } from "@once-ui-system/core";
import { useEffect, useState } from "react";
import { FileDrop } from "@/components/FileDrop";
import { baseName, downloadBlob, zipFiles } from "@/lib/files";
import { type CropMode, fitScale, type GridLayout, LAYOUTS, planTiles } from "@/lib/kit/grid";
import { ErrorText, kit, Panel, Range, Select } from "../ui";
import styles from "./grid.module.scss";

type Format = "jpg" | "png";
type Source = {
  canvas: HTMLCanvasElement;
  name: string;
  originalWidth: number;
  originalHeight: number;
};
type TileImage = { index: number; blob: Blob; url: string };
type TileSet = { tiles: TileImage[]; cols: number; tileWidth: number; tileHeight: number };

const MAX_SIDE = 4096;

/** Decodes with EXIF orientation applied (phone photos stay upright), falling back to <img>. */
async function decodeImage(file: File) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      image: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("decode");
    }
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  }
}

async function loadSource(file: File): Promise<Source> {
  const decoded = await decodeImage(file);
  const scale = fitScale(decoded.width, decoded.height, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
  decoded.release();
  return { canvas, name: file.name, originalWidth: decoded.width, originalHeight: decoded.height };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), type, quality),
  );
}

const pad = (index: number) => String(index).padStart(2, "0");

export default function GridTool() {
  const [source, setSource] = useState<Source | null>(null);
  const [layout, setLayout] = useState<GridLayout>("3x3");
  const [crop, setCrop] = useState<CropMode>("square");
  const [gap, setGap] = useState(4);
  const [format, setFormat] = useState<Format>("jpg");
  const [result, setResult] = useState<TileSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const urls: string[] = [];
    setBusy(true);
    (async () => {
      const plan = planTiles(source.canvas.width, source.canvas.height, layout, crop);
      const canvas = document.createElement("canvas");
      canvas.width = plan.tileWidth;
      canvas.height = plan.tileHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      const tiles: TileImage[] = [];
      for (const tile of plan.tiles) {
        if (cancelled) return;
        if (format === "jpg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        } else {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(
          source.canvas,
          tile.x,
          tile.y,
          tile.width,
          tile.height,
          0,
          0,
          tile.width,
          tile.height,
        );
        const blob = await canvasToBlob(
          canvas,
          format === "jpg" ? "image/jpeg" : "image/png",
          0.92,
        );
        const url = URL.createObjectURL(blob);
        urls.push(url);
        tiles.push({ index: tile.index, blob, url });
      }
      canvas.width = 0;
      canvas.height = 0;
      if (!cancelled) {
        setResult({
          tiles,
          cols: plan.cols,
          tileWidth: plan.tileWidth,
          tileHeight: plan.tileHeight,
        });
        setError(undefined);
      }
    })()
      .catch(() => {
        if (!cancelled) setError("切图失败了，可能图片太大，换一张试试。");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [source, layout, crop, format]);

  const onFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("请选择图片文件（JPG、PNG、WebP 等）。");
    setError(undefined);
    setBusy(true);
    try {
      setSource(await loadSource(file));
    } catch {
      setBusy(false);
      setError("无法读取这张图片，可能格式不支持（HEIC 请先转成 JPG）或文件已损坏。");
    }
  };

  const extension = format === "jpg" ? "jpg" : "png";
  const layoutName = LAYOUTS.find((item) => item.value === layout)?.label.split(" ")[0] ?? "切图";
  const base = source ? baseName(source.name) : "image";

  const downloadAll = async () => {
    if (!result) return;
    setZipping(true);
    try {
      const files = await Promise.all(
        result.tiles.map(async (tile) => ({
          name: `${pad(tile.index)}.${extension}`,
          data: new Uint8Array(await tile.blob.arrayBuffer()),
        })),
      );
      downloadBlob(zipFiles(files), `${base}-${layoutName}.zip`);
    } catch {
      setError("打包失败了，可以点单张图片逐个下载。");
    } finally {
      setZipping(false);
    }
  };

  if (!source) {
    return (
      <div className={kit.stack}>
        <FileDrop
          accept="image/*"
          title="选择或拖入一张图片"
          hint="图片只在你的浏览器里处理，不会上传"
          onFiles={onFiles}
          disabled={busy}
        />
        {error && <ErrorText>{error}</ErrorText>}
      </div>
    );
  }

  const cols = result?.cols ?? 3;
  const scaled = source.originalWidth !== source.canvas.width;

  return (
    <div className={kit.grid2}>
      <Panel title="切图设置">
        <SegmentedControl
          selected={layout}
          onToggle={(value) => setLayout(value as GridLayout)}
          buttons={LAYOUTS.map((item) => ({ value: item.value, label: item.label }))}
        />
        <div className={kit.grid2}>
          <Select
            label="裁剪方式"
            value={crop}
            onChange={setCrop}
            options={[
              { value: "square", label: "居中裁成正方形" },
              { value: "keep", label: "保持原图比例" },
            ]}
          />
          <Select
            label="导出格式"
            value={format}
            onChange={setFormat}
            options={[
              { value: "jpg", label: "JPG（体积小）" },
              { value: "png", label: "PNG（无损）" },
            ]}
          />
        </div>
        <Range label="间隔线预览" value={gap} onChange={setGap} min={0} max={16} suffix=" px" />
        <p className={kit.hint}>
          原图 {source.originalWidth} × {source.originalHeight}
          {scaled && `，已缩小到 ${source.canvas.width} × ${source.canvas.height}`}
          {result && `；每张 ${result.tileWidth} × ${result.tileHeight} px`}
          。间隔线只影响预览，不会画进图片。
        </p>
        <div className={kit.row}>
          <Button
            variant="primary"
            prefixIcon="download"
            onClick={downloadAll}
            loading={zipping}
            disabled={!result || busy || zipping}
          >
            下载全部
          </Button>
          <Button
            variant="secondary"
            prefixIcon="refresh"
            onClick={() => {
              setSource(null);
              setResult(null);
            }}
          >
            换一张
          </Button>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </Panel>

      <Panel title={busy ? "正在切图…" : "预览"}>
        {result ? (
          <div
            className={styles.preview}
            style={{
              gap: `${gap}px`,
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              maxWidth: `${Math.min(640, cols * 220)}px`,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {result.tiles.map((tile) => (
              <button
                key={tile.url}
                type="button"
                className={styles.tile}
                aria-label={`下载第 ${tile.index} 张`}
                title="点击下载这一张"
                onClick={() => downloadBlob(tile.blob, `${base}-${pad(tile.index)}.${extension}`)}
              >
                <img src={tile.url} alt={`第 ${tile.index} 张`} />
                <span className={styles.badge}>{tile.index}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className={kit.empty}>正在切图…</p>
        )}
        <p className={kit.hint}>
          按 1→{result?.tiles.length ?? 9} 的顺序发图，拼起来就是完整大图。点任意一张可单独下载。
        </p>
      </Panel>
    </div>
  );
}
