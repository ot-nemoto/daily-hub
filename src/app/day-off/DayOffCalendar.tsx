"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { today } from "@/lib/dateUtils";
import { addDayOff, removeDayOff } from "./actions";

type Props = {
  dates: string[];
  targetUserId: string;
  targetName?: string;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function DayOffCalendar({ dates: initialDates, targetUserId, targetName }: Props) {
  const todayStr = today();
  const [todayYear, todayMonth] = todayStr.split("-").map(Number);

  const [dayOffs, setDayOffs] = useState<Set<string>>(new Set(initialDates));
  const [pendingDates, setPendingDates] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState({ year: todayYear, month: todayMonth });

  // 月初の曜日（0=日）と日数を UTC ベースで算出する
  const firstWeekday = new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();

  function goPrev() {
    setView((v) =>
      v.month === 1 ? { year: v.year - 1, month: 12 } : { ...v, month: v.month - 1 },
    );
  }

  function goNext() {
    setView((v) =>
      v.month === 12 ? { year: v.year + 1, month: 1 } : { ...v, month: v.month + 1 },
    );
  }

  async function toggle(key: string) {
    if (pendingDates.has(key)) return;

    const isCurrentlyOff = dayOffs.has(key);
    setError(null);

    // 楽観的更新
    setDayOffs((prev) => {
      const next = new Set(prev);
      if (isCurrentlyOff) next.delete(key);
      else next.add(key);
      return next;
    });
    setPendingDates((prev) => new Set(prev).add(key));

    try {
      const result = isCurrentlyOff
        ? await removeDayOff({ date: key, userId: targetUserId })
        : await addDayOff({ date: key, userId: targetUserId });

      if (result.error) {
        // 失敗したらロールバック
        setDayOffs((prev) => {
          const next = new Set(prev);
          if (isCurrentlyOff) next.add(key);
          else next.delete(key);
          return next;
        });
        setError(result.error);
      }
    } catch {
      setDayOffs((prev) => {
        const next = new Set(prev);
        if (isCurrentlyOff) next.add(key);
        else next.delete(key);
        return next;
      });
      setError("更新に失敗しました");
    } finally {
      setPendingDates((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />

      {targetName && (
        <p className="text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">{targetName}</span> さんの休日を編集しています
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          aria-label="前月"
          className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          ◀
        </button>
        <span className="text-sm font-medium text-zinc-900">
          {view.year}年{view.month}月
        </span>
        <button
          type="button"
          onClick={goNext}
          aria-label="翌月"
          className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`py-1 text-center text-xs font-medium ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-400"
            }`}
          >
            {label}
          </div>
        ))}

        {cells.map((day, i) => {
          if (day === null) {
            // biome-ignore lint/suspicious/noArrayIndexKey: 空セルは静的で並び替えが発生しない
            return <div key={`blank-${i}`} />;
          }
          const key = dateKey(view.year, view.month, day);
          const isOff = dayOffs.has(key);
          const isToday = key === todayStr;
          const isPending = pendingDates.has(key);

          return (
            <button
              key={key}
              type="button"
              aria-pressed={isOff}
              disabled={isPending}
              onClick={() => toggle(key)}
              className={`aspect-square rounded-md text-sm transition-colors ${
                isOff
                  ? "bg-red-100 font-medium text-red-700 hover:bg-red-200"
                  : "text-zinc-700 hover:bg-zinc-100"
              } ${isToday && !isOff ? "ring-1 ring-zinc-400" : ""} ${
                isPending ? "opacity-50" : "cursor-pointer"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        日付をクリックすると休日として登録／解除できます（
        <span className="mx-0.5 inline-block rounded bg-red-100 px-1.5 text-red-700">休</span>
        ＝登録済み）。
      </p>
    </div>
  );
}
