"use client";

import { SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
        <SearchX className="w-8 h-8" />
      </div>
      <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">页面未找到</h2>
      <p className="text-sm text-slate-500 mb-6">你访问的页面不存在</p>
      <Link
        href="/"
        className="inline-flex px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        返回首页
      </Link>
    </div>
  );
}
