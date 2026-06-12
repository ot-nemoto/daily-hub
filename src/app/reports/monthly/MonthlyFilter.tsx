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
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = users.find((u) => u.id === currentAuthorId)?.name ?? "";
  const filtered = filterQuery
    ? users.filter((u) => u.name.toLowerCase().includes(filterQuery.toLowerCase()))
    : users;

  useEffect(() => {
    setMonth(currentMonth);
    setMonthError(false);
  }, [currentMonth]);

  // ドロップダウンを開いたら検索欄にフォーカス
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilterQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
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
    if (!value) { setMonthError(false); return; }
    if (isValidMonth(value)) {
      setMonthError(false);
      pushWithMonth(value, currentAuthorId);
    } else {
      setMonthError(true);
    }
  }

  function selectUser(user: User) {
    setOpen(false);
    setFilterQuery("");
    const effectiveMonth = isValidMonth(month) ? month : currentMonth;
    pushWithMonth(effectiveMonth, user.id);
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
        <label htmlFor="author-trigger" className="block text-sm font-medium text-zinc-700">ユーザー</label>
        {/* トリガーボタン */}
        <button
          id="author-trigger"
          type="button"
          aria-expanded={open}
          aria-controls="author-listbox"
          onClick={() => { setOpen((v) => !v); setFilterQuery(""); }}
          className="mt-1 flex w-40 items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-left text-sm shadow-sm hover:bg-zinc-50 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <span className="truncate">{currentLabel}</span>
          <svg className={`ml-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {/* ドロップダウン */}
        {open && (
          <div className="absolute z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white shadow-lg">
            {/* 検索入力 */}
            <div className="p-1.5">
              <input
                ref={searchRef}
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setFilterQuery(""); }
                }}
                placeholder="絞り込み..."
                aria-label="ユーザーを絞り込む"
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </div>
            {/* リスト */}
            <ul id="author-listbox" role="listbox" className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-400">該当なし</li>
              ) : (
                filtered.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectUser(u);
                      }}
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
          </div>
        )}
      </div>

      {isPending && (
        <div role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-zinc-400">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          読み込み中...
        </div>
      )}
    </div>
  );
}
