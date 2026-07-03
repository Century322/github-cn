"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Download, AlertCircle, Settings, Lock, BarChart3, Loader2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/search", label: "搜索统计", icon: Search },
  { href: "/admin/downloads", label: "下载统计", icon: Download },
  { href: "/admin/api", label: "API 监控", icon: BarChart3 },
  { href: "/admin/errors", label: "错误日志", icon: AlertCircle },
  { href: "/admin/settings", label: "设置", icon: Settings },
];

const AdminAuthContext = createContext<string>("");

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats/overview", {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setError("密码错误");
      }
    } catch {
      setError("验证失败，请重试");
    } finally {
      setLoading(false);
    }
  };

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
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="管理密码"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={password}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-display font-bold text-2xl text-slate-800 mb-6">后台管理</h1>
        <div className="flex flex-col md:flex-row gap-6">
          <nav className="md:w-52 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-xs sticky top-24">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </AdminAuthContext.Provider>
  );
}
