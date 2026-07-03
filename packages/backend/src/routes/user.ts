import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

router.get("/:username/starred", async (req, res) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await githubService.getUserStarred(username, page);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 Starred 仓库失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await githubService.getUser(username);
    res.json(user);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取用户信息失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    if (msg.includes("不存在")) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(statusCode).json({ error: msg });
  }
});

router.get("/:username/repos", async (req, res) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const sort = (req.query.sort as string) || "stars";
    const result = await githubService.getUserReposPaged(username, page, sort);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取用户仓库失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

router.get("/:username/orgs", async (req, res) => {
  try {
    const { username } = req.params;
    const orgs = await githubService.getUserOrgs(username);
    res.json(orgs);
  } catch (error: unknown) {
    res.json([]);
  }
});

export default router;
