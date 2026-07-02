import { GITHUB_TOKENS } from "../config/env.js";
import { getWithCache, CACHE_TTL } from "./cache.js";
import type { GitHubRepo, GitHubSearchResult, GitHubUser, GitHubRelease, GitHubContent } from "@github-cn/shared";

interface TokenStatus {
  token: string;
  remaining: number;
  resetAt: number;
}

class GitHubService {
  private tokenStatuses: TokenStatus[] = [];
  private currentIndex = 0;

  constructor() {
    for (const token of GITHUB_TOKENS) {
      this.tokenStatuses.push({ token, remaining: 5000, resetAt: 0 });
    }
  }

  private getNextToken(): string | null {
    if (this.tokenStatuses.length === 0) return null;
    const now = Date.now() / 1000;

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

  private updateRateLimit(token: string, headers: Headers) {
    const status = this.tokenStatuses.find((s) => s.token === token);
    if (!status) return;
    const remaining = headers.get("X-RateLimit-Remaining");
    const resetAt = headers.get("X-RateLimit-Reset");
    if (remaining) status.remaining = parseInt(remaining, 10);
    if (resetAt) status.resetAt = parseInt(resetAt, 10);
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = this.getNextToken();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      ...(options?.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers,
    });

    if (token) this.updateRateLimit(token, res.headers);

    if (res.status === 403) {
      throw new Error("GitHub API 限速，请稍后重试");
    }
    if (res.status === 404) {
      throw new Error("资源不存在");
    }
    if (!res.ok) {
      throw new Error(`GitHub API 请求失败: ${res.status}`);
    }

    return res.json();
  }

  async searchRepos(query: string, page: number = 1, perPage: number = 30): Promise<{
    repos: GitHubRepo[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const cacheKey = `search:${query}:${page}:${perPage}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const data = await this.request<GitHubSearchResult>(
        `/search/repositories?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=stars&order=desc`
      );
      return {
        repos: data.items,
        total_count: data.total_count,
        page,
        per_page: perPage,
        has_more: page * perPage < data.total_count,
      };
    });
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const cacheKey = `repo:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      return this.request<GitHubRepo>(`/repos/${owner}/${repo}`);
    });
  }

  async getReadme(owner: string, repo: string): Promise<string | null> {
    const cacheKey = `readme:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.readme, async () => {
      try {
        const data = await this.request<GitHubContent>(
          `/repos/${owner}/${repo}/readme`,
          { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        if (data.content && data.encoding === "base64") {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
        return null;
      } catch {
        return null;
      }
    });
  }

  async getReleases(owner: string, repo: string, page: number = 1): Promise<GitHubRelease[]> {
    const cacheKey = `releases:${owner}/${repo}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.releases, async () => {
      try {
        return this.request<GitHubRelease[]>(
          `/repos/${owner}/${repo}/releases?page=${page}&per_page=10`
        );
      } catch {
        return [];
      }
    });
  }

  async getUser(username: string): Promise<GitHubUser> {
    const cacheKey = `user:${username}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      return this.request<GitHubUser>(`/users/${username}`);
    });
  }

  async getUserRepos(username: string, page: number = 1): Promise<GitHubRepo[]> {
    return this.request<GitHubRepo[]>(
      `/users/${username}/repos?page=${page}&per_page=30&sort=stars&direction=desc`
    );
  }

  async getSuggestions(query: string): Promise<string[]> {
    const cacheKey = `suggest:${query}`;
    return getWithCache(cacheKey, CACHE_TTL.suggest, async () => {
      try {
        const data = await this.request<GitHubSearchResult>(
          `/search/repositories?q=${encodeURIComponent(query)}&per_page=6`
        );
        return data.items.map((item) => item.full_name);
      } catch {
        return [];
      }
    });
  }
}

export const githubService = new GitHubService();
