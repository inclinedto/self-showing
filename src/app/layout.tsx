import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "./globals.scss";

import classNames from "classnames";
import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/shell/Footer";
import { Header } from "@/components/shell/Header";
import { Providers } from "@/components/shell/Providers";
import { site } from "@/resources/site";
import { monoFont, sansFont, THEME_STORAGE_KEY, theme } from "@/resources/theme";

export const metadata: Metadata = {
  metadataBase: new URL(site.baseURL),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: site.name,
    title: site.title,
    description: site.description,
    images: [`/api/og/generate?title=${encodeURIComponent(site.name)}`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

// Runs before first paint so the saved or system theme never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(!t||t==="system"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})();`;

const themeAttributes = Object.fromEntries(
  Object.entries(theme).map(([key, value]) => [`data-${key}`, value]),
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={classNames(sansFont.variable, monoFont.variable)}
      data-theme="light"
      {...themeAttributes}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static inline script, no user input. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <a href="#main" className="skip-link">
            跳到正文
          </a>
          <Header />
          <main id="main" className="site-main">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
