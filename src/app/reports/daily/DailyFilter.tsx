"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { isValidDate } from "@/lib/dateUtils";

type Props = {
  currentDate: string;
};

export function DailyFilter({ currentDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(currentDate);
  const [dateError, setDateError] = useState(false);

  useEffect(() => {
    setDate(currentDate);
    setDateError(false);
  }, [currentDate]);

  function handleDateChange(value: string) {
    setDate(value);
    if (!value) {
      setDateError(false);
      return;
    }
    if (isValidDate(value)) {
      setDateError(false);
      startTransition(() => {
        router.push(`/reports/daily?date=${value}`);
      });
    } else {
      setDateError(true);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-zinc-700">
          日付
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className={`mt-1 rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 ${
            dateError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500"
          }`}
        />
        {dateError && <p className="mt-1 text-xs text-red-500">正しい日付を入力してください</p>}
      </div>
      {isPending && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-zinc-400"
        >
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          読み込み中...
        </div>
      )}
    </div>
  );
}
