"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function today(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ReportNewForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: data.get("date"),
        workContent: data.get("workContent"),
        tomorrowPlan: data.get("tomorrowPlan"),
        notes: data.get("notes") || null,
      }),
    });

    if (res.status === 409) {
      setError("この日付の日報はすでに作成済みです");
      setPending(false);
    } else if (!res.ok) {
      setError("保存に失敗しました。入力内容を確認してください");
      setPending(false);
    } else {
      const { id } = await res.json();
      router.push(`/reports/${id}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-zinc-700">
          日付
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={today()}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="workContent" className="block text-sm font-medium text-zinc-700">
          本日の作業内容
        </label>
        <textarea
          id="workContent"
          name="workContent"
          required
          maxLength={5000}
          rows={6}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="tomorrowPlan" className="block text-sm font-medium text-zinc-700">
          明日の予定
        </label>
        <textarea
          id="tomorrowPlan"
          name="tomorrowPlan"
          required
          maxLength={5000}
          rows={4}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
          所感・連絡事項{" "}
          <span className="font-normal text-zinc-400">（任意）</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={5000}
          rows={3}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "保存中..." : "日報を作成"}
        </button>
      </div>
    </form>
  );
}
