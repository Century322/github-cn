import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

router.get("/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubService.getRepo(owner, repo);
    res.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取仓库详情失败";
    if (msg.includes("不存在")) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(502).json({ error: msg });
  }
});

router.get("/:owner/:repo/readme", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const readme = await githubService.getReadme(owner, repo);
    if (!readme) {
      res.status(404).json({ error: "README 不存在" });
      return;
    }
    res.json({ content: readme });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 README 失败";
    res.status(502).json({ error: msg });
  }
});

router.get("/:owner/:repo/releases", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const releases = await githubService.getReleases(owner, repo, page);
    res.json(releases);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 Releases 失败";
    res.status(502).json({ error: msg });
  }
});

export default router;
