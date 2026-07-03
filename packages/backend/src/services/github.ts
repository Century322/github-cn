import { GITHUB_TOKENS } from "../config/env.js";
import { getWithCache, CACHE_TTL } from "./cache.js";
import type { GitHubRepo, GitHubSearchResult, GitHubUser, GitHubRelease, GitHubContent, GitHubContributor, GitHubBranch, GitHubTag, GitHubCommit, GitHubOrg, GitHubCodeResult, GitHubUserSearchResult, GitHubIssue, GitHubPullRequest } from "@github-cn/shared";

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
    if (!token) {
      const err = new Error("GitHub API 限速中，请稍后重试");
      (err as any).statusCode = 429;
      throw err;
    }
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      ...(options?.headers as Record<string, string>),
    };
    headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`https://api.github.com${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      this.updateRateLimit(token, res.headers);

      if (res.status === 403) {
        const remaining = res.headers.get("X-RateLimit-Remaining");
        if (remaining === "0") {
          throw new Error("GitHub API 限速，请稍后重试");
        }
        throw new Error("GitHub API 访问被拒绝，可能是权限不足");
      }
      if (res.status === 404) {
        throw new Error("资源不存在");
      }
      if (!res.ok) {
        throw new Error(`GitHub API 请求失败: ${res.status}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async searchRepos(query: string, page: number = 1, perPage: number = 30, sort?: string, order: string = "desc"): Promise<{
    repos: GitHubRepo[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const cacheKey = `search:${query}:${page}:${perPage}:${sort || "best"}:${order}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const sortParam = sort && sort !== "best-match" ? `&sort=${sort}&order=${order}` : "";
      const data = await this.request<GitHubSearchResult>(
        `/search/repositories?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}${sortParam}`
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

  async getReadme(owner: string, repo: string, ref?: string): Promise<string | null> {
    const cacheKey = `readme:${owner}/${repo}:${ref || ""}`;
    return getWithCache(cacheKey, CACHE_TTL.readme, async () => {
      try {
        const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
        const data = await this.request<GitHubContent>(
          `/repos/${owner}/${repo}/readme${refParam}`,
          { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        if (data.content && data.encoding === "base64") {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
        return null;
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return null;
      }
    });
  }

  async getReleases(owner: string, repo: string, page: number = 1): Promise<GitHubRelease[]> {
    const cacheKey = `releases:${owner}/${repo}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request<GitHubRelease[]>(
          `/repos/${owner}/${repo}/releases?page=${page}&per_page=10`
        );
      } catch (e) {
        console.error('GitHub API call failed:', e);
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

  async getSuggestions(query: string): Promise<string[]> {
    const cacheKey = `suggest:${query}`;
    return getWithCache(cacheKey, CACHE_TTL.suggest, async () => {
      try {
        const data = await this.request<GitHubSearchResult>(
          `/search/repositories?q=${encodeURIComponent(query)}&per_page=6`
        );
        return data.items.map((item) => item.full_name);
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return [];
      }
    });
  }

  async searchUsers(query: string, page: number = 1, perPage: number = 30): Promise<{
    users: GitHubUser[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const cacheKey = `search-users:${query}:${page}:${perPage}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const data = await this.request<GitHubUserSearchResult>(
        `/search/users?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
      );
      return {
        users: data.items,
        total_count: data.total_count,
        page,
        per_page: perPage,
        has_more: page * perPage < data.total_count,
      };
    });
  }

  async searchCode(query: string, page: number = 1, perPage: number = 20): Promise<{
    items: GitHubCodeResult["items"];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
  }> {
    const cacheKey = `search-code:${query}:${page}:${perPage}`;
    return getWithCache(cacheKey, CACHE_TTL.search, async () => {
      const data = await this.request<GitHubCodeResult>(
        `/search/code?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`
      );
      return {
        items: data.items,
        total_count: data.total_count,
        page,
        per_page: perPage,
        has_more: page * perPage < data.total_count,
      };
    });
  }

  // 仓库目录内容
  async getContents(owner: string, repo: string, path: string = "", ref?: string): Promise<GitHubContent[]> {
    const cacheKey = `contents:${owner}/${repo}:${path}:${ref || ""}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      const pathPart = path ? `/${path}` : "";
      const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const data = await this.request<GitHubContent[] | GitHubContent>(
        `/repos/${owner}/${repo}/contents${pathPart}${refParam}`
      );
      return Array.isArray(data) ? data : [data];
    });
  }

  // 单个文件内容
  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<GitHubContent> {
    const cacheKey = `file:${owner}/${repo}:${path}:${ref || ""}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      const refParam = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      return this.request<GitHubContent>(
        `/repos/${owner}/${repo}/contents/${encodedPath}${refParam}`
      );
    });
  }

  // 语言分布
  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    const cacheKey = `languages:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      return this.request<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
    });
  }

  // 贡献者
  async getContributors(owner: string, repo: string): Promise<GitHubContributor[]> {
    const cacheKey = `contributors:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request<GitHubContributor[]>(`/repos/${owner}/${repo}/contributors?per_page=20`);
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return [];
      }
    });
  }

  // 分支列表
  async getBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    const cacheKey = `branches:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request<GitHubBranch[]>(`/repos/${owner}/${repo}/branches?per_page=100`);
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return [];
      }
    });
  }

  // 标签列表
  async getTags(owner: string, repo: string): Promise<GitHubTag[]> {
    const cacheKey = `tags:${owner}/${repo}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        return this.request<GitHubTag[]>(`/repos/${owner}/${repo}/tags?per_page=20`);
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return [];
      }
    });
  }

  // Commit 历史
  async getCommits(owner: string, repo: string, sha?: string, page: number = 1): Promise<GitHubCommit[]> {
    const cacheKey = `commits:${owner}/${repo}:${sha || ""}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        const shaParam = sha ? `&sha=${encodeURIComponent(sha)}` : "";
        return this.request<GitHubCommit[]>(`/repos/${owner}/${repo}/commits?per_page=10&page=${page}${shaParam}`);
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return [];
      }
    });
  }

  // 用户组织
  async getUserOrgs(username: string): Promise<GitHubOrg[]> {
    const cacheKey = `user-orgs:${username}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      try {
        return this.request<GitHubOrg[]>(`/users/${username}/orgs`);
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return [];
      }
    });
  }

  // 用户仓库（支持分页+排序）
  async getUserReposPaged(username: string, page: number = 1, sort: string = "stars"): Promise<{
    repos: GitHubRepo[];
    page: number;
    has_more: boolean;
  }> {
    const cacheKey = `user-repos:${username}:${page}:${sort}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      const sortMap: Record<string, string> = {
        stars: "stargazers_count",
        updated: "updated_at",
        push: "pushed_at",
        name: "full_name",
      };
      const sortField = sortMap[sort] || "stargazers_count";
      const data = await this.request<GitHubRepo[]>(
        `/users/${username}/repos?page=${page}&per_page=30&sort=${sortField}&direction=desc`
      );
      return {
        repos: data,
        page,
        has_more: data.length === 30,
      };
    });
  }

  // 用户 Starred 仓库
  async getUserStarred(username: string, page: number = 1): Promise<{
    repos: GitHubRepo[];
    page: number;
    has_more: boolean;
  }> {
    const cacheKey = `user-starred:${username}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.user, async () => {
      try {
        const data = await this.request<GitHubRepo[]>(
          `/users/${username}/starred?page=${page}&per_page=30`
        );
        return { repos: data, page, has_more: data.length === 30 };
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return { repos: [], page, has_more: false };
      }
    });
  }

  // Issues 列表
  async getIssues(owner: string, repo: string, state: string = "open", page: number = 1): Promise<{
    items: GitHubIssue[];
    has_more: boolean;
  }> {
    const cacheKey = `issues:${owner}/${repo}:${state}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        const data = await this.request<GitHubIssue[]>(
          `/repos/${owner}/${repo}/issues?state=${state}&sort=created&direction=desc&page=${page}&per_page=30`
        );
        const items = data.filter(i => !i.pull_request).slice(0, 25);
        return { items, has_more: data.length === 30 };
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return { items: [], has_more: false };
      }
    });
  }

  // Pull Requests 列表
  async getPulls(owner: string, repo: string, state: string = "open", page: number = 1): Promise<{
    items: GitHubPullRequest[];
    has_more: boolean;
  }> {
    const cacheKey = `pulls:${owner}/${repo}:${state}:${page}`;
    return getWithCache(cacheKey, CACHE_TTL.repo, async () => {
      try {
        const data = await this.request<GitHubPullRequest[]>(
          `/repos/${owner}/${repo}/pulls?state=${state}&sort=created&direction=desc&page=${page}&per_page=25`
        );
        return { items: data, has_more: data.length === 25 };
      } catch (e) {
        console.error('GitHub API call failed:', e);
        return { items: [], has_more: false };
      }
    });
  }
}

export const githubService = new GitHubService();
