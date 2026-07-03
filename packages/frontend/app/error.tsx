"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">出了点问题</h2>
      <p className="text-sm text-slate-500 mb-6">页面加载时发生了错误</p>
      <button onClick={reset} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors">
        重试
      </button>
    </div>
  );
}
