"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type Period = "1w" | "2w" | "1m" | "1.5m" | "2m" | "3m";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "1w", label: "1W" },
  { key: "2w", label: "2W" },
  { key: "1m", label: "1M" },
  { key: "1.5m", label: "1.5M" },
  { key: "2m", label: "2M" },
  { key: "3m", label: "3M" },
];

type Props = {
  base: string;
  period: Period;
};

export function StatusFilter({ base, period }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(nextBase: string, nextPeriod: Period) {
    startTransition(() => {
      router.push(`/reports/status?base=${nextBase}&period=${nextPeriod}`);
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      {/* 基準日 */}
      <div className="flex items-center gap-2">
        <label htmlFor="base-date" className="text-sm text-zinc-600">
          日付
        </label>
        <input
          id="base-date"
          type="date"
          value={base}
          onChange={(e) => {
            if (e.target.value) navigate(e.target.value, period);
          }}
          className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* 期間ボタン */}
      <div className="flex items-center gap-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => navigate(base, p.key)}
            className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              p.key === period
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isPending && <span className="text-xs text-zinc-400">読み込み中...</span>}
    </div>
  );
}
