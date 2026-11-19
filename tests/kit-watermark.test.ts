import assert from "node:assert/strict";
import { test } from "node:test";
import { fontSizeFor, outputType, stampGrid, watermarkLabel } from "../src/lib/kit/watermark.ts";

test("output keeps common formats and falls back to PNG", () => {
  assert.equal(outputType("image/jpeg"), "image/jpeg");
  assert.equal(outputType("image/webp"), "image/webp");
  assert.equal(outputType("image/gif"), "image/png");
  assert.equal(outputType(""), "image/png");
});

test("label appends the date only when given", () => {
  assert.equal(watermarkLabel(" 仅供办理业务使用 ", "2026-11-19"), "仅供办理业务使用 2026-11-19");
  assert.equal(watermarkLabel("仅供办理业务使用"), "仅供办理业务使用");
  assert.equal(watermarkLabel("  ", "2026-11-19"), "2026-11-19");
  assert.equal(watermarkLabel(""), "");
});

test("font size follows the shorter side with a floor", () => {
  assert.equal(fontSizeFor(4000, 3000, 4), 120);
  assert.equal(fontSizeFor(100, 50, 2), 8);
});

test("the grid covers the rotated image from the centre", () => {
  const width = 4000;
  const height = 3000;
  const grid = stampGrid(width, height, 120, 1500, 5);
  const diagonal = Math.hypot(width, height);
  assert.ok(grid.halfCols * grid.stepX >= diagonal / 2);
  assert.ok(grid.halfRows * grid.stepY >= diagonal / 2);
});

test("denser settings mean smaller steps", () => {
  const sparse = stampGrid(2000, 2000, 60, 600, 1);
  const dense = stampGrid(2000, 2000, 60, 600, 10);
  assert.ok(dense.stepX < sparse.stepX && dense.stepY < sparse.stepY);
});

test("pathological inputs are capped", () => {
  const grid = stampGrid(100, 20000, 8, 8, 10, 5000);
  const stamps = (2 * grid.halfCols + 1) * (2 * grid.halfRows + 1);
  assert.ok(stamps < 6000, String(stamps));
});
