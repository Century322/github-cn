"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, GitFork, Clock, Loader2 } from "lucide-react";
import { formatNumber, formatDate, LANGUAGE_COLORS } from "@github-cn/shared";
import type { GitHubRepo } from "@github-cn/shared";

interface Props {
  username: string;
  initialRepos: GitHubRepo[];
  hasMore: boolean;
}

type SortType = "stars" | "updated" | "push" | "name";
type RepoTab = "repos" | "starred";

export default function UserPageClient({ username, initialRepos, hasMore: initialHasMore }: Props) {
  const [activeTab, setActiveTab] = useState<RepoTab>("repos");
  const [repos, setRepos] = useState<GitHubRepo[]>(initialRepos);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortType>("stars");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [starred, setStarred] = useState<GitHubRepo[] | null>(null);
  const [starredPage, setStarredPage] = useState(1);
  const [starredHasMore, setStarredHasMore] = useState(false);
  const [starredLoading, setStarredLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/${username}/repos?page=${nextPage}&sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setRepos((prev) => [...prev, ...data.repos]);
        setPage(nextPage);
        setHasMore(data.has_more);
      } else {
        setError("加载失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const changeSort = async (newSort: SortType) => {
    setSort(newSort);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/${username}/repos?page=1&sort=${newSort}`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos);
        setPage(1);
        setHasMore(data.has_more);
      } else {
        setError("加载失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const loadStarred = async (pageNum: number = 1) => {
    setStarredLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/${username}/starred?page=${pageNum}`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setStarred(data.repos || []);
        } else {
          setStarred(prev => prev ? [...prev, ...(data.repos || [])] : data.repos || []);
        }
        setStarredPage(pageNum);
        setStarredHasMore(data.has_more || false);
      } else {
        setError("加载 Starred 失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setStarredLoading(false);
    }
  };

  const handleTabChange = (tab: RepoTab) => {
    setActiveTab(tab);
    if (tab === "starred" && !starred) loadStarred(1);
  };

  const currentList = activeTab === "repos" ? repos : (starred || []);
  const currentHasMore = activeTab === "repos" ? hasMore : starredHasMore;
  const currentPage = activeTab === "repos" ? page : starredPage;
  const isLoading = activeTab === "repos" ? loading : starredLoading;

  return (
    <>
      {/* Tab + Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => handleTabChange("repos")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "repos" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
            仓库
          </button>
          <button onClick={() => handleTabChange("starred")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === "starred" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
            <Star className="w-3.5 h-3.5" /> Starred
          </button>
        </div>
        {activeTab === "repos" && (
          <div className="flex items-center gap-1">
            {([
              { value: "stars" as SortType, label: "Stars" },
              { value: "updated" as SortType, label: "更新" },
              { value: "name" as SortType, label: "名称" },
            ]).map((s) => (
              <button key={s.value} onClick={() => changeSort(s.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  sort === s.value ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      {isLoading && currentList.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {currentList.map((repo) => (
            <Link key={`${repo.id}-${repo.full_name}`} href={`/repo/${repo.full_name}`} className="group block">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 text-[15px] group-hover:text-blue-600 transition-colors truncate">{repo.name}</h3>
                    {repo.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{repo.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[repo.language] || "#94a3b8" }} />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3" /> {formatNumber(repo.stargazers_count)}</span>
                  <span className="flex items-center gap-0.5"><GitFork className="w-3 h-3" /> {formatNumber(repo.forks_count)}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {formatDate(repo.updated_at)}</span>
                  {repo.fork && <span className="text-amber-500 font-medium">Fork</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {currentHasMore && (
        <div className="flex justify-center mt-6">
          <button onClick={() => {
            if (activeTab === "repos") loadMore();
            else loadStarred(starredPage + 1);
          }} disabled={isLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            加载更多
          </button>
        </div>
      )}
    </>
  );
}
