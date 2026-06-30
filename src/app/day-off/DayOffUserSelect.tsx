"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type User = { id: string; name: string };

type Props = {
  users: User[];
  currentUserId: string;
};

export function DayOffUserSelect({ users, currentUserId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentLabel = users.find((u) => u.id === currentUserId)?.name ?? "（不明）";
  const filtered = query
    ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
    : users;

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function selectUser(userId: string) {
    setOpen(false);
    setQuery("");
    router.push(`/day-off?${new URLSearchParams({ userId }).toString()}`);
  }

  return (
    <div className="mb-6">
      <label htmlFor="user-trigger" className="mb-1 block text-sm font-medium text-zinc-700">
        対象ユーザー
      </label>
      <div ref={containerRef} className="relative inline-block">
        <button
          id="user-trigger"
          type="button"
          aria-expanded={open}
          aria-controls="user-listbox"
          onClick={() => {
            setOpen((v) => !v);
            setQuery("");
          }}
          className="flex w-48 items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-left text-sm shadow-sm hover:bg-zinc-50 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <span className="truncate">{currentLabel}</span>
          <svg
            className={`ml-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-48 rounded-md border border-zinc-200 bg-white shadow-lg">
            <div className="p-1.5">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  }
                }}
                placeholder="絞り込み..."
                aria-label="ユーザーを絞り込む"
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none"
              />
            </div>
            <div id="user-listbox" role="listbox" className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-400">該当なし</div>
              ) : (
                filtered.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    role="option"
                    aria-selected={u.id === currentUserId}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectUser(u.id);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 ${
                      u.id === currentUserId ? "font-medium text-zinc-900" : "text-zinc-700"
                    }`}
                  >
                    {u.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
