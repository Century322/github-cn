import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const API_BASE = process.env.BACKEND_URL || "http://localhost:3001";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://github-cn.dev",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://github-cn.dev/search",
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 0.9,
    },
  ];

  try {
    const res = await fetch(`${API_BASE}/api/trending?since=daily`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const repos: { full_name: string }[] = await res.json();
      const repoPages: MetadataRoute.Sitemap = repos.slice(0, 50).map((repo) => ({
        url: `https://github-cn.dev/repo/${repo.full_name}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
      return [...staticPages, ...repoPages];
    }
  } catch {
    // fallback to static only
  }

  return staticPages;
}
