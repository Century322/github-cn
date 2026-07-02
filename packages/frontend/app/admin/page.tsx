"use client";

import { useState, useEffect } from "react";
import { Eye, Search, Download, TrendingUp, Loader2, Lock } from "lucide-react";

interface StatsOverview {
  pv_today: number;
  uv_today: number;
  search_count_today: number;
  download_count_today: number;
  top_searches: { query: string; count: number }[];
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      setAuthed(true);
    }
  };

  useEffect(() => {
    if (!authed) return;

    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/stats/overview", {
          headers: { Authorization: `Bearer ${password}` },
        });
        if (!res.ok) {
          setAuthError("认证失败");
          setAuthed(false);
          return;
        }
        const data = await res.json();
        setStats(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [authed, password]);

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-20 px-4">
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xs text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-xl text-slate-800 mb-2">后台管理</h1>
          <p className="text-sm text-slate-400 mb-6">请输入管理密码以访问</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setAuthError(""); }}
              placeholder="管理密码"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-display font-bold text-2xl text-slate-800 mb-8">后台管理</h1>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">PV 今日</span>
              </div>
              <span className="font-display font-bold text-2xl text-slate-800">{stats.pv_today.toLocaleString()}</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">搜索次数</span>
              </div>
              <span className="font-display font-bold text-2xl text-slate-800">{stats.search_count_today.toLocaleString()}</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-purple-500" />
                <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">下载次数</span>
              </div>
              <span className="font-display font-bold text-2xl text-slate-800">{stats.download_count_today.toLocaleString()}</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-amber-500" />
                <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">UV 今日</span>
              </div>
              <span className="font-display font-bold text-2xl text-slate-800">{stats.uv_today.toLocaleString()}</span>
            </div>
          </div>

          {/* Hot Keywords */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800 mb-4">热门搜索关键词</h2>
            {stats.top_searches.length > 0 ? (
              <div className="space-y-2">
                {stats.top_searches.map((kw, idx) => (
                  <div
                    key={kw.query}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}</span>
                      <span className="text-sm font-medium text-slate-700">{kw.query}</span>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      {kw.count} 次
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">暂无搜索数据</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
