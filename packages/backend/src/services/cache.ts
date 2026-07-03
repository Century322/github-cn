import { redisGet, redisSet, isRedisReady } from "./redis.js";

const cache = new Map<string, { data: unknown; expiry: number }>();

const MAX_CACHE_SIZE = 2000;

export const CACHE_TTL = {
  search: 10 * 60,
  repo: 30 * 60,
  readme: 60 * 60,
  user: 30 * 60,
  trending: 60 * 60,
  suggest: 5 * 60,
};

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached(key: string, data: unknown, ttlSeconds: number): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of cache) {
      if (v.expiry < oldestTime) {
        oldestTime = v.expiry;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiry) cache.delete(key);
  }
}, 5 * 60 * 1000);

const inflightRequests = new Map<string, Promise<unknown>>();

export async function getWithCache<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  const memoryCached = getCached<T>(key);
  if (memoryCached !== null) return memoryCached;

  const redisCached = isRedisReady() ? await redisGet<T>(key) : null;
  if (redisCached !== null) {
    setCached(key, redisCached, ttlSeconds);
    return redisCached;
  }

  const existing = inflightRequests.get(key);
  if (existing) return existing as Promise<T>;

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
