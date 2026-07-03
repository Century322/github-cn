import Redis from "ioredis";
import { REDIS_URL } from "../config/env.js";

let redis: Redis | null = null;
let redisConnected = false;
let lastRedisErrorLog = 0;

export function getRedis(): Redis | null {
  if (!redis && REDIS_URL) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) {
          return null;
        }
        const delay = Math.min(times * 500, 10000);
        return delay;
      },
      lazyConnect: true,
    });
    redis.on("error", (err) => {
      const now = Date.now();
      if (now - lastRedisErrorLog > 30000) {
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
      // Connection will be retried by retryStrategy
    });
  }
  return redis;
}

export function isRedisReady(): boolean {
  return redisConnected;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const data = await client.get(`gc:${key}`);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(`gc:${key}`, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("Redis set error:", err);
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
