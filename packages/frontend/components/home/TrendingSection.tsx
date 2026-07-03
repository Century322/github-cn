"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, Loader2, ArrowRight } from "lucide-react";
import { POPULAR_LANGUAGES, TRENDING_SINCE_OPTIONS } from "@github-cn/shared";
import type { TrendingRepo } from "@github-cn/shared";
import RepoCard from "@/components/repo/RepoCard";
import type { GitHubRepo } from "@github-cn/shared";

function trendingToRepo(t: TrendingRepo): GitHubRepo {
  return {
    id: 0,
    name: t.name,
    full_name: t.full_name,
    owner: { login: t.owner.login, avatar_url: t.owner.avatar_url, html_url: `https://github.com/${t.owner.login}` },
    html_url: t.html_url,
    description: t.description,
    fork: false,
    stargazers_count: t.stars,
    forks_count: t.forks,
    open_issues_count: 0,
    language: t.language,
    license: null,
    topics: [],
    created_at: "",
    updated_at: "",
    pushed_at: null,
    default_branch: "main",
    size: 0,
    watchers_count: 0,
    subscribers_count: 0,
    archived: false,
    disabled: false,
    homepage: null,
    private: false,
    parent: null,
  };
}

export default function TrendingSection() {
  const [language, setLanguage] = useState("All");
  const [since, setSince] = useState<"daily" | "weekly" | "monthly">("daily");
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);
      setError(null);
      try {
        const lang = language === "All" ? "" : language;
        const res = await fetch(`/api/trending?language=${encodeURIComponent(lang)}&since=${since}`);
        if (!res.ok) throw new Error("获取热门项目失败");
        const data = await res.json();
        setRepos(data);
      } catch {
        setError("获取热门项目失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, [language, since]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">热门项目</h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {TRENDING_SINCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSince(opt.value as typeof since)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  since === opt.value
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="编程语言筛选"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">全部语言</option>
            {POPULAR_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

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
              <div className="h-8 skeleton-shimmer rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50/75 border border-red-100 rounded-3xl p-8 text-center">
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : repos.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center">
          <p className="text-sm text-slate-400">暂无热门项目数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {repos.slice(0, 9).map((repo) => (
            <RepoCard key={repo.full_name} repo={trendingToRepo(repo)} />
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/search?sort=stars&order=desc"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-colors">
          查看更多热门项目 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
