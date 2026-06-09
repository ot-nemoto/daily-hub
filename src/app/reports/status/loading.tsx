export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-32 rounded bg-zinc-200" />
        <div className="h-64 rounded-lg bg-zinc-100" />
      </div>
    </main>
  );
}
