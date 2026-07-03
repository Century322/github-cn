"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_express10 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);

// src/config/env.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
(function loadEnv() {
  const envPath = import_path.default.resolve(process.cwd(), ".env");
  if (!import_fs.default.existsSync(envPath)) return;
  const raw = import_fs.default.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();
var PORT = parseInt(process.env.PORT || "3001", 10);
var GITHUB_TOKENS = (process.env.GITHUB_TOKENS || "").split(",").map((t) => t.trim()).filter(Boolean);
var CORS_ORIGIN = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.includes(",") ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : process.env.CORS_ORIGIN : "http://localhost:3000";
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
var DATABASE_URL = process.env.DATABASE_URL || "";
var REDIS_URL = process.env.REDIS_URL || "";
var JWT_SECRET = process.env.JWT_SECRET || "";
if (!ADMIN_PASSWORD) {
  console.warn("\u26A0\uFE0F ADMIN_PASSWORD not set - admin endpoints will be inaccessible");
}
if (!JWT_SECRET) {
  console.warn("\u26A0\uFE0F JWT_SECRET not set - using default, please set in production");
}

// src/routes/search.ts
var import_express = require("express");

// src/services/redis.ts
var import_ioredis = __toESM(require("ioredis"), 1);
var redis = null;
var redisConnected = false;
var lastRedisErrorLog = 0;
function getRedis() {
  if (!redis && REDIS_URL) {
    redis = new import_ioredis.default(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) {
          return null;
        }
        const delay = Math.min(times * 500, 1e4);
        return delay;
      },
      lazyConnect: true
    });
    redis.on("error", (err) => {
      const now = Date.now();
      if (now - lastRedisErrorLog > 3e4) {
        console.error("Redis error:", err.message);
        lastRedisErrorLog = now;
      }
      redisConnected = false;
    });
    redis.on("connect", () => {
      console.log("Redis connected");
      redisConnected = true;
    });
    redis.on("close", () => {
      redisConnected = false;
    });
    redis.connect().catch(() => {
    });
  }
  return redis;
}
function isRedisReady() {
  return redisConnected;
}
async function redisGet(key) {
  const client = getRedis();
  if (!client) return null;
  try {
    const data = await client.get(`gc:${key}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}
async function redisSet(key, value, ttlSeconds) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(`gc:${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("Redis set error:", err);
  }
}
async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// src/services/cache.ts
var cache = /* @__PURE__ */ new Map();
var MAX_CACHE_SIZE = 2e3;
var CACHE_TTL = {
  search: 10 * 60,
  repo: 30 * 60,
  readme: 60 * 60,
  user: 30 * 60,
  trending: 60 * 60,
  suggest: 5 * 60
};
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCached(key, data, ttlSeconds) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.expiry < oldestTime) {
        oldestTime = v.expiry;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, expiry: Date.now() + ttlSeconds * 1e3 });
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiry) cache.delete(key);
  }
}, 5 * 60 * 1e3);
var inflightRequests = /* @__PURE__ */ new Map();
async function getWithCache(key, ttlSeconds, fetcher) {
  const memoryCached = getCached(key);
  if (memoryCached !== null) return memoryCached;
  const redisCached = isRedisReady() ? await redisGet(key) : null;
  if (redisCached !== null) {
    setCached(key, redisCached, ttlSeconds);
    return redisCached;
  }
  const existing = inflightRequests.get(key);
  if (existing) return existing;
  const promise = fetcher().then(async (data) => {
    setCached(key, data, ttlSeconds);
    if (isRedisReady()) await redisSet(key, data, ttlSeconds);
    inflightRequests.delete(key);
    return data;
  }).catch((err) => {
    inflightRequests.delete(key);
    throw err;
  });
  inflightRequests.set(key, promise);
  return promise;
}

