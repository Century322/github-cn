import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

// 仓库搜索
router.get("/repos", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      res.status(400).json({ error: "搜索关键词不能为空" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 30));

    const result = await githubService.searchRepos(query, page, perPage, req.query.sort as string, (req.query.order as string) || "desc");
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "搜索失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    console.error("Search repos error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});

// 用户搜索
router.get("/users", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      res.status(400).json({ error: "搜索关键词不能为空" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 30));

    const result = await githubService.searchUsers(query, page, perPage);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "搜索失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    console.error("Search users error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});

// 代码搜索
router.get("/code", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      res.status(400).json({ error: "搜索关键词不能为空" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 20));

    const result = await githubService.searchCode(query, page, perPage);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "搜索失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    console.error("Search code error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});

// 兼容旧路由：默认搜索仓库
router.get("/", async (req, res) => {
  try {
    const query = (req.query.q as string) || "";
    if (!query) {
      res.status(400).json({ error: "搜索关键词不能为空" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 30));

    const result = await githubService.searchRepos(query, page, perPage, req.query.sort as string, (req.query.order as string) || "desc");
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "搜索失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    console.error("Search error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});

export default router;
