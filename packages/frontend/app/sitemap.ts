import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://github-cn.dev",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // In production, this would fetch trending repos from the database
  // For now, return static pages only
  return staticPages;
}