// src/services/github.ts
var GitHubService = class {
  tokenStatuses = [];
  currentIndex = 0;
  constructor() {
    for (const token of GITHUB_TOKENS) {
      this.tokenStatuses.push({ token, remaining: 5e3, resetAt: 0 });
    }
  }
  getNextToken() {
    if (this.tokenStatuses.length === 0) return null;
    const now = Date.now() / 1e3;
    for (let i = 0; i < this.tokenStatuses.length; i++) {
      const idx = (this.currentIndex + i) % this.tokenStatuses.length;
      const status = this.tokenStatuses[idx];
      if (status.remaining > 10 || now > status.resetAt) {
        this.currentIndex = idx + 1;
        return status.token;
      }
    }
    return null;
  }
  updateRateLimit(token, headers) {
    const status = this.tokenStatuses.find((s) => s.token === token);
    if (!status) return;
    const remaining = headers.get("X-RateLimit-Remaining");
    const resetAt = headers.get("X-RateLimit-Reset");
    if (remaining) status.remaining = parseInt(remaining, 10);
    if (resetAt) status.resetAt = parseInt(resetAt, 10);
  }
  async request(endpoint, options) {
    const token = this.getNextToken();
    if (!token) {
      const err = new Error("GitHub API \u9650\u901F\u4E2D\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      err.statusCode = 429;
      throw err;
    }
    const headers = {
      Accept: "application/vnd.github.v3+json",
      ...options?.headers
    };
    headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15e3);
    try {
      const res = await fetch(`https://api.github.com${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      this.updateRateLimit(token, res.headers);
      if (res.status === 403) {
        const remaining = res.headers.get("X-RateLimit-Remaining");
        if (remaining === "0") {
          throw new Error("GitHub API \u9650\u901F\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
        }
        throw new Error("GitHub API \u8BBF\u95EE\u88AB\u62D2\u7EDD\uFF0C\u53EF\u80FD\u662F\u6743\u9650\u4E0D\u8DB3");
      }
      if (res.status === 404) {
        throw new Error("\u8D44\u6E90\u4E0D\u5B58\u5728");
      }
      if (!res.ok) {
        throw new Error(`GitHub API \u8BF7\u6C42\u5931\u8D25: ${res.status}`);
      }
      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }
  async searchRepos(query2, page = 1, perPage = 30, sort, order = "desc") {
    const cacheKey = `search:${query2}:${page}:${perPage}:${sort || "best"}:${order}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const sortParam = sort && sort !== "best-match" ? `&sort=${sort}&order=${order}` : "";
      const data = await this.request(
        `/search/repositories?q=${encodeURIComponent(query2)}&page=${page}&per_page=${perPage}${sortParam}`
      );
      return {
        repos: data.items,
        total_count: data.total_count,
        page,
        per_page: perPage,
        has_more: page * perPage < data.total_count
      };
    });
  }
  async getRepo(owner, repo) {
    const cacheKey = `repo:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      return this.request(`/repos/${owner}/${repo}`);
    });
  }
  async getReadme(owner, repo, ref) {
    const cacheKey = `readme:${owner}/${repo}:${ref || ""}`;
    return getWithCache(cacheKey, CACHE_TTL.readme, async () => {
      try {
        const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
        const data = await this.request(
          `/repos/${owner}/${repo}/readme${refParam}`,
          { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        if (data.content && data.encoding === "base64") {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
        return null;
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return null;
      }
    });
  }
  async getReleases(owner, repo, page = 1) {
    const cacheKey = `releases:${owner}/${repo}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request(
          `/repos/${owner}/${repo}/releases?page=${page}&per_page=10`
        );
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  async getUser(username) {
    const cacheKey = `user:${username}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      return this.request(`/users/${username}`);
    });
  }
  async getSuggestions(query2) {
    const cacheKey = `suggest:${query2}`;
    return getWithCache(cacheKey, CACHE_TTL.suggest, async () => {
      try {
        const data = await this.request(
          `/search/repositories?q=${encodeURIComponent(query2)}&per_page=6`
        );
        return data.items.map((item) => item.full_name);
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  async searchUsers(query2, page = 1, perPage = 30) {
    const cacheKey = `search-users:${query2}:${page}:${perPage}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const data = await this.request(
        `/search/users?q=${encodeURIComponent(query2)}&page=${page}&per_page=${perPage}`
      );
      return {
        users: data.items,
        total_count: data.total_count,
        page,
        per_page: perPage,
        has_more: page * perPage < data.total_count
      };
    });
  }
  async searchCode(query2, page = 1, perPage = 20) {
    const cacheKey = `search-code:${query2}:${page}:${perPage}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const data = await this.request(
        `/search/code?q=${encodeURIComponent(query2)}&page=${page}&per_page=${perPage}`
      );
      return {
        items: data.items,
        total_count: data.total_count,
        page,
        per_page: perPage,
        has_more: page * perPage < data.total_count
      };
    });
  }
  // 仓库目录内容
  async getContents(owner, repo, path2 = "", ref) {
    const cacheKey = `contents:${owner}/${repo}:${path2}:${ref || ""}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      const pathPart = path2 ? `/${path2}` : "";
      const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const data = await this.request(
        `/repos/${owner}/${repo}/contents${pathPart}${refParam}`
      );
      return Array.isArray(data) ? data : [data];
    });
  }
  // 单个文件内容
  async getFileContent(owner, repo, path2, ref) {
    const cacheKey = `file:${owner}/${repo}:${path2}:${ref || ""}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const encodedPath = path2.split("/").map(encodeURIComponent).join("/");
      return this.request(
        `/repos/${owner}/${repo}/contents/${encodedPath}${refParam}`
      );
    });
  }
  // 语言分布
  async getLanguages(owner, repo) {
    const cacheKey = `languages:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      return this.request(`/repos/${owner}/${repo}/languages`);
    });
  }
  // 贡献者
  async getContributors(owner, repo) {
    const cacheKey = `contributors:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request(`/repos/${owner}/${repo}/contributors?per_page=20`);
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  // 分支列表
  async getBranches(owner, repo) {
    const cacheKey = `branches:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request(`/repos/${owner}/${repo}/branches?per_page=100`);
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  // 标签列表
  async getTags(owner, repo) {
    const cacheKey = `tags:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request(`/repos/${owner}/${repo}/tags?per_page=20`);
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  // Commit 历史
  async getCommits(owner, repo, sha, page = 1) {
    const cacheKey = `commits:${owner}/${repo}:${sha || ""}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        const shaParam = sha ? `&sha=${encodeURIComponent(sha)}` : "";
        return this.request(`/repos/${owner}/${repo}/commits?per_page=10&page=${page}${shaParam}`);
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  // 用户组织
  async getUserOrgs(username) {
    const cacheKey = `user-orgs:${username}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      try {
        return this.request(`/users/${username}/orgs`);
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return [];
      }
    });
  }
  // 用户仓库（支持分页+排序）
  async getUserReposPaged(username, page = 1, sort = "stars") {
    const cacheKey = `user-repos:${username}:${page}:${sort}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      const sortMap = {
        stars: "stargazers_count",
        updated: "updated_at",
        push: "pushed_at",
        name: "full_name"
      };
      const sortField = sortMap[sort] || "stargazers_count";
      const data = await this.request(
        `/users/${username}/repos?page=${page}&per_page=30&sort=${sortField}&direction=desc`
      );
      return {
        repos: data,
        page,
        has_more: data.length === 30
      };
    });
  }
  // 用户 Starred 仓库
  async getUserStarred(username, page = 1) {
    const cacheKey = `user-starred:${username}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      try {
        const data = await this.request(
          `/users/${username}/starred?page=${page}&per_page=30`
        );
        return { repos: data, page, has_more: data.length === 30 };
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return { repos: [], page, has_more: false };
      }
    });
  }
  // Issues 列表
  async getIssues(owner, repo, state = "open", page = 1) {
    const cacheKey = `issues:${owner}/${repo}:${state}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        const data = await this.request(
          `/repos/${owner}/${repo}/issues?state=${state}&sort=created&direction=desc&page=${page}&per_page=30`
        );
        const items = data.filter((i) => !i.pull_request).slice(0, 25);
        return { items, has_more: data.length === 30 };
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return { items: [], has_more: false };
      }
    });
  }
  // Pull Requests 列表
  async getPulls(owner, repo, state = "open", page = 1) {
    const cacheKey = `pulls:${owner}/${repo}:${state}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        const data = await this.request(
          `/repos/${owner}/${repo}/pulls?state=${state}&sort=created&direction=desc&page=${page}&per_page=25`
        );
        return { items: data, has_more: data.length === 25 };
      } catch (e) {
        console.error("GitHub API call failed:", e);
        return { items: [], has_more: false };
      }
    });
  }
};
var githubService = new GitHubService();

// src/routes/search.ts
var router = (0, import_express.Router)();
router.get("/repos", async (req, res) => {
  try {
    const query2 = req.query.q || "";
    if (!query2) {
      res.status(400).json({ error: "\u641C\u7D22\u5173\u952E\u8BCD\u4E0D\u80FD\u4E3A\u7A7A" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 30));
    const result = await githubService.searchRepos(query2, page, perPage, req.query.sort, req.query.order || "desc");
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u641C\u7D22\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    console.error("Search repos error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});
router.get("/users", async (req, res) => {
  try {
    const query2 = req.query.q || "";
    if (!query2) {
      res.status(400).json({ error: "\u641C\u7D22\u5173\u952E\u8BCD\u4E0D\u80FD\u4E3A\u7A7A" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 30));
    const result = await githubService.searchUsers(query2, page, perPage);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u641C\u7D22\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    console.error("Search users error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});
router.get("/code", async (req, res) => {
  try {
    const query2 = req.query.q || "";
    if (!query2) {
      res.status(400).json({ error: "\u641C\u7D22\u5173\u952E\u8BCD\u4E0D\u80FD\u4E3A\u7A7A" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 20));
    const result = await githubService.searchCode(query2, page, perPage);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u641C\u7D22\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    console.error("Search code error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});
router.get("/", async (req, res) => {
  try {
    const query2 = req.query.q || "";
    if (!query2) {
      res.status(400).json({ error: "\u641C\u7D22\u5173\u952E\u8BCD\u4E0D\u80FD\u4E3A\u7A7A" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page) || 30));
    const result = await githubService.searchRepos(query2, page, perPage, req.query.sort, req.query.order || "desc");
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u641C\u7D22\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    console.error("Search error:", msg);
    res.status(statusCode).json({ error: msg });
  }
});
var search_default = router;

// src/routes/repo.ts
var import_express2 = require("express");
var router2 = (0, import_express2.Router)();
router2.get("/:owner/:repo/contents", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const ref = req.query.ref;
    const contents = await githubService.getContents(owner, repo, "", ref);
    res.json(contents);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u76EE\u5F55\u5185\u5BB9\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/contents/*path", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const pathParam = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path || "";
    const ref = req.query.ref;
    const contents = await githubService.getContents(owner, repo, pathParam, ref);
    res.json(contents);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u76EE\u5F55\u5185\u5BB9\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/file/*path", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const pathParam = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path || "";
    const ref = req.query.ref;
    if (!pathParam) {
      res.status(400).json({ error: "\u7F3A\u5C11\u6587\u4EF6\u8DEF\u5F84" });
      return;
    }
    const fileContent = await githubService.getFileContent(owner, repo, pathParam, ref);
    res.json(fileContent);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u6587\u4EF6\u5185\u5BB9\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/readme", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const ref = req.query.ref;
    const readme = await githubService.getReadme(owner, repo, ref);
    if (!readme) {
      res.status(404).json({ error: "README \u4E0D\u5B58\u5728" });
      return;
    }
    res.json({ content: readme });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6 README \u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/releases", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const releases = await githubService.getReleases(owner, repo, page);
    res.json(releases);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6 Releases \u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/languages", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const languages = await githubService.getLanguages(owner, repo);
    res.json(languages);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u8BED\u8A00\u5206\u5E03\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/contributors", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const contributors = await githubService.getContributors(owner, repo);
    res.json(contributors);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u8D21\u732E\u8005\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/branches", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branches = await githubService.getBranches(owner, repo);
    res.json(branches);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u5206\u652F\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/tags", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const tags = await githubService.getTags(owner, repo);
    res.json(tags);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u6807\u7B7E\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/commits", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const sha = req.query.sha;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const commits = await githubService.getCommits(owner, repo, sha, page);
    res.json(commits);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6 Commits \u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/issues", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const state = req.query.state || "open";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const result = await githubService.getIssues(owner, repo, state, page);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6 Issues \u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo/pulls", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const state = req.query.state || "open";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const result = await githubService.getPulls(owner, repo, state, page);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6 Pull Requests \u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router2.get("/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const data = await githubService.getRepo(owner, repo);
    res.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u4ED3\u5E93\u8BE6\u60C5\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    if (msg.includes("\u4E0D\u5B58\u5728")) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(statusCode).json({ error: msg });
  }
});
var repo_default = router2;

// src/routes/trending.ts
var import_express3 = require("express");

// src/services/trending.ts
var cheerio = __toESM(require("cheerio"), 1);
async function fetchTrending(language = "", since = "daily") {
  const cacheKey = `trending:${language || "all"}:${since}`;
  return getWithCache(cacheKey, CACHE_TTL.trending, async () => {
    const langPath = language ? `/${language}` : "";
    const url = `https://github.com/trending${langPath}?since=${since}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html"
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub Trending \u8BF7\u6C42\u5931\u8D25: ${res.status}`);
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const repos = [];
    $("article.Box-row").each((_, el) => {
      const $el = $(el);
      const $link = $el.find("h2 a");
      const href = $link.attr("href") || "";
      const parts = href.replace(/^\//, "").split("/");
      const owner = parts[0] || "";
      const name = parts[1] || "";
      const description = $el.find("p").first().text().trim() || null;
      const $lang = $el.find('[itemprop="programmingLanguage"]');
      const langText = $lang.text().trim() || null;
      const $starLink = $el.find("a:has(svg.octicon-star)");
      const starsText = $starLink.text().trim().replace(/,/g, "");
      const stars = parseInt(starsText, 10) || 0;
      const $forkLink = $el.find("a:has(svg.octicon-repo-forked)");
      const forksText = $forkLink.text().trim().replace(/,/g, "");
      const forks = parseInt(forksText, 10) || 0;
      const todayStarsText = $el.find(".float-sm-right").text().trim();
      const todayStarsMatch = todayStarsText.match(/(\d[\d,]*)/);
      const todayStars = todayStarsMatch ? parseInt(todayStarsMatch[1].replace(/,/g, ""), 10) : 0;
      if (owner && name) {
        repos.push({
          full_name: `${owner}/${name}`,
          name,
          description,
          language: langText,
          stars,
          forks,
          today_stars: todayStars,
          html_url: `https://github.com/${owner}/${name}`,
          owner: {
            login: owner,
            avatar_url: `https://github.com/${owner}.png`
          }
        });
      }
    });
    const needsEnrichment = repos.filter((r) => r.stars === 0);
    if (needsEnrichment.length > 0) {
      const batchSize = 5;
      for (let i = 0; i < needsEnrichment.length; i += batchSize) {
        const batch = needsEnrichment.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((r) => githubService.getRepo(r.full_name.split("/")[0], r.full_name.split("/")[1]))
        );
        results.forEach((result, idx) => {
          if (result.status === "fulfilled" && result.value) {
            const repo = batch[idx];
            const apiData = result.value;
            repo.stars = apiData.stargazers_count || repo.stars;
            repo.forks = apiData.forks_count || repo.forks;
            repo.description = repo.description || apiData.description;
            repo.language = repo.language || apiData.language;
          }
        });
      }
    }
    return repos;
  });
}

