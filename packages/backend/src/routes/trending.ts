import { Router } from "express";
import { fetchTrending } from "../services/trending.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const language = (req.query.language as string) || "";
    const since = (req.query.since as string) || "daily";
    const repos = await fetchTrending(language, since);
    res.json(repos);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取热门项目失败";
    console.error("Trending error:", msg);
    res.status(502).json({ error: msg });
  }
});

export default router;
