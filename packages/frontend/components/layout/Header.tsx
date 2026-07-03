"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, Menu, X, Search, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-black/15 isolation-isolate border border-slate-200"
            style={{ background: "linear-gradient(135deg, #1e293b 50%, #3b82f6 50%)" }}
          >
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-slate-900 text-lg sm:text-xl tracking-tight leading-tight">
            GitHub 中文
          </h1>
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">首页</Link>
          <Link href="/search" className="hover:text-slate-900 transition-colors flex items-center gap-1">
            <Search className="w-3.5 h-3.5" />搜索
          </Link>
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <Link href="/profile" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors">
              <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                {(user.nickname || user.email)[0].toUpperCase()}
              </div>
              {user.nickname || "个人中心"}
            </Link>
          ) : (
            <Link href="/auth" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors">
              <User className="w-3.5 h-3.5" /> 登录
            </Link>
          )}
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 text-slate-500 hover:text-slate-900 transition-colors" aria-label="菜单">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="sm:hidden border-t border-slate-100 px-4 py-3 space-y-2">
          <Link href="/" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">首页</Link>
          <Link href="/search" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">搜索</Link>
          {user ? (
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              {user.nickname || "个人中心"}
            </Link>
          ) : (
            <Link href="/auth" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">登录 / 注册</Link>
          )}
        </nav>
      )}
    </header>
  );
}
