import type { MetadataRoute } from "next";
import { kitTools } from "@/resources/kit";
import { site, tools } from "@/resources/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/tools",
    ...tools.map((tool) => tool.path),
    ...kitTools.map((tool) => `/tools/${tool.slug}`),
    "/treehole",
    "/box",
    "/pricing",
    "/terms",
    "/privacy",
  ];
  return paths.map((path) => ({
    url: `${site.baseURL}${path}`,
    changeFrequency: path === "/treehole" || path === "/box" ? "hourly" : "weekly",
  }));
}