// src/routes/trending.ts
var router3 = (0, import_express3.Router)();
router3.get("/", async (req, res) => {
  try {
    const language = req.query.language || "";
    const since = req.query.since || "daily";
    const repos = await fetchTrending(language, since);
    res.json(repos);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u70ED\u95E8\u9879\u76EE\u5931\u8D25";
    console.error("Trending error:", msg);
    res.status(502).json({ error: msg });
  }
});
var trending_default = router3;

// src/routes/suggest.ts
var import_express4 = require("express");
var router4 = (0, import_express4.Router)();
router4.get("/", async (req, res) => {
  try {
    const query2 = req.query.q || "";
    if (!query2 || query2.length < 2) {
      res.json([]);
      return;
    }
    const suggestions = await githubService.getSuggestions(query2);
    res.json(suggestions);
  } catch (error) {
    res.json([]);
  }
});
var suggest_default = router4;

// src/routes/user.ts
var import_express5 = require("express");
var router5 = (0, import_express5.Router)();
router5.get("/:username/starred", async (req, res) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const result = await githubService.getUserStarred(username, page);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6 Starred \u4ED3\u5E93\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router5.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await githubService.getUser(username);
    res.json(user);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    if (msg.includes("\u4E0D\u5B58\u5728")) {
      res.status(404).json({ error: msg });
      return;
    }
    res.status(statusCode).json({ error: msg });
  }
});
router5.get("/:username/repos", async (req, res) => {
  try {
    const { username } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const sort = req.query.sort || "stars";
    const result = await githubService.getUserReposPaged(username, page, sort);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u83B7\u53D6\u7528\u6237\u4ED3\u5E93\u5931\u8D25";
    const statusCode = error instanceof Error && "statusCode" in error ? error.statusCode : 502;
    res.status(statusCode).json({ error: msg });
  }
});
router5.get("/:username/orgs", async (req, res) => {
  try {
    const { username } = req.params;
    const orgs = await githubService.getUserOrgs(username);
    res.json(orgs);
  } catch (error) {
    res.json([]);
  }
});
var user_default = router5;

