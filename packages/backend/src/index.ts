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
import adminRouter, { recordSearch, recordPageView } from "./routes/admin.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "请求过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "搜索请求过于频繁，请稍后再试" },
});

app.use(globalLimiter);

// PV stats middleware
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/")) recordPageView();
  if (req.path === "/api/search") {
    const q = (req.query as Record<string, string>).q;
    if (q) recordSearch(q);
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.use("/api/search", searchLimiter, searchRouter);
app.use("/api/repo", repoRouter);
app.use("/api/trending", trendingRouter);
app.use("/api/suggest", searchLimiter, suggestRouter);
app.use("/api/user", userRouter);
app.use("/api/download", downloadRouter);
app.use("/api/admin", adminRouter);

app.use("/api/{*path}", (_req, res) => {
  res.status(404).json({ error: "未知的 API 接口" });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
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
  server.close(() => process.exit(0));
});
