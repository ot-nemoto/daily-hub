"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string };

type Props = {
  currentMonth: string; // "YYYY-MM"
  currentAuthorId: string;
  users: User[];
};

function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const mon = Number(value.split("-")[1]);
  return mon >= 1 && mon <= 12;
}

export function MonthlyFilter({ currentMonth, currentAuthorId, users }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonth);
  const [monthError, setMonthError] = useState(false);

  // ナビゲーション後に props が変化したら入力をリセット
  useEffect(() => {
    setMonth(currentMonth);
    setMonthError(false);
  }, [currentMonth]);

  function pushWithMonth(m: string, authorId: string) {
    const [year, mon] = m.split("-");
    const lastDay = new Date(Number(year), Number(mon), 0).getDate();
    const params = new URLSearchParams();
    params.set("from", `${m}-01`);
    params.set("to", `${m}-${String(lastDay).padStart(2, "0")}`);
    if (authorId) params.set("authorId", authorId);
    router.push(`/reports/monthly?${params.toString()}`);
  }

  function handleMonthChange(value: string) {
    setMonth(value);
    if (!value) {
      setMonthError(false);
      return;
    }
    if (isValidMonth(value)) {
      setMonthError(false);
      pushWithMonth(value, currentAuthorId);
    } else {
      setMonthError(true);
    }
  }

  function handleAuthorChange(authorId: string) {
    // 月が不正な場合は最後に有効だった URL の月で遷移
    const effectiveMonth = isValidMonth(month) ? month : currentMonth;
    pushWithMonth(effectiveMonth, authorId);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="month" className="block text-sm font-medium text-zinc-700">
          月
        </label>
        <input
          id="month"
          type="month"
          value={month}
          onChange={(e) => handleMonthChange(e.target.value)}
          className={`mt-1 rounded-md border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 ${
            monthError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500"
          }`}
        />
        {monthError && (
          <p className="mt-1 text-xs text-red-500">正しい月を入力してください</p>
        )}
      </div>
      <div>
        <label htmlFor="authorId" className="block text-sm font-medium text-zinc-700">
          ユーザー
        </label>
        <select
          id="authorId"
          value={currentAuthorId}
          onChange={(e) => handleAuthorChange(e.target.value)}
          className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
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
