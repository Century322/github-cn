import type { GitHubRepo, GitHubUser, GitHubRelease, GitHubCodeResult, GitHubUserSearchResult } from "./github";

export interface SearchResult {
  repos: GitHubRepo[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface UserSearchResult {
  users: GitHubUser[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface CodeSearchResult {
  items: GitHubCodeResult["items"];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface TrendingRepo {
  full_name: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  today_stars: number;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface AdminStatsOverview {
  pv_today: number;
  uv_today: number;
  search_count_today: number;
  download_count_today: number;
  top_searches: HotKeyword[];
}

export interface HotKeyword {
  query: string;
  count: number;
}
