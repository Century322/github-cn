import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      res.status(400).json({ error: "搜索关键词不能为空" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 30));

    const result = await githubService.searchRepos(query, page, perPage);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "搜索失败";
    console.error("Search error:", msg);
    res.status(502).json({ error: msg });
  }
});

export default router;
