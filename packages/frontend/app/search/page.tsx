"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, HelpCircle } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import RepoCard from "@/components/repo/RepoCard";
import type { GitHubRepo, SearchResult } from "@github-cn/shared";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const perPage = 30;

  useEffect(() => {
    if (!query) return;

    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`);
        if (!res.ok) throw new Error("搜索请求失败");
        const data: SearchResult = await res.json();
        setRepos(data.repos);
        setTotalCount(data.total_count);
        setHasMore(data.has_more);
      } catch {
        setError("搜索失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query, page]);

  return (
    <>
      {/* Search Header */}
      <section className="bg-white border-b border-slate-100/80 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <SearchBox initialValue={query} />
        </div>
      </section>

      {/* Results */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(9)].map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 skeleton-shimmer rounded-xl" />
                  <div className="flex-1 space-y-2 mt-1">
                    <div className="h-4 skeleton-shimmer rounded-md w-3/4" />
                    <div className="h-3 skeleton-shimmer rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-10 skeleton-shimmer rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50/75 border border-red-100 rounded-3xl p-8 max-w-xl mx-auto text-center my-8">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">搜索出错</h3>
            <p className="text-slate-500 text-sm">{error}</p>
          </div>
        ) : !query ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">输入关键词开始搜索</h3>
            <p className="text-slate-500 text-sm">搜索 GitHub 上的开源项目、代码库</p>
          </div>
        ) : repos.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">没有找到匹配的仓库</h3>
            <p className="text-slate-500 text-sm mb-6">尝试其他关键词，或调整搜索条件</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                搜索结果: <span className="text-blue-600">&quot;{query}&quot;</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                找到 {totalCount.toLocaleString()} 个仓库，第 {page} 页
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {repos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-3 mt-8">
              {page > 1 && (
                <a
                  href={`/search?q=${encodeURIComponent(query)}&page=${page - 1}`}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  上一页
                </a>
              )}
              {hasMore && (
                <a
                  href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
                >
                  下一页
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
