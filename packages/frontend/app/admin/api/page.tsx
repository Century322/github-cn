export default function AdminApiPage() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-800 mb-4">API 监控</h2>
      <p className="text-sm text-slate-400 text-center py-8">接入 Redis 和 PostgreSQL 后可查看 API 请求量、响应时间、GitHub 限速状态等数据</p>
    </div>
  );
}
