export default function ReportNewLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <div className="h-7 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
                <div className="h-32 w-full animate-pulse rounded-md bg-zinc-200" />
              </div>
            ))}
            <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
