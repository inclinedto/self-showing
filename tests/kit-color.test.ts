import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blend,
  colorScale,
  contrastRatio,
  formatCmyk,
  formatHsl,
  formatHsv,
  formatRatio,
  formatRgb,
  hslToRgb,
  parseColor,
  type Rgba,
  readableOn,
  rgbToHsl,
  toHex,
  toHex6,
  wcagLevels,
} from "../src/lib/kit/color.ts";

const rgba = (r: number, g: number, b: number, a = 1): Rgba => ({ r, g, b, a });

test("parses hex in every length", () => {
  assert.deepEqual(parseColor("#049EE2"), rgba(4, 158, 226));
  assert.deepEqual(parseColor("049ee2"), rgba(4, 158, 226));
  assert.deepEqual(parseColor("#fff"), rgba(255, 255, 255));
  assert.deepEqual(parseColor("#f008"), rgba(255, 0, 0, 0.533));
  assert.deepEqual(parseColor("#FF000080"), rgba(255, 0, 0, 0.502));
  assert.deepEqual(parseColor("#ff00"), rgba(255, 255, 0, 0));
  assert.equal(parseColor("#12345"), null);
  assert.equal(parseColor("#ggg"), null);
});

test("parses rgb()/rgba() with comma and space syntax", () => {
  assert.deepEqual(parseColor("rgb(4, 158, 226)"), rgba(4, 158, 226));
  assert.deepEqual(parseColor("rgb(4 158 226)"), rgba(4, 158, 226));
  assert.deepEqual(parseColor("RGBA(4,158,226,0.5)"), rgba(4, 158, 226, 0.5));
  assert.deepEqual(parseColor("rgb(4 158 226 / 50%)"), rgba(4, 158, 226, 0.5));
  assert.deepEqual(parseColor("rgba(100%, 0%, 50%, .25)"), rgba(255, 0, 128, 0.25));
  assert.deepEqual(parseColor("rgb(300, -5, 10);"), rgba(255, 0, 10));
  assert.equal(parseColor("rgb(1, 2)"), null);
  assert.equal(parseColor("rgb(1, 2, x)"), null);
  assert.equal(parseColor("rgb(1 2 3 / 4 / 5)"), null);
});

test("parses hsl()/hsla() and names", () => {
  assert.deepEqual(parseColor("hsl(0, 100%, 50%)"), rgba(255, 0, 0));
  assert.deepEqual(parseColor("hsl(120deg 100% 25%)"), rgba(0, 128, 0));
  assert.deepEqual(parseColor("hsla(240, 100%, 50%, 0.3)"), rgba(0, 0, 255, 0.3));
  assert.deepEqual(parseColor("hsl(0.5turn 100% 50% / 20%)"), rgba(0, 255, 255, 0.2));
  assert.deepEqual(parseColor("hsl(-120, 100%, 50%)"), rgba(0, 0, 255));
  assert.deepEqual(parseColor("orange"), rgba(255, 165, 0));
  assert.deepEqual(parseColor(" Gray "), rgba(128, 128, 128));
  assert.deepEqual(parseColor("粉色"), rgba(255, 192, 203));
  assert.deepEqual(parseColor("紫"), rgba(128, 0, 128));
  assert.equal(parseColor("summer"), null);
  assert.equal(parseColor(""), null);
});

test("converts to every output format", () => {
  const sea = rgba(4, 158, 226);
  assert.equal(toHex(sea), "#049EE2");
  assert.equal(toHex(sea, false), "#049ee2");
  assert.equal(toHex(rgba(255, 0, 0, 0.5)), "#FF000080");
  assert.equal(toHex6(rgba(255, 0, 0, 0.5)), "#ff0000");
  assert.equal(formatRgb(sea), "rgb(4, 158, 226)");
  assert.equal(formatRgb(rgba(4, 158, 226, 0.5)), "rgba(4, 158, 226, 0.5)");
  assert.equal(formatHsl(sea), "hsl(198, 97%, 45%)");
  assert.equal(formatHsl(rgba(255, 0, 0, 0.5)), "hsla(0, 100%, 50%, 0.5)");
  assert.equal(formatHsv(sea), "hsv(198, 98%, 89%)");
  assert.equal(formatHsv(rgba(0, 0, 0)), "hsv(0, 0%, 0%)");
  assert.equal(formatCmyk(sea), "cmyk(98%, 30%, 0%, 11%)");
  assert.equal(formatCmyk(rgba(0, 0, 0)), "cmyk(0%, 0%, 0%, 100%)");
  assert.equal(formatCmyk(rgba(255, 255, 255)), "cmyk(0%, 0%, 0%, 0%)");
});

test("hsl round-trips", () => {
  for (let r = 0; r <= 255; r += 51) {
    for (let g = 0; g <= 255; g += 51) {
      for (let b = 0; b <= 255; b += 51) {
        const { h, s, l } = rgbToHsl(rgba(r, g, b));
        assert.deepEqual(hslToRgb(h, s, l), { r, g, b });
      }
    }
  }
});

test("WCAG contrast ratio", () => {
  const white = rgba(255, 255, 255);
  const black = rgba(0, 0, 0);
  assert.equal(formatRatio(contrastRatio(black, white)), "21.00:1");
  assert.equal(formatRatio(contrastRatio(white, white)), "1.00:1");
  assert.equal(contrastRatio(white, black), contrastRatio(black, white));
  assert.equal(formatRatio(contrastRatio(rgba(0x76, 0x76, 0x76), white)), "4.54:1");
  assert.deepEqual(wcagLevels(contrastRatio(rgba(0x76, 0x76, 0x76), white)), {
    aa: true,
    aaLarge: true,
    aaa: false,
  });
  assert.deepEqual(wcagLevels(contrastRatio(rgba(0x77, 0x77, 0x77), white)), {
    aa: false,
    aaLarge: true,
    aaa: false,
  });
  assert.equal(formatRatio(4.4999), "4.49:1");
  // Half-transparent black over white behaves like mid grey.
  assert.deepEqual(blend(rgba(0, 0, 0, 0.5), white), rgba(128, 128, 128));
  assert.equal(contrastRatio(rgba(0, 0, 0, 0.5), white), contrastRatio(rgba(128, 128, 128), white));
});

test("readable text colour and colour scale", () => {
  assert.equal(readableOn(rgba(255, 255, 255)), "#000000");
  assert.equal(readableOn(rgba(0, 0, 0)), "#FFFFFF");
  assert.equal(readableOn(rgba(0xf2, 0xd7, 0xa6)), "#000000");
  const scale = colorScale(rgba(4, 158, 226));
  assert.equal(scale.length, 11);
  assert.equal(scale[5].hex, "#049EE2");
  assert.equal(scale[0].step, 50);
  assert.equal(scale[10].step, 950);
  const lightness = scale.map((item) => rgbToHsl(parseColor(item.hex) as Rgba).l);
  for (let i = 1; i < lightness.length; i += 1)
    assert.ok(lightness[i] < lightness[i - 1], String(lightness));
  for (const item of scale)
    assert.ok(contrastRatio(parseColor(item.text) as Rgba, parseColor(item.hex) as Rgba) >= 4.5);
});
