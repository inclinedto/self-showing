import type { Metadata } from "next";

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      images: [`/api/og/generate?title=${encodeURIComponent(title)}`],
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
