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
  const subtitle = site.description;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: "6rem",
        background: "#151515",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "3rem",
          color: "white",
        }}
      >
        <span
          style={{
            fontSize: "6rem",
            lineHeight: "8rem",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: "2.5rem", lineHeight: "3.5rem", opacity: 0.6 }}>{subtitle}</span>
        <span style={{ fontSize: "2rem", opacity: 0.4 }}>
          {site.baseURL.replace("https://", "")}
        </span>
      </div>
    </div>,
    {
      width: 1280,
      height: 720,
      fonts: [
        {
          name: "Noto Sans SC",
          data: await loadGoogleFont("Noto+Sans+SC:wght@500", `${title}${subtitle}${site.baseURL}`),
          style: "normal",
        },
      ],
    },
  );
}
