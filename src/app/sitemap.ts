import type { MetadataRoute } from "next";
import { site, tools } from "@/resources/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/tools", ...tools.map((tool) => tool.path), "/treehole", "/box", "/pricing", "/terms", "/privacy"];
  return paths.map((path) => ({
    url: `${site.baseURL}${path}`,
    changeFrequency: path === "/treehole" || path === "/box" ? "hourly" : "weekly",
  }));
}
