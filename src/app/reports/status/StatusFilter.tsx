"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  formatDateLabel,
  PERIODS,
  type Period,
  periodStart,
  shiftPeriod,
} from "@/lib/statusPeriod";

/**
 * 終了日入力の下限。キーボードで年を打っている途中（例: 0002-08-01）は change が発火しても
 * `validity.rangeUnderflow` になるため、この値以上になるまで確定しない
 */
const MIN_BASE = "2000-01-01";

type Props = {
  /** 表示範囲の右端（YYYY-MM-DD） */
  base: string;
  period: Period;
  /** 今日（YYYY-MM-DD・UTC）。未来方向へのスライド上限に使う */
  today: string;
};

function label(ymd: string): string {
  return formatDateLabel(new Date(`${ymd}T00:00:00.000Z`));
}

/**
 * 期間指定 UI。「表示幅を選び、窓を前後にスライドさせる」モデルで見せる。
 * URL 契約は base（右端）＋ period のまま。
 */
export function StatusFilter({ base, period, today }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const prev = shiftPeriod(base, period, -1, today);
  const next = shiftPeriod(base, period, 1, today);
  const isLatest = next === null;
  const isToday = base === today;

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      try {
        inputRef.current?.showPicker?.();
      } catch {
        // ユーザー操作起因と見なされない環境では開けない（フォーカスのみで続行）
      }
    }
  }, [editing]);

  function navigate(nextBase: string, nextPeriod: Period) {
    startTransition(() => {
      router.push(`/reports/status?base=${nextBase}&period=${nextPeriod}`);
    });
  }

  /** 終了日入力を確定する。min〜max の範囲内で完全な日付のときだけ遷移し、それ以外は入力を維持する */
  function commitBase(input: HTMLInputElement) {
    if (!input.value || !input.validity.valid) return;
    setEditing(false);
    if (input.value !== base) navigate(input.value, period);
  }

  const navButtonClass =
    "cursor-pointer rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:cursor-default disabled:text-zinc-300 disabled:hover:bg-transparent";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      {/* 表示幅 */}
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

      {/* 表示範囲のスライド */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="前の期間"
          onClick={() => prev && navigate(prev, period)}
          className={navButtonClass}
        >
          ◀
        </button>
        {editing ? (
          <input
            ref={inputRef}
            id="base-date"
            type="date"
            aria-label="終了日"
            defaultValue={base}
            min={MIN_BASE}
            max={today}
            onChange={(e) => commitBase(e.currentTarget)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
              if (e.key === "Enter") commitBase(e.currentTarget);
            }}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            aria-label="表示範囲"
            title="クリックして終了日を指定"
            onClick={() => setEditing(true)}
            className="cursor-pointer rounded-md px-2 py-1 text-sm text-zinc-900 tabular-nums hover:bg-zinc-100"
          >
            {label(periodStart(base, period))} 〜 {label(base)}
          </button>
        )}
        <button
          type="button"
          aria-label="次の期間"
          disabled={isLatest}
          onClick={() => next && navigate(next, period)}
          className={navButtonClass}
        >
          ▶
        </button>
      </div>

      <button
        type="button"
        disabled={isToday}
        onClick={() => navigate(today, period)}
        className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:cursor-default disabled:border-zinc-200 disabled:text-zinc-300 disabled:hover:bg-transparent"
      >
        今日
      </button>

      {isPending && <span className="text-xs text-zinc-400">読み込み中...</span>}
    </div>
  );
}
