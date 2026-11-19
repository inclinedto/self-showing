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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get("title") || site.name).slice(0, 60);
  const quote = site.quote.text;
  const host = site.baseURL.replace("https://", "");

  const [sans, serif] = await Promise.all([
    loadGoogleFont("Noto+Sans+SC:wght@600", `${title}${site.tagline}${host}`),
    loadGoogleFont("Instrument+Serif:ital@1", `${quote}— ${site.quote.source}`),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        height: "100%",
        padding: "88px 96px",
        background: "linear-gradient(180deg, #d9f6ff 0%, #f4fbf7 55%, #fdf3e1 100%)",
        color: "#0b2a3a",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: 40,
          width: 420,
          height: 420,
          borderRadius: 9999,
          background: "radial-gradient(circle at 42% 42%, #fff3c4 0%, #ffc247 36%, rgba(253,122,47,0.5) 60%, rgba(253,122,47,0) 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -40,
          bottom: 0,
          width: 1360,
          height: 120,
          background: "linear-gradient(180deg, rgba(4,158,226,0.10) 0%, rgba(4,158,226,0.28) 100%)",
          borderTopLeftRadius: "50% 60px",
          borderTopRightRadius: "50% 60px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
        <span style={{ fontFamily: "Noto Sans SC", fontSize: 104, letterSpacing: "0.04em" }}>{title}</span>
        <span style={{ fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 58, color: "#d9541b" }}>
          {quote}
        </span>
        <span style={{ fontFamily: "Noto Sans SC", fontSize: 34, color: "#3e5866" }}>{site.tagline}</span>
        <span style={{ fontFamily: "Noto Sans SC", fontSize: 28, color: "#6b8591" }}>{host}</span>
      </div>
    </div>,
    {
      width: 1280,
      height: 720,
      fonts: [
        { name: "Noto Sans SC", data: sans, style: "normal" },
        { name: "Instrument Serif", data: serif, style: "italic" },
      ],
    },
  );
}
