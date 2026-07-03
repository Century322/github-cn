"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import type { HotKeyword } from "@github-cn/shared";
import { useAdminAuth } from "../layout";

export default function AdminSearchPage() {
  const [keywords, setKeywords] = useState<HotKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAdminAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/stats/keywords", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setKeywords(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-800 mb-4">搜索统计</h2>
      {keywords.length > 0 ? (
        <div className="space-y-2">
          {keywords.map((kw, idx) => (
            <div key={kw.query} className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-6">{idx + 1}</span>
                <Search className="w-4 h-4 text-slate-400" />
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
  );
}
