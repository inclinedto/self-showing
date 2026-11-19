/** Helpers for the QR code tool: Wi-Fi payloads, SVG output and pixel-exact PNG layout. */

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export type WifiConfig = {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
};

/** Byte-mode capacity of the largest QR code (version 40) per error-correction level. */
export const MAX_BYTES = { L: 2953, M: 2331, Q: 1663, H: 1273 } as const;

/** Backslash-escapes the characters that are special in the WIFI: format. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** WIFI:T:<type>;S:<ssid>;P:<password>;H:<true|false>;; (P is left out for open networks). */
export function buildWifi({ ssid, password, security, hidden }: WifiConfig): string {
  const pass = security === "nopass" ? "" : `P:${escapeWifi(password)};`;
  return `WIFI:T:${security};S:${escapeWifi(ssid)};${pass}H:${hidden};;`;
}

/** One SVG path covering every dark module, drawn as horizontal runs. */
export function qrPath(data: boolean[][]): string {
  let path = "";
  data.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x += 1;
      path += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  });
  return path;
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** A standalone SVG document for the matrix (which already includes the quiet-zone border). */
export function qrSvg(
  data: boolean[][],
  options: { foreground: string; background: string; size: number },
): string {
  const modules = data.length;
  const fg = escapeAttr(options.foreground);
  const bg = escapeAttr(options.background);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules} ${modules}" width="${options.size}" height="${options.size}" shape-rendering="crispEdges">`,
    `<rect width="${modules}" height="${modules}" fill="${bg}"/>`,
    `<path d="${qrPath(data)}" fill="${fg}"/>`,
    "</svg>",
  ].join("");
}

/** Integer module size (so the PNG stays crisp) and the offset that centres it in a size×size canvas. */
export function pixelLayout(modules: number, size: number): { moduleSize: number; offset: number } {
  const moduleSize = Math.max(1, Math.floor(size / modules));
  return { moduleSize, offset: Math.max(0, Math.floor((size - moduleSize * modules) / 2)) };
}
