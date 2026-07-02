import * as cheerio from "cheerio";
import { getWithCache, CACHE_TTL } from "./cache.js";
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

      const description = $el.find("p.col-9").text().trim() || null;

      const $lang = $el.find('[itemprop="programmingLanguage"]');
      const language = $lang.text().trim() || null;

      const starsText = $el.find('.Link--muted.d-inline-block.mr-3 svg.octicon-star')
        .closest("a")
        .text()
        .trim()
        .replace(/,/g, "");
      const stars = parseInt(starsText, 10) || 0;

      const forksText = $el.find('.Link--muted.d-inline-block svg.octicon-repo-forked')
        .closest("a")
        .text()
        .trim()
        .replace(/,/g, "");
      const forks = parseInt(forksText, 10) || 0;

      const todayStarsText = $el.find(".float-sm-right").text().trim();
      const todayStarsMatch = todayStarsText.match(/(\d[\d,]*)/);
      const todayStars = todayStarsMatch ? parseInt(todayStarsMatch[1].replace(/,/g, ""), 10) : 0;

      if (owner && name) {
        repos.push({
          full_name: `${owner}/${name}`,
          name,
          description,
          language,
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

    return repos;
  });
}
