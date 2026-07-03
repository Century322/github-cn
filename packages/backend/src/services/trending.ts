import * as cheerio from "cheerio";
import { getWithCache, CACHE_TTL } from "./cache.js";
import { githubService } from "./github.js";
import type { TrendingRepo } from "@github-cn/shared";

export async function fetchTrending(language: string = "", since: string = "daily"): Promise<TrendingRepo[]> {
  const cacheKey = `trending:${language || "all"}:${since}`;
  return getWithCache(cacheKey, CACHE_TTL.trending, async () => {
    const langPath = language ? `/${language}` : "";
    const url = `https://github.com/trending${langPath}?since=${since}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub Trending 请求失败: ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const repos: TrendingRepo[] = [];

    $("article.Box-row").each((_, el) => {
      const $el = $(el);
      const $link = $el.find("h2 a");
      const href = $link.attr("href") || "";
      const parts = href.replace(/^\//, "").split("/");
      const owner = parts[0] || "";
      const name = parts[1] || "";

      const description = $el.find("p").first().text().trim() || null;

      const $lang = $el.find('[itemprop="programmingLanguage"]');
      const langText = $lang.text().trim() || null;

      const $starLink = $el.find('a:has(svg.octicon-star)');
      const starsText = $starLink.text().trim().replace(/,/g, "");
      const stars = parseInt(starsText, 10) || 0;

      const $forkLink = $el.find('a:has(svg.octicon-repo-forked)');
      const forksText = $forkLink.text().trim().replace(/,/g, "");
      const forks = parseInt(forksText, 10) || 0;

      const todayStarsText = $el.find(".float-sm-right").text().trim();
      const todayStarsMatch = todayStarsText.match(/(\d[\d,]*)/);
      const todayStars = todayStarsMatch ? parseInt(todayStarsMatch[1].replace(/,/g, ""), 10) : 0;

      if (owner && name) {
        repos.push({
          full_name: `${owner}/${name}`,
          name,
          description,
          language: langText,
          stars,
          forks,
          today_stars: todayStars,
          html_url: `https://github.com/${owner}/${name}`,
          owner: {
            login: owner,
            avatar_url: `https://github.com/${owner}.png`,
          },
        });
      }
    });

    // 如果爬虫获取的 star/fork 数据为 0，用 GitHub API 补全
    const needsEnrichment = repos.filter((r) => r.stars === 0);
    if (needsEnrichment.length > 0) {
      const batchSize = 5;
      for (let i = 0; i < needsEnrichment.length; i += batchSize) {
        const batch = needsEnrichment.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((r) => githubService.getRepo(r.full_name.split("/")[0], r.full_name.split("/")[1]))
        );
        results.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value) {
            const repo = batch[idx];
            const apiData = result.value;
            repo.stars = apiData.stargazers_count || repo.stars;
            repo.forks = apiData.forks_count || repo.forks;
            repo.description = repo.description || apiData.description;
            repo.language = repo.language || apiData.language;
          }
        });
      }
    }

    return repos;
  });
}
