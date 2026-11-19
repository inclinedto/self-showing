/** Layout maths for tiled text watermarks. */

export const OUTPUT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Keep JPEG/PNG/WebP as they are; anything else (GIF, BMP, HEIC…) becomes PNG. */
export function outputType(sourceType: string): string {
  return OUTPUT_TYPES[sourceType] ? sourceType : "image/png";
}

export function watermarkLabel(text: string, date?: string): string {
  return [text.trim(), date ?? ""].filter(Boolean).join(" ");
}

/** Font size as a percentage of the shorter side, so small and large photos look the same. */
export function fontSizeFor(width: number, height: number, percent: number): number {
  return Math.max(8, (Math.min(width, height) * percent) / 100);
}

export type StampGrid = { stepX: number; stepY: number; halfCols: number; halfRows: number };

/**
 * Spacing for a grid drawn around the image centre. It spans the diagonal in both directions,
 * so after any rotation the corners are still covered. Density 1 (sparse) … 10 (dense).
 */
export function stampGrid(
  width: number,
  height: number,
  fontSize: number,
  textWidth: number,
  density: number,
  maxStamps = 5000,
): StampGrid {
  const gap = fontSize * (0.6 + (10 - density) * 0.6);
  let stepX = textWidth + gap * 1.5;
  let stepY = fontSize + gap;
  const diagonal = Math.hypot(width, height);
  const count = (diagonal / stepX + 3) * (diagonal / stepY + 3);
  if (count > maxStamps) {
    const grow = Math.sqrt(count / maxStamps);
    stepX *= grow;
    stepY *= grow;
  }
  return {
    stepX,
    stepY,
    halfCols: Math.ceil(diagonal / 2 / stepX) + 1,
    halfRows: Math.ceil(diagonal / 2 / stepY) + 1,
  };
}
