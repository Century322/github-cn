export default function BlobLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-16 skeleton-shimmer rounded" />
        <div className="h-4 w-20 skeleton-shimmer rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="p-3 bg-slate-50/70 border-b border-slate-100">
          <div className="h-4 w-48 skeleton-shimmer rounded" />
        </div>
        <div className="p-4 space-y-2">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-8 skeleton-shimmer rounded shrink-0" />
              <div className="h-4 skeleton-shimmer rounded flex-1 max-w-[80%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
