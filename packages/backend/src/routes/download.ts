import { Router } from "express";

const router = Router();

const downloadCounts = new Map<string, number>();

router.post("/", async (req, res) => {
  try {
    const { repo_full_name, download_type } = req.body as {
      repo_full_name?: string;
      download_type?: string;
    };
    if (!repo_full_name) {
      res.status(400).json({ error: "缺少仓库信息" });
      return;
    }

    const key = `${repo_full_name}:${download_type || "zip"}`;
    downloadCounts.set(key, (downloadCounts.get(key) || 0) + 1);

    const [owner, repo] = repo_full_name.split("/");
    if (!owner || !repo) {
      res.status(400).json({ error: "无效的仓库名称" });
      return;
    }

    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
    res.json({ url: zipUrl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "下载失败";
    res.status(500).json({ error: msg });
  }
});

router.get("/stats", async (_req, res) => {
  const stats = Array.from(downloadCounts.entries()).map(([key, count]) => ({
    key,
    count,
  }));
  res.json(stats);
});

export default router;
