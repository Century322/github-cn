import { Router } from "express";

const router = Router();

const PROXY_CACHE = new Map<string, { data: Buffer; contentType: string; expiry: number }>();
const CACHE_TTL = 3600_000; // 1 hour
const MAX_PROXY_CACHE_SIZE = 500;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of PROXY_CACHE) {
    if (now > entry.expiry) PROXY_CACHE.delete(key);
  }
}, 10 * 60 * 1000);

function evictProxyCache() {
  if (PROXY_CACHE.size <= MAX_PROXY_CACHE_SIZE) return;
  const now = Date.now();
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of PROXY_CACHE) {
    if (entry.expiry < oldestTime) {
      oldestTime = entry.expiry;
      oldestKey = key;
    }
  }
  if (oldestKey) PROXY_CACHE.delete(oldestKey);
}

// Avatar proxy: /api/proxy/avatar?url=https://avatars.githubusercontent.com/u/xxx
router.get("/avatar", async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url || !url.startsWith("https://avatars.githubusercontent.com/")) {
      res.status(400).json({ error: "无效的头像 URL" });
      return;
    }

    const cached = PROXY_CACHE.get(url);
    if (cached && cached.expiry > Date.now()) {
      res.set("Content-Type", cached.contentType);
      res.set("Cache-Control", "public, max-age=3600");
      res.send(cached.data);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "头像获取失败" });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    const data = Buffer.from(await upstream.arrayBuffer());

    PROXY_CACHE.set(url, { data, contentType, expiry: Date.now() + CACHE_TTL });
    evictProxyCache();

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(data);
  } catch {
    res.redirect(302, "/default-avatar.svg");
  }
});

// Raw file proxy: /api/proxy/raw?url=https://raw.githubusercontent.com/...
router.get("/raw", async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url || !url.startsWith("https://raw.githubusercontent.com/")) {
      res.status(400).json({ error: "无效的文件 URL" });
      return;
    }

    const cached = PROXY_CACHE.get(url);
    if (cached && cached.expiry > Date.now()) {
      res.set("Content-Type", cached.contentType);
      res.set("Cache-Control", "public, max-age=3600");
      res.send(cached.data);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "文件获取失败" });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const data = Buffer.from(await upstream.arrayBuffer());

    if (data.length < 5 * 1024 * 1024) {
      PROXY_CACHE.set(url, { data, contentType, expiry: Date.now() + CACHE_TTL });
      evictProxyCache();
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(data);
  } catch {
    res.status(502).json({ error: "文件代理失败" });
  }
});

// Archive download proxy: /api/proxy/archive?owner=xxx&repo=xxx&branch=xxx
router.get("/archive", async (req, res) => {
  try {
    const { owner, repo, branch } = req.query as Record<string, string>;
    if (!owner || !repo || !branch) {
      res.status(400).json({ error: "缺少参数" });
      return;
    }

    const safeName = /^[a-zA-Z0-9._-]+$/;
    if (!safeName.test(owner) || !safeName.test(repo) || !safeName.test(branch)) {
      res.status(400).json({ error: "参数包含非法字符" });
      return;
    }

    const archiveUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const upstream = await fetch(archiveUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "下载失败" });
      return;
    }

    const contentLength = upstream.headers.get("content-length");
    const contentDisposition = `attachment; filename="${repo}-${branch}.zip"`;
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", contentDisposition);
    if (contentLength) res.set("Content-Length", contentLength);

    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(value)) {
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      };
      await pump();
    } else {
      const data = Buffer.from(await upstream.arrayBuffer());
      res.send(data);
    }
  } catch {
    res.status(502).json({ error: "下载代理失败" });
  }
});

export default router;
