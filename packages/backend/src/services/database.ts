import pg from "pg";
import { DATABASE_URL } from "../config/env.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbReady = false;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL 环境变量未设置");
    }
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err.message);
      dbReady = false;
    });
  }
  return pool;
}

export function isDatabaseReady(): boolean {
  return dbReady;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!DATABASE_URL) return false;
  try {
    const result = await getPool().query("SELECT 1 AS ok");
    dbReady = result.rows.length > 0;
  } catch {
    dbReady = false;
  }
  return dbReady;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }
  return result;
}

export async function initDatabase(): Promise<void> {
  const pool = getPool();

  await pool.query(`
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

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
