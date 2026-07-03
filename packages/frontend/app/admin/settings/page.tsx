"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useAdminAuth } from "../layout";

interface TokenStatus {
  configured: boolean;
  count: number;
}

interface HealthStatus {
  status: string;
  timestamp: number;
}

export default function AdminSettingsPage() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const token = useAdminAuth();

  useEffect(() => {
    async function fetchData() {
      try {
        const [tokenRes, healthRes] = await Promise.all([
          fetch("/api/admin/stats/overview", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/health"),
        ]);
        if (tokenRes.ok) setTokenStatus({ configured: true, count: 1 });
        else setTokenStatus({ configured: false, count: 0 });
        if (healthRes.ok) {
          const data = await healthRes.json();
          setHealthStatus(data);
        }
      } catch {
        setTokenStatus({ configured: false, count: 0 });
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
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> 系统设置
        </h2>
        <div className="space-y-4">
          <div className="px-4 py-3 bg-slate-50 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">服务状态</div>
              <p className="text-xs text-slate-400 mt-0.5">后端 API 运行状态</p>
            </div>
            {healthStatus?.status === "ok" ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle className="w-4 h-4" /> 正常</span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><XCircle className="w-4 h-4" /> 异常</span>
            )}
          </div>
          <div className="px-4 py-3 bg-slate-50 rounded-xl">
            <div className="text-sm font-medium text-slate-700">GitHub Token</div>
            <p className="text-xs text-slate-400 mt-1">通过环境变量 GITHUB_TOKENS 配置，支持多个 Token 逗号分隔。Token 认证后可提高 API 限额至 5000次/小时。</p>
          </div>
          <div className="px-4 py-3 bg-slate-50 rounded-xl">
            <div className="text-sm font-medium text-slate-700">管理密码</div>
            <p className="text-xs text-slate-400 mt-1">通过环境变量 ADMIN_PASSWORD 配置，默认值 admin</p>
          </div>
          <div className="px-4 py-3 bg-slate-50 rounded-xl">
            <div className="text-sm font-medium text-slate-700">缓存配置</div>
            <p className="text-xs text-slate-400 mt-1">当前使用内存缓存（最多 2000 条），接入 Redis 后可持久化和跨实例共享</p>
          </div>
          <div className="px-4 py-3 bg-slate-50 rounded-xl">
            <div className="text-sm font-medium text-slate-700">数据库</div>
            <p className="text-xs text-slate-400 mt-1">当前统计数据为内存态，服务重启后清零。接入 PostgreSQL 后可持久化</p>
          </div>
        </div>
      </div>
    </div>
  );
}
