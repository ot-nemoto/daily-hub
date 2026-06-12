"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { isValidMonth } from "@/lib/dateUtils";

type User = { id: string; name: string };

type Props = {
  currentMonth: string; // "YYYY-MM"
  currentAuthorId: string;
  users: User[];
};

export function MonthlyFilter({ currentMonth, currentAuthorId, users }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [month, setMonth] = useState(currentMonth);
  const [monthError, setMonthError] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentUser = users.find((u) => u.id === currentAuthorId);
  const allOption = { id: "", name: "全員" };
  const filtered = [allOption, ...users].filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setMonth(currentMonth);
    setMonthError(false);
  }, [currentMonth]);

  // フォーカスが外れたらドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pushWithMonth(m: string, authorId: string) {
    const [year, mon] = m.split("-");
    const lastDay = new Date(Number(year), Number(mon), 0).getDate();
    const params = new URLSearchParams();
    params.set("from", `${m}-01`);
    params.set("to", `${m}-${String(lastDay).padStart(2, "0")}`);
    if (authorId) params.set("authorId", authorId);
    startTransition(() => {
      router.push(`/reports/monthly?${params.toString()}`);
    });
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

  function handleSelect(authorId: string) {
    const effectiveMonth = isValidMonth(month) ? month : currentMonth;
    pushWithMonth(effectiveMonth, authorId);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
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
      <div ref={containerRef} className="relative">
        <label htmlFor="author-search" className="block text-sm font-medium text-zinc-700">
          ユーザー
        </label>
        <input
          id="author-search"
          type="text"
          autoComplete="off"
          placeholder={currentAuthorId ? (currentUser?.name ?? "") : "全員"}
          value={open ? query : ""}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="mt-1 w-40 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {open && (
          <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400">該当なし</li>
            ) : (
              filtered.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(u.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 ${
                      u.id === currentAuthorId ? "font-medium text-zinc-900" : "text-zinc-700"
                    }`}
                  >
                    {u.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {isPending && (
        <div role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-zinc-400">
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          読み込み中...
        </div>
      )}
    </div>
  );
}