// src/routes/download.ts
var import_express7 = require("express");

// src/routes/admin.ts
var import_express6 = require("express");

// src/middleware/auth.ts
function authCheck(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    res.status(401).json({ error: "\u672A\u6388\u6743\u8BBF\u95EE" });
    return;
  }
  next();
}

// src/services/database.ts
var import_pg = __toESM(require("pg"), 1);
var { Pool } = import_pg.default;
var pool = null;
var dbReady = false;
function getPool() {
  if (!pool) {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL \u73AF\u5883\u53D8\u91CF\u672A\u8BBE\u7F6E");
    }
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 5e3,
      ssl: DATABASE_URL.includes("render.com") || DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : void 0
    });
    pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err.message);
      dbReady = false;
    });
  }
  return pool;
}
function isDatabaseReady() {
  return dbReady;
}
async function checkDatabaseConnection() {
  if (!DATABASE_URL) return false;
  try {
    const result = await getPool().query("SELECT 1 AS ok");
    dbReady = result.rows.length > 0;
  } catch {
    dbReady = false;
  }
  return dbReady;
}
async function query(text, params) {
  const start = Date.now();
  const result = await getPool().query(text, params);
  const duration = Date.now() - start;
  if (duration > 1e3) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }
  return result;
}
async function initDatabase() {
  const pool2 = getPool();
  await pool2.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(100),
      avatar_url VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      repo_full_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, repo_full_name)
    );

    CREATE TABLE IF NOT EXISTS user_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      repo_full_name VARCHAR(255) NOT NULL,
      visited_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS download_logs (
      id SERIAL PRIMARY KEY,
      repo_full_name VARCHAR(255) NOT NULL,
      download_type VARCHAR(100) NOT NULL DEFAULT 'zip',
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path VARCHAR(500),
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS search_logs (
      id SERIAL PRIMARY KEY,
      query VARCHAR(500) NOT NULL,
      ip_address VARCHAR(45),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id, visited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_download_logs_repo ON download_logs(repo_full_name);
    CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
    CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_logs(created_at);
  `);
  dbReady = true;
  console.log("Database tables initialized");
}
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// src/routes/admin.ts
var router6 = (0, import_express6.Router)();
var MAX_TOP_SEARCHES = 200;
var stats = {
  pv: 0,
  searchCount: 0,
  downloadCount: 0,
  topSearches: /* @__PURE__ */ new Map()
};
router6.get("/stats/overview", authCheck, async (_req, res) => {
  try {
    if (DATABASE_URL && isDatabaseReady()) {
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const [pvResult, searchResult, downloadResult, keywordResult] = await Promise.all([
        query("SELECT COUNT(*) as count FROM page_views WHERE created_at::date = $1", [today]),
        query("SELECT COUNT(*) as count FROM search_logs WHERE created_at::date = $1", [today]),
        query("SELECT COUNT(*) as count FROM download_logs WHERE created_at::date = $1", [today]),
        query(
          "SELECT query, COUNT(*) as count FROM search_logs WHERE created_at::date = $1 GROUP BY query ORDER BY count DESC LIMIT 20",
          [today]
        )
      ]);
      res.json({
        pv_today: parseInt(pvResult.rows[0]?.count || "0"),
        uv_today: 0,
        search_count_today: parseInt(searchResult.rows[0]?.count || "0"),
        download_count_today: parseInt(downloadResult.rows[0]?.count || "0"),
        top_searches: keywordResult.rows.map((r) => ({ query: r.query, count: parseInt(r.count) }))
      });
    } else {
      const topSearches = Array.from(stats.topSearches.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([query2, count]) => ({ query: query2, count }));
      res.json({
        pv_today: stats.pv,
        uv_today: 0,
        search_count_today: stats.searchCount,
        download_count_today: stats.downloadCount,
        top_searches: topSearches
      });
    }
  } catch (err) {
    console.error("Stats overview error:", err);
    res.status(500).json({ error: "\u83B7\u53D6\u7EDF\u8BA1\u5931\u8D25" });
  }
});
router6.get("/stats/keywords", authCheck, async (_req, res) => {
  try {
    if (DATABASE_URL && isDatabaseReady()) {
      const result = await query(
        "SELECT query, COUNT(*) as count FROM search_logs GROUP BY query ORDER BY count DESC LIMIT 50"
      );
      res.json(result.rows.map((r) => ({ query: r.query, count: parseInt(r.count) })));
    } else {
      const keywords = Array.from(stats.topSearches.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([query2, count]) => ({ query: query2, count }));
      res.json(keywords);
    }
  } catch (err) {
    console.error("Stats keywords error:", err);
    res.status(500).json({ error: "\u83B7\u53D6\u5173\u952E\u8BCD\u7EDF\u8BA1\u5931\u8D25" });
  }
});
function recordSearch(queryStr) {
  stats.searchCount++;
  const normalized = queryStr.trim().toLowerCase().slice(0, 100);
  if (normalized) {
    stats.topSearches.set(normalized, (stats.topSearches.get(normalized) || 0) + 1);
    if (stats.topSearches.size > MAX_TOP_SEARCHES) {
      const sorted = Array.from(stats.topSearches.entries()).sort((a, b) => a[1] - b[1]);
      for (let i = 0; i < 50 && i < sorted.length; i++) {
        stats.topSearches.delete(sorted[i][0]);
      }
    }
  }
  if (DATABASE_URL && isDatabaseReady()) {
    query("INSERT INTO search_logs (query) VALUES ($1)", [normalized]).catch(
      (err) => console.error("Failed to log search:", err.message)
    );
  }
}
function recordPageView() {
  stats.pv++;
  if (DATABASE_URL && isDatabaseReady()) {
    query("INSERT INTO page_views DEFAULT VALUES").catch(
      (err) => console.error("Failed to log page view:", err.message)
    );
  }
}
function recordDownload() {
  stats.downloadCount++;
}
var admin_default = router6;

// src/routes/download.ts
var router7 = (0, import_express7.Router)();
var downloadCounts = /* @__PURE__ */ new Map();
router7.post("/", async (req, res) => {
  try {
    const { repo_full_name, download_type, branch } = req.body;
    if (!repo_full_name) {
      res.status(400).json({ error: "\u7F3A\u5C11\u4ED3\u5E93\u4FE1\u606F" });
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
        ip
      ]).catch((err) => console.error("Failed to log download:", err.message));
    }
    const [owner, repo] = repo_full_name.split("/");
    if (!owner || !repo) {
      res.status(400).json({ error: "\u65E0\u6548\u7684\u4ED3\u5E93\u540D\u79F0" });
      return;
    }
    const branchName = branch || (await githubService.getRepo(owner, repo))?.default_branch || "main";
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branchName}.zip`;
    res.json({ url: zipUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "\u4E0B\u8F7D\u5931\u8D25";
    res.status(500).json({ error: msg });
  }
});
router7.get("/stats", authCheck, async (_req, res) => {
  try {
    if (DATABASE_URL && isDatabaseReady()) {
      const result = await query(
        "SELECT repo_full_name, download_type, COUNT(*) as count FROM download_logs GROUP BY repo_full_name, download_type ORDER BY count DESC LIMIT 100"
      );
      res.json(result.rows.map((r) => ({ key: `${r.repo_full_name}:${r.download_type}`, count: parseInt(r.count) })));
    } else {
      const stats2 = Array.from(downloadCounts.entries()).map(([key, count]) => ({ key, count }));
      res.json(stats2);
    }
  } catch (error) {
    res.status(500).json({ error: "\u83B7\u53D6\u4E0B\u8F7D\u7EDF\u8BA1\u5931\u8D25" });
  }
});
var download_default = router7;

// src/routes/proxy.ts
var import_express8 = require("express");
var router8 = (0, import_express8.Router)();
var PROXY_CACHE = /* @__PURE__ */ new Map();
var CACHE_TTL2 = 36e5;
var MAX_PROXY_CACHE_SIZE = 500;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of PROXY_CACHE) {
    if (now > entry.expiry) PROXY_CACHE.delete(key);
  }
}, 10 * 60 * 1e3);
function evictProxyCache() {
  if (PROXY_CACHE.size <= MAX_PROXY_CACHE_SIZE) return;
  const now = Date.now();
  let oldestKey = null;
  let oldestTime = Infinity;
  for (const [key, entry] of PROXY_CACHE) {
    if (entry.expiry < oldestTime) {
      oldestTime = entry.expiry;
      oldestKey = key;
    }
  }
  if (oldestKey) PROXY_CACHE.delete(oldestKey);
}
router8.get("/avatar", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.startsWith("https://avatars.githubusercontent.com/")) {
      res.status(400).json({ error: "\u65E0\u6548\u7684\u5934\u50CF URL" });
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
    const timeout = setTimeout(() => controller.abort(), 1e4);
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "\u5934\u50CF\u83B7\u53D6\u5931\u8D25" });
      return;
    }
    const contentType = upstream.headers.get("content-type") || "image/png";
    const data = Buffer.from(await upstream.arrayBuffer());
    PROXY_CACHE.set(url, { data, contentType, expiry: Date.now() + CACHE_TTL2 });
    evictProxyCache();
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(data);
  } catch {
    res.redirect(302, "/default-avatar.svg");
  }
});
router8.get("/raw", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || !url.startsWith("https://raw.githubusercontent.com/")) {
      res.status(400).json({ error: "\u65E0\u6548\u7684\u6587\u4EF6 URL" });
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
    const timeout = setTimeout(() => controller.abort(), 15e3);
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "\u6587\u4EF6\u83B7\u53D6\u5931\u8D25" });
      return;
    }
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const data = Buffer.from(await upstream.arrayBuffer());
    if (data.length < 5 * 1024 * 1024) {
      PROXY_CACHE.set(url, { data, contentType, expiry: Date.now() + CACHE_TTL2 });
      evictProxyCache();
    }
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(data);
  } catch {
    res.status(502).json({ error: "\u6587\u4EF6\u4EE3\u7406\u5931\u8D25" });
  }
});
router8.get("/archive", async (req, res) => {
  try {
    const { owner, repo, branch } = req.query;
    if (!owner || !repo || !branch) {
      res.status(400).json({ error: "\u7F3A\u5C11\u53C2\u6570" });
      return;
    }
    const safeName = /^[a-zA-Z0-9._-]+$/;
    if (!safeName.test(owner) || !safeName.test(repo) || !safeName.test(branch)) {
      res.status(400).json({ error: "\u53C2\u6570\u5305\u542B\u975E\u6CD5\u5B57\u7B26" });
      return;
    }
    const archiveUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6e4);
    const upstream = await fetch(archiveUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "\u4E0B\u8F7D\u5931\u8D25" });
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
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(value)) {
            await new Promise((resolve) => res.once("drain", resolve));
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
    res.status(502).json({ error: "\u4E0B\u8F7D\u4EE3\u7406\u5931\u8D25" });
  }
});
var proxy_default = router8;

