export default function AdminUsersLoading() {
  return (
    <div className="bg-zinc-50 py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <div className="h-7 w-32 animate-pulse rounded bg-zinc-200" />
        <div className="rounded-lg bg-white shadow-sm">
          {/* Table header skeleton */}
          <div className="flex gap-4 border-b border-zinc-100 px-6 py-3">
            {["w-40", "w-48", "w-32", "w-20", "w-24"].map((w) => (
              <div key={w} className={`h-4 ${w} animate-pulse rounded bg-zinc-200`} />
            ))}
          </div>
          {/* Row skeletons */}
          {[...Array(6)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
            <div key={i} className="flex items-center gap-4 border-b border-zinc-50 px-6 py-4">
              <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-200" />
              <div className="h-5 w-10 animate-pulse rounded-full bg-zinc-200" />
              <div className="ml-auto h-7 w-16 animate-pulse rounded-md bg-zinc-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
