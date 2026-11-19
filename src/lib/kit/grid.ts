/** Geometry for cutting one image into a grid of tiles. */

export type GridLayout = "3x3" | "2x2" | "3x1" | "1x3" | "2x1";
export type CropMode = "square" | "keep";

export const LAYOUTS: { value: GridLayout; label: string; cols: number; rows: number }[] = [
  { value: "3x3", label: "九宫格 3×3", cols: 3, rows: 3 },
  { value: "2x2", label: "四宫格 2×2", cols: 2, rows: 2 },
  { value: "3x1", label: "横向三联 3×1", cols: 3, rows: 1 },
  { value: "1x3", label: "竖向三联 1×3", cols: 1, rows: 3 },
  { value: "2x1", label: "两张 2×1", cols: 2, rows: 1 },
];

export type Tile = { index: number; x: number; y: number; width: number; height: number };

export type TilePlan = {
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  tiles: Tile[];
};

/**
 * "square" crops the centre so every tile is square (the whole crop is cols:rows);
 * "keep" splits the full image and only drops the few remainder pixels.
 * Tiles are numbered left-to-right, top-to-bottom — the order to post them in.
 */
export function planTiles(
  width: number,
  height: number,
  layout: GridLayout,
  mode: CropMode,
): TilePlan {
  const { cols, rows } = LAYOUTS.find((item) => item.value === layout) ?? LAYOUTS[0];
  let tileWidth = Math.floor(width / cols);
  let tileHeight = Math.floor(height / rows);
  if (mode === "square") {
    tileWidth = Math.min(tileWidth, tileHeight);
    tileHeight = tileWidth;
  }
  tileWidth = Math.max(1, tileWidth);
  tileHeight = Math.max(1, tileHeight);
  const offsetX = Math.max(0, Math.floor((width - tileWidth * cols) / 2));
  const offsetY = Math.max(0, Math.floor((height - tileHeight * rows) / 2));
  const tiles: Tile[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        index: row * cols + col + 1,
        x: offsetX + col * tileWidth,
        y: offsetY + row * tileHeight,
        width: tileWidth,
        height: tileHeight,
      });
    }
  }
  return { cols, rows, tileWidth, tileHeight, tiles };
}

/** Scale factor that keeps the longest side within `maxSide`. */
export function fitScale(width: number, height: number, maxSide: number): number {
  return Math.min(1, maxSide / Math.max(width, height, 1));
}
