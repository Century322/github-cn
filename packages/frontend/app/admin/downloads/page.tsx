"use client";

import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { useAdminAuth } from "../layout";

interface DownloadStat {
  key: string;
  count: number;
}

export default function AdminDownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadStat[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAdminAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/download/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDownloads(data);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-800 mb-4">下载统计</h2>
      {downloads.length > 0 ? (
        <div className="space-y-2">
          {downloads.sort((a, b) => b.count - a.count).map((dl) => (
            <div key={dl.key} className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">{dl.key}</span>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{dl.count} 次</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-8">暂无下载数据</p>
      )}
    </div>
  );
}
