import assert from "node:assert/strict";
import { test } from "node:test";
import { fitScale, planTiles } from "../src/lib/kit/grid.ts";

test("3×3 square crop takes the centred square", () => {
  const plan = planTiles(4000, 3000, "3x3", "square");
  assert.equal(plan.tiles.length, 9);
  assert.equal(plan.tileWidth, 1000);
  assert.equal(plan.tileHeight, 1000);
  assert.deepEqual(plan.tiles[0], { index: 1, x: 500, y: 0, width: 1000, height: 1000 });
  assert.deepEqual(plan.tiles[8], { index: 9, x: 2500, y: 2000, width: 1000, height: 1000 });
});

test("3×1 square crop is a 3:1 strip of square tiles", () => {
  const plan = planTiles(3000, 2000, "3x1", "square");
  assert.equal(plan.tiles.length, 3);
  assert.equal(plan.tileWidth, 1000);
  assert.equal(plan.tileHeight, 1000);
  assert.equal(plan.tiles[0].y, 500);
  const tall = planTiles(1000, 4000, "1x3", "square");
  assert.equal(tall.tileWidth, 1000);
  assert.equal(tall.tiles[2].y, 500 + 2000);
});

test("keep mode splits the whole image", () => {
  const plan = planTiles(1001, 600, "2x2", "keep");
  assert.equal(plan.tileWidth, 500);
  assert.equal(plan.tileHeight, 300);
  assert.equal(plan.tiles[1].x, 500);
  assert.equal(plan.tiles[3].y, 300);
});

test("tiny images still produce valid tiles", () => {
  const plan = planTiles(2, 2, "3x3", "square");
  assert.ok(plan.tiles.every((tile) => tile.width >= 1 && tile.height >= 1));
});

test("fitScale caps the longest side", () => {
  assert.equal(fitScale(8192, 4096, 4096), 0.5);
  assert.equal(fitScale(1000, 800, 4096), 1);
});
