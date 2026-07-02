export default function RepoLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 space-y-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 skeleton-shimmer rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton-shimmer rounded-md w-24" />
            <div className="h-7 skeleton-shimmer rounded-md w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100/50 h-20 skeleton-shimmer" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 h-96 skeleton-shimmer" />
        </div>
        <div className="lg:col-span-5 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 h-32 skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}
