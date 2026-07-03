import { Router } from "express";
import { recordDownload } from "./admin.js";
import { authCheck } from "../middleware/auth.js";
import { githubService } from "../services/github.js";
import { DATABASE_URL } from "../config/env.js";
import { query, isDatabaseReady } from "../services/database.js";

const router = Router();

const downloadCounts = new Map<string, number>();

router.post("/", async (req, res) => {
  try {
    const { repo_full_name, download_type, branch } = req.body as {
      repo_full_name?: string;
      download_type?: string;
      branch?: string;
    };
    if (!repo_full_name) {
      res.status(400).json({ error: "缺少仓库信息" });
      return;
    }

    const key = `${repo_full_name}:${download_type || "zip"}`;
    downloadCounts.set(key, (downloadCounts.get(key) || 0) + 1);

    recordDownload();

    if (DATABASE_URL && isDatabaseReady()) {
      const ip = req.ip || req.socket.remoteAddress || null;
      query("INSERT INTO download_logs (repo_full_name, download_type, ip_address) VALUES ($1, $2, $3)", [
        repo_full_name,
        download_type || "zip",
        ip,
      ]).catch((err) => console.error("Failed to log download:", err.message));
    }

    const [owner, repo] = repo_full_name.split("/");
    if (!owner || !repo) {
      res.status(400).json({ error: "无效的仓库名称" });
      return;
    }

    const branchName = branch || (await githubService.getRepo(owner, repo))?.default_branch || "main";
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branchName}.zip`;
    res.json({ url: zipUrl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "下载失败";
    res.status(500).json({ error: msg });
  }
});

router.get("/stats", authCheck, async (_req, res) => {
  try {
    if (DATABASE_URL && isDatabaseReady()) {
      const result = await query<{ repo_full_name: string; download_type: string; count: string }>(
        "SELECT repo_full_name, download_type, COUNT(*) as count FROM download_logs GROUP BY repo_full_name, download_type ORDER BY count DESC LIMIT 100"
      );
      res.json(result.rows.map((r) => ({ key: `${r.repo_full_name}:${r.download_type}`, count: parseInt(r.count) })));
    } else {
      const stats = Array.from(downloadCounts.entries()).map(([key, count]) => ({ key, count }));
      res.json(stats);
    }
  } catch (error: unknown) {
    res.status(500).json({ error: "获取下载统计失败" });
  }
});

export default router;
