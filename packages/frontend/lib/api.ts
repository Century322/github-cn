const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return BACKEND_URL;
}

export async function fetchJSON<T>(path: string, revalidate = 1800): Promise<T | null> {
  try {
    const base = getApiBase();
    const url = `${base}${path}`;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function proxyAvatar(url: string): string {
  if (!url) return "";
  if (url.includes("avatars.githubusercontent.com")) {
    return `/api/proxy/avatar?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function proxyRawUrl(url: string): string {
  if (!url) return "";
  if (url.includes("raw.githubusercontent.com")) {
    return `/api/proxy/raw?url=${encodeURIComponent(url)}`;
  }
  return url;
}