// src/routes/auth.ts
var import_express9 = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var router9 = (0, import_express9.Router)();
var SECRET = JWT_SECRET || "dev-secret-change-in-production";
var TOKEN_EXPIRY = "7d";
async function ensureDatabase(res) {
  if (!DATABASE_URL) {
    res.status(503).json({ error: "\u6570\u636E\u5E93\u672A\u914D\u7F6E" });
    return false;
  }
  if (!isDatabaseReady()) {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      res.status(503).json({ error: "\u6570\u636E\u5E93\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" });
      return false;
    }
  }
  return true;
}
function generateToken(userId) {
  return import_jsonwebtoken.default.sign({ userId }, SECRET, { expiresIn: TOKEN_EXPIRY });
}
function verifyToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, SECRET);
  } catch {
    return null;
  }
}
function getUserFromRequest(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = verifyToken(auth.slice(7));
  return payload?.userId || null;
}
router9.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "\u90AE\u7BB1\u548C\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A" });
      return;
    }
    if (!await ensureDatabase(res)) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "\u5BC6\u7801\u81F3\u5C116\u4F4D" });
      return;
    }
    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "\u8BE5\u90AE\u7BB1\u5DF2\u6CE8\u518C" });
      return;
    }
    const passwordHash = await import_bcryptjs.default.hash(password, 10);
    const displayName = nickname || email.split("@")[0];
    const result = await query(
      "INSERT INTO users (email, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname, avatar_url",
      [email.toLowerCase(), passwordHash, displayName]
    );
    const user = result.rows[0];
    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "\u6CE8\u518C\u5931\u8D25" });
  }
});
router9.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "\u90AE\u7BB1\u548C\u5BC6\u7801\u4E0D\u80FD\u4E3A\u7A7A" });
      return;
    }
    if (!await ensureDatabase(res)) return;
    const result = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
      return;
    }
    const user = result.rows[0];
    const valid = await import_bcryptjs.default.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "\u90AE\u7BB1\u6216\u5BC6\u7801\u9519\u8BEF" });
      return;
    }
    await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "\u767B\u5F55\u5931\u8D25" });
  }
});
router9.get("/me", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const result = await query("SELECT id, email, nickname, avatar_url, created_at FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
      return;
    }
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "\u83B7\u53D6\u7528\u6237\u4FE1\u606F\u5931\u8D25" });
  }
});
router9.put("/profile", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const { nickname, avatar_url } = req.body;
    const result = await query(
      "UPDATE users SET nickname = COALESCE($1, nickname), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, email, nickname, avatar_url",
      [nickname || null, avatar_url || null, userId]
    );
    res.json({
      id: result.rows[0].id,
      email: result.rows[0].email,
      nickname: result.rows[0].nickname,
      avatar_url: result.rows[0].avatar_url
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "\u66F4\u65B0\u8D44\u6599\u5931\u8D25" });
  }
});
router9.post("/change-password", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      res.status(400).json({ error: "\u8BF7\u8F93\u5165\u65E7\u5BC6\u7801\u548C\u65B0\u5BC6\u7801" });
      return;
    }
    if (new_password.length < 6) {
      res.status(400).json({ error: "\u65B0\u5BC6\u7801\u81F3\u5C116\u4F4D" });
      return;
    }
    const result = await query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "\u7528\u6237\u4E0D\u5B58\u5728" });
      return;
    }
    const valid = await import_bcryptjs.default.compare(old_password, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: "\u65E7\u5BC6\u7801\u9519\u8BEF" });
      return;
    }
    const newHash = await import_bcryptjs.default.hash(new_password, 10);
    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, userId]);
    res.json({ message: "\u5BC6\u7801\u4FEE\u6539\u6210\u529F" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "\u4FEE\u6539\u5BC6\u7801\u5931\u8D25" });
  }
});
router9.get("/favorites", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const result = await query(
      "SELECT repo_full_name, created_at FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ error: "\u83B7\u53D6\u6536\u85CF\u5931\u8D25" });
  }
});
router9.post("/favorites", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const { repo_full_name } = req.body;
    if (!repo_full_name) {
      res.status(400).json({ error: "\u7F3A\u5C11\u4ED3\u5E93\u540D\u79F0" });
      return;
    }
    await query(
      "INSERT INTO user_favorites (user_id, repo_full_name) VALUES ($1, $2) ON CONFLICT (user_id, repo_full_name) DO NOTHING",
      [userId, repo_full_name]
    );
    res.json({ message: "\u6536\u85CF\u6210\u529F" });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ error: "\u6536\u85CF\u5931\u8D25" });
  }
});
router9.delete("/favorites/:repoFullName", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const { repoFullName } = req.params;
    await query("DELETE FROM user_favorites WHERE user_id = $1 AND repo_full_name = $2", [userId, repoFullName]);
    res.json({ message: "\u53D6\u6D88\u6536\u85CF\u6210\u529F" });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ error: "\u53D6\u6D88\u6536\u85CF\u5931\u8D25" });
  }
});
router9.get("/history", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const result = await query(
      "SELECT repo_full_name, MAX(visited_at) as visited_at FROM user_history WHERE user_id = $1 GROUP BY repo_full_name ORDER BY MAX(visited_at) DESC LIMIT $2",
      [userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "\u83B7\u53D6\u5386\u53F2\u5931\u8D25" });
  }
});
router9.post("/history", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    const { repo_full_name } = req.body;
    if (!repo_full_name) {
      res.status(400).json({ error: "\u7F3A\u5C11\u4ED3\u5E93\u540D\u79F0" });
      return;
    }
    await query("INSERT INTO user_history (user_id, repo_full_name) VALUES ($1, $2)", [userId, repo_full_name]);
    res.json({ message: "\u8BB0\u5F55\u6210\u529F" });
  } catch (err) {
    console.error("Add history error:", err);
    res.status(500).json({ error: "\u8BB0\u5F55\u5386\u53F2\u5931\u8D25" });
  }
});
router9.delete("/history", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "\u672A\u767B\u5F55" });
    return;
  }
  if (!await ensureDatabase(res)) return;
  try {
    await query("DELETE FROM user_history WHERE user_id = $1", [userId]);
    res.json({ message: "\u5386\u53F2\u5DF2\u6E05\u7A7A" });
  } catch (err) {
    console.error("Clear history error:", err);
    res.status(500).json({ error: "\u6E05\u7A7A\u5386\u53F2\u5931\u8D25" });
  }
});
var auth_default = router9;

