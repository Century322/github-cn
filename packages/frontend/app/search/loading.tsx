export default function SearchLoading() {
  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(9)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 skeleton-shimmer rounded-xl" />
              <div className="flex-1 space-y-2 mt-1">
                <div className="h-4 skeleton-shimmer rounded-md w-3/4" />
                <div className="h-3 skeleton-shimmer rounded-md w-1/2" />
              </div>
            </div>
            <div className="h-10 skeleton-shimmer rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
