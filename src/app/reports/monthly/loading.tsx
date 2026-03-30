export default function MonthlyViewLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        {/* Filter skeleton */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 h-5 w-20 animate-pulse rounded bg-zinc-200" />
          <div className="flex flex-wrap gap-3">
            <div className="h-9 w-36 animate-pulse rounded-md bg-zinc-200" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-zinc-200" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-zinc-200" />
          </div>
        </div>

        {/* Report card skeletons */}
        {[...Array(4)].map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
          <div key={i} className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-200" />
              </div>
              <div className="flex gap-2">
                <div className="h-7 w-10 animate-pulse rounded-md bg-zinc-200" />
                <div className="h-7 w-10 animate-pulse rounded-md bg-zinc-200" />
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="mb-1 h-3 w-24 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
              </div>
              <div>
                <div className="mb-1 h-3 w-16 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-zinc-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
