import fs from "fs";
import path from "path";

(function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
})();

export const PORT = parseInt(process.env.PORT || "3001", 10);
export const GITHUB_TOKENS = (process.env.GITHUB_TOKENS || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
export const DATABASE_URL = process.env.DATABASE_URL || "";
export const REDIS_URL = process.env.REDIS_URL || "";
export const JWT_SECRET = process.env.JWT_SECRET || "";

if (!ADMIN_PASSWORD) {
  console.warn("⚠️ ADMIN_PASSWORD not set - admin endpoints will be inaccessible");
}
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET not set - using default, please set in production");
}
