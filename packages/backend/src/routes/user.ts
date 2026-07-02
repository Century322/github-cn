import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await githubService.getUser(username);
    res.json(user);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取用户信息失败";
    if (msg.includes("不存在")) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(502).json({ error: msg });
  }
});

router.get("/:username/repos", async (req, res) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const repos = await githubService.getUserRepos(username, page);
    res.json(repos);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取用户仓库失败";
    res.status(502).json({ error: msg });
  }
});

export default router;
