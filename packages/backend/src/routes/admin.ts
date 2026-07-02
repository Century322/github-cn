import { Router } from "express";
import { ADMIN_PASSWORD } from "../config/env.js";

const router = Router();

const stats = {
  pv: 0,
  searchCount: 0,
  topSearches: new Map<string, number>(),
};

// Simple auth check middleware
function authCheck(req: any, _res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    _res.status(401).json({ error: "未授权访问" });
    return;
  }
  next();
}

router.get("/stats/overview", authCheck, async (_req, res) => {
  const topSearches = Array.from(stats.topSearches.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  res.json({
    pv_today: stats.pv,
    uv_today: 0,
    search_count_today: stats.searchCount,
    download_count_today: 0,
    pv_trend: [],
    uv_trend: [],
    top_searches: topSearches,
  });
});

router.get("/stats/keywords", authCheck, async (_req, res) => {
  const keywords = Array.from(stats.topSearches.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  res.json(keywords);
});

export function recordSearch(query: string) {
  stats.searchCount++;
  const normalized = query.trim().toLowerCase();
  if (normalized) {
    stats.topSearches.set(normalized, (stats.topSearches.get(normalized) || 0) + 1);
  }
}

export function recordPageView() {
  stats.pv++;
}

export default router;
