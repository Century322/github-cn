export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  default_branch: string;
  size: number;
  watchers_count: number;
  subscribers_count: number;
  archived: boolean;
  disabled: boolean;
  homepage: string | null;
  private: boolean;
  parent: {
    full_name: string;
    html_url: string;
  } | null;
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubReleaseAsset[];
  zipball_url: string;
  tarball_url: string;
}

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  download_url: string | null;
  type: "file" | "dir" | "symlink" | "submodule";
  content: string | null;
  encoding: string | null;
}

export interface GitHubContributor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  html_url: string;
}

export interface GitHubOrg {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  description: string | null;
}

export interface GitHubCodeResult {
  total_count: number;
  incomplete_results: boolean;
  items: {
    name: string;
    path: string;
    html_url: string;
    repository: GitHubRepo;
    score: number;
  }[];
}

export interface GitHubUserSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubUser[];
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  labels: {
    id: number;
    name: string;
    color: string;
  }[];
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: {
    url: string;
    html_url: string;
  };
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  draft: boolean;
}