// src/index.ts
var app = (0, import_express10.default)();
app.set("trust proxy", 1);
app.use((0, import_helmet.default)({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use((0, import_cors.default)({ origin: CORS_ORIGIN, credentials: true }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path !== "/api/health") {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});
app.use(import_express10.default.json({ limit: "1mb" }));
var globalLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 300,
  message: { error: "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health"
});
var searchLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  max: 30,
  message: { error: "\u641C\u7D22\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }
});
app.use(globalLimiter);
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") recordPageView();
  if (req.path.startsWith("/api/search")) {
    const q = req.query.q;
    if (q) recordSearch(q);
  }
  next();
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    database: DATABASE_URL ? isDatabaseReady() ? "connected" : "disconnected" : "not_configured",
    redis: REDIS_URL ? isRedisReady() ? "connected" : "disconnected" : "not_configured"
  });
});
app.use("/api/search", searchLimiter, search_default);
app.use("/api/repo", repo_default);
app.use("/api/trending", trending_default);
app.use("/api/suggest", searchLimiter, suggest_default);
app.use("/api/user", user_default);
app.use("/api/download", download_default);
app.use("/api/proxy", proxy_default);
app.use("/api/auth", auth_default);
app.use("/api/admin", admin_default);
app.use("/api/{*path}", (_req, res) => {
  res.status(404).json({ error: "\u672A\u77E5\u7684 API \u63A5\u53E3" });
});
var server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (DATABASE_URL) {
    try {
      await initDatabase();
      console.log("\u2713 Database connected and initialized");
    } catch (err) {
      console.error("\u2717 Database init failed:", err.message);
      console.warn("  Auth/user features will be unavailable until database is reachable");
    }
  } else {
    console.warn("\u26A0\uFE0F DATABASE_URL not set - using in-memory storage");
  }
  if (REDIS_URL) {
    getRedis();
  } else {
    console.warn("\u26A0\uFE0F REDIS_URL not set - using memory-only cache");
  }
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
process.on("SIGTERM", () => {
  Promise.all([closeDatabase(), closeRedis()]).then(() => server.close(() => process.exit(0)));
});
process.on("SIGINT", () => {
  Promise.all([closeDatabase(), closeRedis()]).then(() => server.close(() => process.exit(0)));
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
