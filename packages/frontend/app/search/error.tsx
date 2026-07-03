"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">搜索出错</h2>
      <p className="text-sm text-slate-500 mb-6">搜索请求失败，请稍后重试</p>
      <div className="flex items-center justify-center gap-3">
        <button onClick={reset} className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors">
          重试
        </button>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors">
          返回首页
        </Link>
      </div>
    </div>
  );
}
