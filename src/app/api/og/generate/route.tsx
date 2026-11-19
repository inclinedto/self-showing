import { ImageResponse } from "next/og";
import { site } from "@/resources/site";

export const runtime = "nodejs";

async function loadGoogleFont(family: string, text: string) {
  // `text=` asks Google Fonts for a subset with only these glyphs, which keeps CJK fonts small.
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);

  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }

  throw new Error("failed to load font data");
}

function svg(markup: string, viewBox: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${markup}</svg>`)}`;
}

const SUN = svg(
  [
    ...Array.from(
      { length: 12 },
      (_, index) =>
        `<rect x="94" y="4" width="12" height="30" rx="6" fill="#ffc24a" transform="rotate(${index * 30} 100 100)"/>`,
    ),
    `<circle cx="100" cy="100" r="60" fill="#ffd34f"/>`,
    `<path d="M58 82 A 46 46 0 0 1 98 50" fill="none" stroke="#fff1b0" stroke-width="8" stroke-linecap="round"/>`,
    `<ellipse cx="80" cy="98" rx="5.5" ry="7.5" fill="#5b3416"/><ellipse cx="120" cy="98" rx="5.5" ry="7.5" fill="#5b3416"/>`,
    `<circle cx="82" cy="95" r="2" fill="#fff"/><circle cx="122" cy="95" r="2" fill="#fff"/>`,
    `<path d="M89 115 Q 100 126 111 115" fill="none" stroke="#5b3416" stroke-width="5" stroke-linecap="round"/>`,
    `<ellipse cx="68" cy="114" rx="9" ry="5.5" fill="#ff8d7a" opacity="0.6"/><ellipse cx="132" cy="114" rx="9" ry="5.5" fill="#ff8d7a" opacity="0.6"/>`,
  ].join(""),
  "0 0 200 200",
);

function wavePath(y: number, amp: number, period: number) {
  let d = `M0 ${y} Q ${period / 4} ${y - amp} ${period / 2} ${y}`;
  for (let x = period / 2; x < 1280; x += period / 2) d += ` T ${x + period / 2} ${y}`;
  return `${d} V180 H0 Z`;
}

const SEA = svg(
  [
    `<path d="${wavePath(40, 16, 320)}" fill="#7fd6f5" opacity="0.55"/>`,
    `<path d="${wavePath(70, 14, 260)}" fill="#2bb0e6" opacity="0.75"/>`,
    `<path d="${wavePath(104, 12, 220)}" fill="#0a8fcf"/>`,
  ].join(""),
  "0 0 1280 180",
);

const LEAF = "M0 0 C 26 -26 78 -30 116 4 C 92 -4 70 -6 52 -2 C 34 2 16 4 0 0 Z";
const PALM = svg(
  [
    `<ellipse cx="120" cy="250" rx="130" ry="36" fill="#ffe2a6"/>`,
    `<path d="M112 246 C 116 190 128 140 150 92" fill="none" stroke="#b9773f" stroke-width="16" stroke-linecap="round"/>`,
    ...[
      [-58, 0.86, "#3fbf7f"],
      [-22, 1, "#24a066"],
      [14, 0.92, "#3fbf7f"],
      [44, 0.7, "#24a066"],
    ].flatMap(([angle, scale, fill]) => [
      `<path d="${LEAF}" fill="${fill}" transform="translate(150 92) rotate(${angle}) scale(${scale})"/>`,
      `<path d="${LEAF}" fill="${fill}" transform="translate(150 92) scale(-1 1) rotate(${angle}) scale(${scale})"/>`,
    ]),
    `<circle cx="142" cy="100" r="9" fill="#7a4a24"/><circle cx="158" cy="102" r="8" fill="#8b5a2e"/>`,
  ].join(""),
  "0 0 280 290",
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("title") || site.name).slice(0, 60);
  const quote = site.quote.text;
  const host = site.baseURL.replace("https://", "");

  const [cute, display] = await Promise.all([
    loadGoogleFont("ZCOOL+KuaiLe", `${title}${site.tagline}`),
    loadGoogleFont("Fredoka:wght@600", `${quote}— ${site.quote.source}${host}`),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        padding: "80px 96px",
        background: "linear-gradient(180deg, #bfeeff 0%, #e6f8ff 50%, #fff6df 100%)",
        color: "#0b3b4f",
      }}
    >
      <img src={SUN} width={250} height={250} alt="" style={{ position: "absolute", top: 40, right: 110 }} />
      <img src={SEA} width={1280} height={180} alt="" style={{ position: "absolute", left: 0, bottom: 0 }} />
      <img src={PALM} width={280} height={290} alt="" style={{ position: "absolute", right: 30, bottom: 40 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 820 }}>
        <span style={{ fontFamily: "ZCOOL KuaiLe", fontSize: 112, letterSpacing: "0.04em", color: "#0279be" }}>{title}</span>
        <span style={{ fontFamily: "Fredoka", fontSize: 54, lineHeight: 1.15 }}>{quote}</span>
        <span style={{ fontFamily: "ZCOOL KuaiLe", fontSize: 36, color: "#3e5866" }}>{site.tagline}</span>
        <span style={{ fontFamily: "Fredoka", fontSize: 28, color: "#5c7d8c" }}>{host}</span>
      </div>
    </div>,
    {
      width: 1280,
      height: 720,
      fonts: [
        { name: "ZCOOL KuaiLe", data: cute, style: "normal" },
        { name: "Fredoka", data: display, style: "normal", weight: 600 },
      ],
    },
  );
}
