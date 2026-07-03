import { Router, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, isDatabaseReady, checkDatabaseConnection } from "../services/database.js";
import { DATABASE_URL, JWT_SECRET } from "../config/env.js";

const router = Router();
const SECRET = JWT_SECRET || "dev-secret-change-in-production";
const TOKEN_EXPIRY = "7d";

async function ensureDatabase(res: Response): Promise<boolean> {
  if (!DATABASE_URL) {
    res.status(503).json({ error: "数据库未配置" });
    return false;
  }
  if (!isDatabaseReady()) {
    const connected = await checkDatabaseConnection();
    if (!connected) {
      res.status(503).json({ error: "数据库连接失败，请稍后重试" });
      return false;
    }
  }
  return true;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
}

function generateToken(userId: number): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: { headers: { authorization?: string } }): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = verifyToken(auth.slice(7));
  return payload?.userId || null;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body as {
      email?: string;
      password?: string;
      nickname?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "邮箱和密码不能为空" });
      return;
    }

    if (!(await ensureDatabase(res))) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "邮箱格式不正确" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "密码至少6位" });
      return;
    }

    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "该邮箱已注册" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = nickname || email.split("@")[0];

    const result = await query<UserRow>(
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
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "注册失败" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "邮箱和密码不能为空" });
      return;
    }

    if (!(await ensureDatabase(res))) return;

    const result = await query<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: "邮箱或密码错误" });
      return;
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "邮箱或密码错误" });
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
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "登录失败" });
  }
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const result = await query<UserRow>("SELECT id, email, nickname, avatar_url, created_at FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "获取用户信息失败" });
  }
});

// PUT /api/auth/profile
router.put("/profile", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const { nickname, avatar_url } = req.body as { nickname?: string; avatar_url?: string };
    const result = await query<UserRow>(
      "UPDATE users SET nickname = COALESCE($1, nickname), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, email, nickname, avatar_url",
      [nickname || null, avatar_url || null, userId]
    );

    res.json({
      id: result.rows[0].id,
      email: result.rows[0].email,
      nickname: result.rows[0].nickname,
      avatar_url: result.rows[0].avatar_url,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "更新资料失败" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const { old_password, new_password } = req.body as { old_password?: string; new_password?: string };
    if (!old_password || !new_password) {
      res.status(400).json({ error: "请输入旧密码和新密码" });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({ error: "新密码至少6位" });
      return;
    }

    const result = await query<UserRow>("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "用户不存在" });
      return;
    }

    const valid = await bcrypt.compare(old_password, result.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: "旧密码错误" });
      return;
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [newHash, userId]);

    res.json({ message: "密码修改成功" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "修改密码失败" });
  }
});

// --- Favorites ---

// GET /api/auth/favorites
router.get("/favorites", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const result = await query<{ repo_full_name: string; created_at: string }>(
      "SELECT repo_full_name, created_at FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ error: "获取收藏失败" });
  }
});

// POST /api/auth/favorites
router.post("/favorites", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const { repo_full_name } = req.body as { repo_full_name?: string };
    if (!repo_full_name) {
      res.status(400).json({ error: "缺少仓库名称" });
      return;
    }

    await query(
      "INSERT INTO user_favorites (user_id, repo_full_name) VALUES ($1, $2) ON CONFLICT (user_id, repo_full_name) DO NOTHING",
      [userId, repo_full_name]
    );
    res.json({ message: "收藏成功" });
  } catch (err) {
    console.error("Add favorite error:", err);
    res.status(500).json({ error: "收藏失败" });
  }
});

// DELETE /api/auth/favorites/:repoFullName
router.delete<{ repoFullName: string }>("/favorites/:repoFullName", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const { repoFullName } = req.params;
    await query("DELETE FROM user_favorites WHERE user_id = $1 AND repo_full_name = $2", [userId, repoFullName]);
    res.json({ message: "取消收藏成功" });
  } catch (err) {
    console.error("Remove favorite error:", err);
    res.status(500).json({ error: "取消收藏失败" });
  }
});

// --- History ---

// GET /api/auth/history
router.get("/history", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const result = await query<{ repo_full_name: string; visited_at: string }>(
      "SELECT repo_full_name, MAX(visited_at) as visited_at FROM user_history WHERE user_id = $1 GROUP BY repo_full_name ORDER BY MAX(visited_at) DESC LIMIT $2",
      [userId, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "获取历史失败" });
  }
});

// POST /api/auth/history
router.post("/history", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    const { repo_full_name } = req.body as { repo_full_name?: string };
    if (!repo_full_name) {
      res.status(400).json({ error: "缺少仓库名称" });
      return;
    }

    await query("INSERT INTO user_history (user_id, repo_full_name) VALUES ($1, $2)", [userId, repo_full_name]);
    res.json({ message: "记录成功" });
  } catch (err) {
    console.error("Add history error:", err);
    res.status(500).json({ error: "记录历史失败" });
  }
});

// DELETE /api/auth/history
router.delete("/history", async (req, res) => {
  const userId = getUserFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  if (!(await ensureDatabase(res))) return;

  try {
    await query("DELETE FROM user_history WHERE user_id = $1", [userId]);
    res.json({ message: "历史已清空" });
  } catch (err) {
    console.error("Clear history error:", err);
    res.status(500).json({ error: "清空历史失败" });
  }
});

export default router;
