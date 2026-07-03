export default function UserLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
            <div className="w-24 h-24 skeleton-shimmer rounded-2xl mb-4" />
            <div className="h-6 skeleton-shimmer rounded-lg w-2/3 mb-2" />
            <div className="h-4 skeleton-shimmer rounded-lg w-1/2 mb-4" />
            <div className="h-4 skeleton-shimmer rounded-lg w-full mb-2" />
            <div className="h-4 skeleton-shimmer rounded-lg w-3/4" />
          </div>
        </div>
        <div className="lg:col-span-8 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <div className="h-5 skeleton-shimmer rounded-lg w-1/3 mb-2" />
              <div className="h-4 skeleton-shimmer rounded-lg w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
