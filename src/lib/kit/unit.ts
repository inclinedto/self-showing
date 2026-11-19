/** Unit tables and conversions for the 单位换算 tool. Factors convert one unit into the category's base unit. */

export type UnitCategory = "length" | "mass" | "area" | "volume" | "temperature" | "data" | "speed";

export type Unit = { id: string; label: string; factor: number };

export const CATEGORIES: { id: UnitCategory; label: string; base: string }[] = [
  { id: "length", label: "长度", base: "m" },
  { id: "mass", label: "重量", base: "kg" },
  { id: "area", label: "面积", base: "m2" },
  { id: "volume", label: "体积", base: "l" },
  { id: "temperature", label: "温度", base: "c" },
  { id: "data", label: "存储", base: "gb" },
  { id: "speed", label: "速度", base: "kmh" },
];

const STATIC_UNITS: Record<Exclude<UnitCategory, "data">, Unit[]> = {
  length: [
    { id: "mm", label: "毫米", factor: 0.001 },
    { id: "cm", label: "厘米", factor: 0.01 },
    { id: "dm", label: "分米", factor: 0.1 },
    { id: "m", label: "米", factor: 1 },
    { id: "km", label: "千米（公里）", factor: 1000 },
    { id: "in", label: "英寸", factor: 0.0254 },
    { id: "ft", label: "英尺", factor: 0.3048 },
    { id: "yd", label: "码", factor: 0.9144 },
    { id: "mi", label: "英里", factor: 1609.344 },
    { id: "nmi", label: "海里", factor: 1852 },
    { id: "zhang", label: "丈", factor: 10 / 3 },
    { id: "chi", label: "市尺", factor: 1 / 3 },
    { id: "cun", label: "市寸", factor: 1 / 30 },
    { id: "li", label: "市里", factor: 500 },
  ],
  mass: [
    { id: "mg", label: "毫克", factor: 1e-6 },
    { id: "g", label: "克", factor: 0.001 },
    { id: "kg", label: "千克（公斤）", factor: 1 },
    { id: "t", label: "吨", factor: 1000 },
    { id: "jin", label: "斤", factor: 0.5 },
    { id: "liang", label: "两", factor: 0.05 },
    { id: "qian", label: "钱", factor: 0.005 },
    { id: "lb", label: "磅", factor: 0.45359237 },
    { id: "oz", label: "盎司", factor: 0.028349523125 },
    { id: "ct", label: "克拉", factor: 0.0002 },
  ],
  area: [
    { id: "cm2", label: "平方厘米", factor: 1e-4 },
    { id: "m2", label: "平方米", factor: 1 },
    { id: "ha", label: "公顷", factor: 1e4 },
    { id: "km2", label: "平方千米", factor: 1e6 },
    { id: "mu", label: "亩", factor: 10000 / 15 },
    { id: "ft2", label: "平方英尺", factor: 0.09290304 },
    { id: "in2", label: "平方英寸", factor: 0.00064516 },
    { id: "acre", label: "英亩", factor: 4046.8564224 },
  ],
  volume: [
    { id: "ml", label: "毫升", factor: 0.001 },
    { id: "l", label: "升", factor: 1 },
    { id: "cm3", label: "立方厘米", factor: 0.001 },
    { id: "m3", label: "立方米", factor: 1000 },
    { id: "usgal", label: "美制加仑", factor: 3.785411784 },
    { id: "ukgal", label: "英制加仑", factor: 4.54609 },
    { id: "usfloz", label: "美制液量盎司", factor: 0.0295735295625 },
    { id: "cup", label: "杯（公制 250 毫升）", factor: 0.25 },
  ],
  temperature: [
    { id: "c", label: "摄氏度 ℃", factor: 1 },
    { id: "f", label: "华氏度 ℉", factor: 1 },
    { id: "k", label: "开尔文 K", factor: 1 },
  ],
  speed: [
    { id: "ms", label: "米/秒", factor: 1 },
    { id: "kmh", label: "千米/时", factor: 1 / 3.6 },
    { id: "mph", label: "英里/时", factor: 0.44704 },
    { id: "kn", label: "节", factor: 1852 / 3600 },
    { id: "mach", label: "马赫（约）", factor: 340.3 },
  ],
};

export function getUnits(category: UnitCategory, binary = true): Unit[] {
  if (category !== "data") return STATIC_UNITS[category];
  const k = binary ? 1024 : 1000;
  return [
    { id: "bit", label: "比特 b", factor: 1 / 8 },
    { id: "b", label: "字节 B", factor: 1 },
    { id: "kb", label: "KB", factor: k },
    { id: "mb", label: "MB", factor: k ** 2 },
    { id: "gb", label: "GB", factor: k ** 3 },
    { id: "tb", label: "TB", factor: k ** 4 },
    { id: "pb", label: "PB", factor: k ** 5 },
  ];
}

/** Temperatures are affine, so they go through Kelvin instead of a single factor. */
function toKelvin(value: number, unit: string): number {
  if (unit === "f") return ((value - 32) * 5) / 9 + 273.15;
  if (unit === "k") return value;
  return value + 273.15;
}

function fromKelvin(kelvin: number, unit: string): number {
  if (unit === "f") return ((kelvin - 273.15) * 9) / 5 + 32;
  if (unit === "k") return kelvin;
  return kelvin - 273.15;
}

export function convert(
  value: number,
  from: string,
  to: string,
  category: UnitCategory,
  binary = true,
): number {
  if (category === "temperature") return fromKelvin(toKelvin(value, from), to);
  const units = getUnits(category, binary);
  const source = units.find((unit) => unit.id === from);
  const target = units.find((unit) => unit.id === to);
  if (!source || !target) return Number.NaN;
  return (value * source.factor) / target.factor;
}

export function isBelowAbsoluteZero(value: number, unit: string): boolean {
  return toKelvin(value, unit) < -1e-9;
}

/** Accepts "1,234.5", " 12 ", "1e3" and full-width digits; returns null for anything else. */
export function parseNumber(text: string): number | null {
  const cleaned = text
    .replace(/[\uFF10-\uFF19]/g, (char) => String(char.charCodeAt(0) - 0xff10))
    .replace(/[．。]/g, ".")
    .replace(/[－—]/g, "-")
    .replace(/[,，\s]/g, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Up to 10 significant digits, plain notation for everyday magnitudes. */
export function formatNumber(value: number, grouping = false): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toPrecision(10));
  if (rounded === 0) return "0";
  const magnitude = Math.abs(rounded);
  if (magnitude >= 1e21 || magnitude < 1e-9) {
    return rounded.toExponential(9).replace(/\.?0+e/, "e");
  }
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 10,
    useGrouping: grouping,
  }).format(rounded);
}
