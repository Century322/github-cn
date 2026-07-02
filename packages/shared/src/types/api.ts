import type { GitHubRepo, GitHubUser, GitHubRelease } from "./github";

export interface SearchResult {
  repos: GitHubRepo[];
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

export interface RepoDetail extends GitHubRepo {
  readme: string | null;
  releases: GitHubRelease[];
}

export interface AdminStatsOverview {
  pv_today: number;
  uv_today: number;
  search_count_today: number;
  download_count_today: number;
  pv_trend: { date: string; count: number }[];
  uv_trend: { date: string; count: number }[];
}

export interface HotKeyword {
  query: string;
  count: number;
}

export interface HotRepo {
  full_name: string;
  count: number;
}
