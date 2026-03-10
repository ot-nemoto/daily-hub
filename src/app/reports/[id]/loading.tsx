export default function ReportDetailLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        {/* Report content skeleton */}
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-200" />
              <div className="h-6 w-40 animate-pulse rounded bg-zinc-200" />
            </div>
            <div className="h-8 w-12 animate-pulse rounded-md bg-zinc-200" />
          </div>
          <div className="space-y-6">
            <div>
              <div className="mb-1.5 h-3 w-24 animate-pulse rounded bg-zinc-200" />
              <div className="space-y-1">
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-200" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 h-3 w-16 animate-pulse rounded bg-zinc-200" />
              <div className="space-y-1">
                <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Comments skeleton */}
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="mb-4 h-5 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-md bg-zinc-50 px-4 py-3">
                <div className="mb-2 h-3 w-20 animate-pulse rounded bg-zinc-200" />
                <div className="space-y-1">
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
