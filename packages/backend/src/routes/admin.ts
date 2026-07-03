import { Router } from "express";
import { authCheck } from "../middleware/auth.js";
import { DATABASE_URL } from "../config/env.js";
import { query, isDatabaseReady } from "../services/database.js";

const router = Router();

const MAX_TOP_SEARCHES = 200;

const stats = {
  pv: 0,
  searchCount: 0,
  downloadCount: 0,
  topSearches: new Map<string, number>(),
};

router.get("/stats/overview", authCheck, async (_req, res) => {
  try {
    if (DATABASE_URL && isDatabaseReady()) {
      const today = new Date().toISOString().split("T")[0];
      const [pvResult, searchResult, downloadResult, keywordResult] = await Promise.all([
        query<{ count: string }>("SELECT COUNT(*) as count FROM page_views WHERE created_at::date = $1", [today]),
        query<{ count: string }>("SELECT COUNT(*) as count FROM search_logs WHERE created_at::date = $1", [today]),
        query<{ count: string }>("SELECT COUNT(*) as count FROM download_logs WHERE created_at::date = $1", [today]),
        query<{ query: string; count: string }>(
          "SELECT query, COUNT(*) as count FROM search_logs WHERE created_at::date = $1 GROUP BY query ORDER BY count DESC LIMIT 20",
          [today]
        ),
      ]);
      res.json({
        pv_today: parseInt(pvResult.rows[0]?.count || "0"),
        uv_today: 0,
        search_count_today: parseInt(searchResult.rows[0]?.count || "0"),
        download_count_today: parseInt(downloadResult.rows[0]?.count || "0"),
        top_searches: keywordResult.rows.map((r) => ({ query: r.query, count: parseInt(r.count) })),
      });
    } else {
      const topSearches = Array.from(stats.topSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([query, count]) => ({ query, count }));
      res.json({
        pv_today: stats.pv,
        uv_today: 0,
        search_count_today: stats.searchCount,
        download_count_today: stats.downloadCount,
        top_searches: topSearches,
      });
    }
  } catch (err) {
    console.error("Stats overview error:", err);
    res.status(500).json({ error: "获取统计失败" });
  }
});

router.get("/stats/keywords", authCheck, async (_req, res) => {
  try {
    if (DATABASE_URL && isDatabaseReady()) {
      const result = await query<{ query: string; count: string }>(
        "SELECT query, COUNT(*) as count FROM search_logs GROUP BY query ORDER BY count DESC LIMIT 50"
      );
      res.json(result.rows.map((r) => ({ query: r.query, count: parseInt(r.count) })));
    } else {
      const keywords = Array.from(stats.topSearches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([query, count]) => ({ query, count }));
      res.json(keywords);
    }
  } catch (err) {
    console.error("Stats keywords error:", err);
    res.status(500).json({ error: "获取关键词统计失败" });
  }
});

export function recordSearch(queryStr: string) {
  stats.searchCount++;
  const normalized = queryStr.trim().toLowerCase().slice(0, 100);
  if (normalized) {
    stats.topSearches.set(normalized, (stats.topSearches.get(normalized) || 0) + 1);
    if (stats.topSearches.size > MAX_TOP_SEARCHES) {
      const sorted = Array.from(stats.topSearches.entries()).sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < 50 && i < sorted.length; i++) {
        stats.topSearches.delete(sorted[i][0]);
      }
    }
  }
  if (DATABASE_URL && isDatabaseReady()) {
    query("INSERT INTO search_logs (query) VALUES ($1)", [normalized]).catch((err) =>
      console.error("Failed to log search:", err.message)
    );
  }
}

export function recordPageView() {
  stats.pv++;
  if (DATABASE_URL && isDatabaseReady()) {
    query("INSERT INTO page_views DEFAULT VALUES").catch((err) =>
      console.error("Failed to log page view:", err.message)
    );
  }
}

export function recordDownload() {
  stats.downloadCount++;
}

export default router;
