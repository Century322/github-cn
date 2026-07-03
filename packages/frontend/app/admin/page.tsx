"use client";

import { useState, useEffect } from "react";
import { Eye, Search, Download, TrendingUp, Loader2 } from "lucide-react";
import type { AdminStatsOverview } from "@github-cn/shared";
import { useAdminAuth } from "./layout";

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useAdminAuth();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats/overview", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-slate-400">暂无统计数据</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">PV 今日</span>
          </div>
          <span className="font-display font-bold text-2xl text-slate-800">{stats.pv_today.toLocaleString()}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">搜索次数</span>
          </div>
          <span className="font-display font-bold text-2xl text-slate-800">{stats.search_count_today.toLocaleString()}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">下载次数</span>
          </div>
          <span className="font-display font-bold text-2xl text-slate-800">{stats.download_count_today.toLocaleString()}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">UV 今日</span>
          </div>
          <span className="font-display font-bold text-2xl text-slate-800">{stats.uv_today.toLocaleString()}</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 mb-4">热门搜索 Top 10</h2>
        {stats.top_searches && stats.top_searches.length > 0 ? (
          <div className="space-y-2">
            {stats.top_searches.slice(0, 10).map((kw, idx) => (
              <div key={kw.query} className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{kw.query}</span>
                </div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{kw.count} 次</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">暂无搜索数据</p>
        )}
      </div>
    </div>
  );
}
