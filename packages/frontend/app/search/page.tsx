"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, HelpCircle, GitBranch, User, Code, SlidersHorizontal, X } from "lucide-react";
import { proxyAvatar } from "@/lib/api";
import SearchBox from "@/components/search/SearchBox";
import RepoCard from "@/components/repo/RepoCard";
import { formatNumber, LANGUAGE_COLORS, POPULAR_LANGUAGES } from "@github-cn/shared";
import type { GitHubRepo, GitHubUser } from "@github-cn/shared";
import Link from "next/link";

type SearchType = "repos" | "users" | "code";
type SortOption = "best-match" | "stars" | "forks" | "updated";
type OrderOption = "desc" | "asc";

interface CodeResult {
  name: string;
  path: string;
  html_url: string;
  repository: GitHubRepo;
}

const SEARCH_TABS: { type: SearchType; label: string; icon: typeof GitBranch }[] = [
  { type: "repos", label: "仓库", icon: GitBranch },
  { type: "users", label: "用户", icon: User },
  { type: "code", label: "代码", icon: Code },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "best-match", label: "最佳匹配" },
  { value: "stars", label: "最多 Star" },
  { value: "forks", label: "最多 Fork" },
  { value: "updated", label: "最近更新" },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [searchType, setSearchType] = useState<SearchType>("repos");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [users, setUsers] = useState<GitHubUser[]>([]);
  const [codeResults, setCodeResults] = useState<CodeResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<SortOption>("best-match");
  const [order, setOrder] = useState<OrderOption>("desc");
  const [language, setLanguage] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 30;

  useEffect(() => {
    const typeParam = searchParams.get("type") as SearchType | null;
    if (typeParam && ["repos", "users", "code"].includes(typeParam)) {
      setSearchType(typeParam);
    }
    const sortParam = searchParams.get("sort") as SortOption | null;
    if (sortParam && SORT_OPTIONS.some((s) => s.value === sortParam)) {
      setSort(sortParam);
    }
    const orderParam = searchParams.get("order") as OrderOption | null;
    if (orderParam && ["desc", "asc"].includes(orderParam)) {
      setOrder(orderParam);
    }
    const langParam = searchParams.get("lang") || "";
    setLanguage(langParam);
  }, [searchParams]);

  useEffect(() => {
    if (!query) return;

    async function fetchResults() {
      setLoading(true);
      setError(null);
      // 清空当前类型的结果
      if (searchType === "repos") setRepos([]);
      else if (searchType === "users") setUsers([]);
      else setCodeResults([]);

      try {
        let url: string;
        if (searchType === "repos") {
          let q = query;
          if (language) q += ` language:${language}`;
          const sortParam = sort !== "best-match" ? `&sort=${sort}&order=${order}` : "";
          url = `/api/search/repos?q=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}${sortParam}`;
        } else if (searchType === "users") {
          url = `/api/search/users?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        } else {
          url = `/api/search/code?q=${encodeURIComponent(query)}&page=${page}&per_page=20`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("搜索请求失败");
        const data = await res.json();

        if (searchType === "repos") {
          setRepos(data.repos);
        } else if (searchType === "users") {
          setUsers(data.users);
        } else {
          setCodeResults(data.items);
        }
        setTotalCount(data.total_count);
        setHasMore(data.has_more);
      } catch {
        setError("搜索失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query, page, searchType, sort, order, language]);

  const buildUrl = (overrides: { page?: number; type?: SearchType; sort?: SortOption; lang?: string } = {}) => {
    const p = overrides.page ?? page;
    const t = overrides.type ?? searchType;
    const s = overrides.sort ?? sort;
    const l = overrides.lang ?? language;
    let url = `/search?q=${encodeURIComponent(query)}&page=${p}&type=${t}`;
    if (s !== "best-match") url += `&sort=${s}&order=${order}`;
    if (l) url += `&lang=${encodeURIComponent(l)}`;
    return url;
  };

  const currentResultCount = searchType === "repos" ? repos.length : searchType === "users" ? users.length : codeResults.length;

  return (
    <>
      <section className="bg-white border-b border-slate-100/80 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <SearchBox initialValue={query} />
        </div>
      </section>

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
            <p className="text-slate-500 text-sm">搜索 GitHub 上的仓库、用户、代码</p>
          </div>
        ) : (
          <>
            {/* Search Type Tabs */}
            <div className="flex items-center gap-2 mb-4">
              {SEARCH_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = searchType === tab.type;
                return (
                  <Link key={tab.type} href={buildUrl({ type: tab.type, page: 1 })}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? "bg-blue-600 text-white shadow-xs" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}>
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Link>
                );
              })}
              <span className="ml-auto text-xs text-slate-400">
                共 {totalCount.toLocaleString()} 个结果
              </span>
            </div>

            {/* Filters Row (repos only) */}
            {searchType === "repos" && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <button onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    showFilters || language ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  筛选
                  {language && <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setLanguage(""); }} />}
                </button>

                {/* Sort */}
                <div className="flex items-center gap-1">
                  {SORT_OPTIONS.map((s) => (
                    <Link key={s.value} href={buildUrl({ sort: s.value, page: 1 })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        sort === s.value ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}>
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Language Filter Panel */}
            {showFilters && searchType === "repos" && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-xs">
                <h4 className="text-xs font-bold text-slate-700 mb-3">编程语言</h4>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={buildUrl({ lang: "", page: 1 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !language ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}>
                    全部
                  </Link>
                  {POPULAR_LANGUAGES.map((lang) => (
                    <Link key={lang} href={buildUrl({ lang: lang.toLowerCase(), page: 1 })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        language === lang.toLowerCase() ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[lang] || "#94a3b8" }} />
                      {lang}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {searchType === "repos" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {repos.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} />
                ))}
              </div>
            )}

            {searchType === "users" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {users.map((user) => (
                  <Link key={user.id} href={`/user/${user.login}`} className="group block">
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-lg hover:border-blue-100 transition-all duration-300 flex items-start gap-4">
                      <img src={proxyAvatar(user.avatar_url)} alt={user.login} className="w-14 h-14 rounded-2xl border border-slate-100" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 text-[15px] group-hover:text-blue-600 transition-colors truncate">
                          {user.login}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">@{user.login}</p>
                        {user.bio && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{user.bio}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                          {user.followers != null && <span>{formatNumber(user.followers)} 关注者</span>}
                          {user.public_repos != null && <span>{user.public_repos} 仓库</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {searchType === "code" && (
              <div className="space-y-3">
                {codeResults.map((item, idx) => {
                  const fileUrl = `/repo/${item.repository.full_name}/blob/${item.repository.default_branch || "main"}/${item.path}`;
                  return (
                    <Link key={`${item.repository.id}-${idx}`} href={fileUrl} className="group block">
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-2">
                          <img src={proxyAvatar(item.repository.owner.avatar_url)} alt={item.repository.owner.login} className="w-7 h-7 rounded-lg border border-slate-100" />
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{item.repository.full_name}</span>
                          <span className="text-xs text-slate-400">/ {item.path}</span>
                        </div>
                        <a href={item.html_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-500 hover:underline">在 GitHub 查看代码</a>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {currentResultCount === 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
                <h3 className="font-bold text-slate-800 text-lg mb-2">没有找到匹配的结果</h3>
                <p className="text-slate-500 text-sm">尝试其他关键词或搜索类型</p>
              </div>
            )}

            {/* Pagination */}
            {currentResultCount > 0 && (
              <div className="flex justify-center items-center gap-3 mt-8">
                {page > 1 && (
                  <Link href={buildUrl({ page: page - 1 })}
                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-colors">
                    上一页
                  </Link>
                )}
                <span className="text-xs text-slate-400">第 {page} 页</span>
                {hasMore && (
                  <Link href={buildUrl({ page: page + 1 })}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs">
                    下一页
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
