"use client";

import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { today } from "@/lib/dateUtils";
import { removeHoliday, saveHoliday } from "./actions";

type HolidayItem = { date: string; name: string | null };

type Props = {
  holidays: HolidayItem[];
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function HolidayCalendar({ holidays: initial }: Props) {
  const todayStr = today();
  const [todayYear, todayMonth] = todayStr.split("-").map(Number);

  const [holidays, setHolidays] = useState<Map<string, string | null>>(
    () => new Map(initial.map((h) => [h.date, h.name])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState({ year: todayYear, month: todayMonth });
  const [selected, setSelected] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");

  // 月初の曜日（0=日）と日数を UTC ベースで算出する
  const firstWeekday = new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();

  function goPrev() {
    setSelected(null);
    setView((v) =>
      v.month === 1 ? { year: v.year - 1, month: 12 } : { ...v, month: v.month - 1 },
    );
  }

  function goNext() {
    setSelected(null);
    setView((v) =>
      v.month === 12 ? { year: v.year + 1, month: 1 } : { ...v, month: v.month + 1 },
    );
  }

  function openEditor(key: string) {
    setError(null);
    setSelected(key);
    setNameInput(holidays.get(key) ?? "");
  }

  function closeEditor() {
    setSelected(null);
    setNameInput("");
  }

  async function submitSave() {
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    const name = nameInput.trim() ? nameInput.trim() : null;

    try {
      const result = await saveHoliday({ date: selected, name });
      if (result.error) {
        setError(result.error);
        return;
      }
      setHolidays((prev) => new Map(prev).set(selected, name));
      closeEditor();
    } catch {
      setError("更新に失敗しました");
    } finally {
      setPending(false);
    }
  }

  async function submitRemove() {
    if (!selected || pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await removeHoliday({ date: selected });
      if (result.error) {
        setError(result.error);
        return;
      }
      setHolidays((prev) => {
        const next = new Map(prev);
        next.delete(selected);
        return next;
      });
      closeEditor();
    } catch {
      setError("更新に失敗しました");
    } finally {
      setPending(false);
    }
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedIsRegistered = selected !== null && holidays.has(selected);

  return (
    <div className="space-y-4">
      <ErrorMessage message={error} />

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
          const name = holidays.get(key) ?? null;
          const isHoliday = holidays.has(key);
          const isToday = key === todayStr;
          const isSelected = key === selected;
          const dow = i % 7;

          return (
            <div key={key} className="relative">
              <button
                type="button"
                aria-pressed={isHoliday}
                onClick={() => (isSelected ? closeEditor() : openEditor(key))}
                className={`flex aspect-square w-full flex-col items-center justify-center rounded-md text-sm transition-colors ${
                  isHoliday
                    ? "bg-red-100 font-medium text-red-700 hover:bg-red-200"
                    : "text-zinc-700 hover:bg-zinc-100"
                } ${isToday && !isHoliday ? "ring-1 ring-zinc-400" : ""} ${
                  isSelected ? "ring-2 ring-red-400" : ""
                } cursor-pointer`}
              >
                <span>{day}</span>
                {isHoliday && name ? (
                  <span className="mt-0.5 line-clamp-1 w-full px-0.5 text-[9px] leading-tight">
                    {name}
                  </span>
                ) : null}
              </button>

              {isSelected && (
                <div
                  className={`absolute top-full z-30 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg ${
                    dow <= 1 ? "left-0" : dow >= 5 ? "right-0" : "-translate-x-1/2 left-1/2"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-900">
                      {view.month}/{day} の祝日
                    </span>
                    <button
                      type="button"
                      onClick={closeEditor}
                      aria-label="閉じる"
                      className="cursor-pointer px-1 text-zinc-400 hover:text-zinc-600"
                    >
                      ×
                    </button>
                  </div>

                  <label className="mb-1 block text-xs text-zinc-500" htmlFor="holiday-name">
                    名称（任意）
                  </label>
                  <input
                    id="holiday-name"
                    type="text"
                    value={nameInput}
                    maxLength={50}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="例: 山の日"
                    className="mb-3 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={submitSave}
                      disabled={pending}
                      className="flex-1 cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {selectedIsRegistered ? "更新" : "登録"}
                    </button>
                    {selectedIsRegistered && (
                      <button
                        type="button"
                        onClick={submitRemove}
                        disabled={pending}
                        className="cursor-pointer rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        解除
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        日付をクリックすると祝日として登録／解除できます（名称は任意・
        <span className="mx-0.5 inline-block rounded bg-red-100 px-1.5 text-red-700">祝</span>
        ＝登録済み）。
      </p>
    </div>
  );
}
