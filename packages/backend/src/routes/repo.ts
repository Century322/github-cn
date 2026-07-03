import { Router } from "express";
import { githubService } from "../services/github.js";

const router = Router();

// 具体路由必须在通配路由之前

// 目录内容（文件浏览器）- 根目录
router.get("/:owner/:repo/contents", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const ref = req.query.ref as string | undefined;
    const contents = await githubService.getContents(owner, repo, "", ref);
    res.json(contents);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取目录内容失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 目录内容（文件浏览器）- 子路径
router.get("/:owner/:repo/contents/*path", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const pathParam = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
    const ref = req.query.ref as string | undefined;
    const contents = await githubService.getContents(owner, repo, pathParam, ref);
    res.json(contents);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取目录内容失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 单个文件内容（查看源码）
router.get("/:owner/:repo/file/*path", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const pathParam = Array.isArray(req.params.path) ? req.params.path.join("/") : (req.params.path || "");
    const ref = req.query.ref as string | undefined;
    if (!pathParam) {
      res.status(400).json({ error: "缺少文件路径" });
      return;
    }
    const fileContent = await githubService.getFileContent(owner, repo, pathParam, ref);
    res.json(fileContent);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取文件内容失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// README
router.get("/:owner/:repo/readme", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const ref = req.query.ref as string | undefined;
    const readme = await githubService.getReadme(owner, repo, ref);
    if (!readme) {
      res.status(404).json({ error: "README 不存在" });
      return;
    }
    res.json({ content: readme });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 README 失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// Releases
router.get("/:owner/:repo/releases", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const releases = await githubService.getReleases(owner, repo, page);
    res.json(releases);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 Releases 失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 语言分布
router.get("/:owner/:repo/languages", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const languages = await githubService.getLanguages(owner, repo);
    res.json(languages);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取语言分布失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 贡献者
router.get("/:owner/:repo/contributors", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const contributors = await githubService.getContributors(owner, repo);
    res.json(contributors);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取贡献者失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 分支列表
router.get("/:owner/:repo/branches", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branches = await githubService.getBranches(owner, repo);
    res.json(branches);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取分支失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 标签列表
router.get("/:owner/:repo/tags", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const tags = await githubService.getTags(owner, repo);
    res.json(tags);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取标签失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// Commit 历史
router.get("/:owner/:repo/commits", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const sha = req.query.sha as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const commits = await githubService.getCommits(owner, repo, sha, page);
    res.json(commits);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 Commits 失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// Issues 列表
router.get("/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const state = (req.query.state as string) || "open";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await githubService.getIssues(owner, repo, state, page);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 Issues 失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// Pull Requests 列表
router.get("/:owner/:repo/pulls", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const state = (req.query.state as string) || "open";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await githubService.getPulls(owner, repo, state, page);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取 Pull Requests 失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});

// 仓库详情（放在最后，因为它是最短匹配）
router.get("/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubService.getRepo(owner, repo);
    res.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "获取仓库详情失败";
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 502;
    if (msg.includes("不存在")) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(statusCode).json({ error: msg });
  }
});

export default router;
