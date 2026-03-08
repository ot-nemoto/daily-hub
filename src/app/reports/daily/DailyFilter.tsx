"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { isValidDate } from "@/lib/dateUtils";

type User = { id: string; name: string };

type Props = {
  currentDate: string;
  currentUserId: string;
  users: User[];
};

export function DailyFilter({ currentDate, currentUserId, users }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(currentDate);
  const [dateError, setDateError] = useState(false);

  // ナビゲーション後に props が変化したら入力をリセット
  useEffect(() => {
    setDate(currentDate);
    setDateError(false);
  }, [currentDate]);

  function pushWithDate(d: string, userId: string) {
    const params = new URLSearchParams({ date: d });
    if (userId) params.set("userId", userId);
    router.push(`/reports/daily?${params.toString()}`);
  }

  function handleDateChange(value: string) {
    setDate(value);
    if (!value) {
      setDateError(false);
      return;
    }
    if (isValidDate(value)) {
      setDateError(false);
      pushWithDate(value, currentUserId);
    } else {
      setDateError(true);
    }
  }

  function handleUserChange(userId: string) {
    // 日付が不正な場合は最後に有効だった URL の日付で遷移
    const effectiveDate = isValidDate(date) ? date : currentDate;
    pushWithDate(effectiveDate, userId);
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
        {dateError && (
          <p className="mt-1 text-xs text-red-500">正しい日付を入力してください</p>
        )}
      </div>
      <div>
        <label htmlFor="userId" className="block text-sm font-medium text-zinc-700">
          ユーザー
        </label>
        <select
          id="userId"
          value={currentUserId}
          onChange={(e) => handleUserChange(e.target.value)}
          className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">全員</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
