import type { MetadataRoute } from "next";
import { site } from "@/resources/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og/"],
        disallow: ["/api/", "/admin", "/account", "/login"],
      },
    ],
    sitemap: `${site.baseURL}/sitemap.xml`,
  };
}
