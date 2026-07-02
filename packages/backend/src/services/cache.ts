interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const CACHE_TTL = {
  search: 10 * 60 * 1000,
  suggest: 5 * 60 * 1000,
  repo: 30 * 60 * 1000,
  readme: 60 * 60 * 1000,
  releases: 60 * 60 * 1000,
  trending: 60 * 60 * 1000,
  user: 30 * 60 * 1000,
} as const;

export { CACHE_TTL };

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
  if (cache.size > 1000) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

export async function getWithCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  const data = await fetcher();
  setCached(key, data, ttl);
  return data;
}
