import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PORT, CORS_ORIGIN } from "./config/env.js";
import searchRouter from "./routes/search.js";
import repoRouter from "./routes/repo.js";
import trendingRouter from "./routes/trending.js";
import suggestRouter from "./routes/suggest.js";
import userRouter from "./routes/user.js";
import downloadRouter from "./routes/download.js";
import proxyRouter from "./routes/proxy.js";
import authRouter from "./routes/auth.js";
import adminRouter, { recordSearch, recordPageView } from "./routes/admin.js";
import { DATABASE_URL, REDIS_URL } from "./config/env.js";
import { initDatabase, closeDatabase, isDatabaseReady } from "./services/database.js";
import { getRedis, closeRedis, isRedisReady } from "./services/redis.js";
// recordDownload is imported and called from download.ts

const app = express();

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
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
app.use(express.json({ limit: "1mb" }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "请求过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "搜索请求过于频繁，请稍后再试" },
});

app.use(globalLimiter);

app.use((req, _res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") recordPageView();
  if (req.path.startsWith("/api/search")) {
    const q = (req.query as Record<string, string>).q;
    if (q) recordSearch(q);
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    database: DATABASE_URL ? (isDatabaseReady() ? "connected" : "disconnected") : "not_configured",
    redis: REDIS_URL ? (isRedisReady() ? "connected" : "disconnected") : "not_configured",
  });
});

app.use("/api/search", searchLimiter, searchRouter);
app.use("/api/repo", repoRouter);
app.use("/api/trending", trendingRouter);
app.use("/api/suggest", searchLimiter, suggestRouter);
app.use("/api/user", userRouter);
app.use("/api/download", downloadRouter);
app.use("/api/proxy", proxyRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

app.use("/api/{*path}", (_req, res) => {
  res.status(404).json({ error: "未知的 API 接口" });
});

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (DATABASE_URL) {
    try {
      await initDatabase();
      console.log("✓ Database connected and initialized");
    } catch (err) {
      console.error("✗ Database init failed:", (err as Error).message);
      console.warn("  Auth/user features will be unavailable until database is reachable");
    }
  } else {
    console.warn("⚠️ DATABASE_URL not set - using in-memory storage");
  }
  if (REDIS_URL) {
    getRedis();
  } else {
    console.warn("⚠️ REDIS_URL not set - using memory-only cache");
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
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
