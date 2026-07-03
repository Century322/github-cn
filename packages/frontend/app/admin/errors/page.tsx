export default function AdminErrorsPage() {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-800 mb-4">错误日志</h2>
      <p className="text-sm text-slate-400 text-center py-8">接入 PostgreSQL 后可查看错误日志</p>
    </div>
  );
}
