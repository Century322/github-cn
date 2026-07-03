"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { Mail, Star, Clock, LogOut, Settings, Loader2, Trash2, Heart } from "lucide-react";
import { formatDate } from "@github-cn/shared";

export default function ProfilePage() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"favorites" | "history">("favorites");
  const [favorites, setFavorites] = useState<{ repo_full_name: string; created_at: string }[]>([]);
  const [history, setHistory] = useState<{ repo_full_name: string; visited_at: string }[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const res = await fetch("/api/auth/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFavorites(await res.json());
    } catch { /* ignore */ }
    setDataLoading(false);
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const res = await fetch("/api/auth/history?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
    setDataLoading(false);
  }, [token]);

  useEffect(() => {
    if (tab === "favorites") fetchFavorites();
    else fetchHistory();
  }, [tab, fetchFavorites, fetchHistory]);

  const removeFavorite = async (repoFullName: string) => {
    if (!token) return;
    await fetch(`/api/auth/favorites/${encodeURIComponent(repoFullName)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setFavorites((prev) => prev.filter((f) => f.repo_full_name !== repoFullName));
  };

  const clearHistory = async () => {
    if (!token) return;
    await fetch("/api/auth/history", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setHistory([]);
  };

  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">请先登录</h2>
        <p className="text-sm text-slate-500 mb-6">登录后可以查看收藏和浏览历史</p>
        <Link href="/auth" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors">去登录</Link>
      </div>
    );
  }

  const currentList = tab === "favorites"
    ? favorites.map((f) => ({ repo_full_name: f.repo_full_name, date: f.created_at }))
    : history.map((h) => ({ repo_full_name: h.repo_full_name, date: h.visited_at }));

  return (
    <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User Info Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {(user.nickname || user.email)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-slate-800">{user.nickname || "用户"}</h1>
              <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </div>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab("favorites")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${tab === "favorites" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
          <Heart className="w-4 h-4" /> 收藏
        </button>
        <button onClick={() => setTab("history")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${tab === "history" ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
          <Clock className="w-4 h-4" /> 历史
        </button>
        {tab === "history" && history.length > 0 && (
          <button onClick={clearHistory} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" /> 清空
          </button>
        )}
      </div>

      {/* Content */}
      {dataLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : currentList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-400">{tab === "favorites" ? "还没有收藏的项目" : "还没有浏览记录"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentList.map((item) => (
            <div key={item.repo_full_name} className="group flex items-center justify-between bg-white rounded-xl border border-slate-100 p-3.5 hover:border-blue-100 transition-colors">
              <Link href={`/repo/${item.repo_full_name}`} className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{item.repo_full_name}</span>
                <span className="text-xs text-slate-300 ml-2">{formatDate(item.date)}</span>
              </Link>
              {tab === "favorites" && (
                <button onClick={() => removeFavorite(item.repo_full_name)} className="text-slate-300 hover:text-red-400 transition-colors ml-2" title="取消收藏">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
