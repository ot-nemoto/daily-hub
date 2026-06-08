"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  from: string;
  to: string;
};

export function StatusFilter({ from, to }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo) return;
    startTransition(() => {
      router.push(`/reports/status?from=${nextFrom}&to=${nextTo}`);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="from-date" className="text-sm text-zinc-600">
          開始
        </label>
        <input
          id="from-date"
          type="date"
          value={from}
          max={to}
          onChange={(e) => handleChange(e.target.value, to)}
          className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>
      <span className="text-sm text-zinc-400">〜</span>
      <div className="flex items-center gap-2">
        <label htmlFor="to-date" className="text-sm text-zinc-600">
          終了
        </label>
        <input
          id="to-date"
          type="date"
          value={to}
          min={from}
          onChange={(e) => handleChange(from, e.target.value)}
          className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>
      {isPending && (
        <span className="text-xs text-zinc-400">読み込み中...</span>
      )}
    </div>
  );
}
