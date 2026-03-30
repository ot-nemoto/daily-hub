"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { type FieldErrors, parseFieldErrors } from "@/lib/apiError";
import { today } from "@/lib/dateUtils";

const MAX_LENGTH = 5000;

export function ReportNewForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [counts, setCounts] = useState({ workContent: 0, tomorrowPlan: 0, notes: 0 });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.get("date"),
          workContent: data.get("workContent"),
          tomorrowPlan: data.get("tomorrowPlan"),
          notes: data.get("notes") ?? "",
        }),
      });

      if (res.status === 409) {
        setError("この日付の日報はすでに作成済みです");
      } else if (!res.ok) {
        const parsed = await parseFieldErrors(res);
        setError(parsed.message);
        setFieldErrors(parsed.fieldErrors);
      } else {
        const { id } = await res.json();
        router.push(`/reports/${id}`);
      }
    } catch {
      setError("保存に失敗しました。時間をおいて再度お試しください");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorMessage message={error} />
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
        {fieldErrors.date?.[0] && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.date[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="workContent" className="block text-sm font-medium text-zinc-700">
          本日の作業内容
        </label>
        <textarea
          id="workContent"
          name="workContent"
          required
          maxLength={MAX_LENGTH}
          rows={6}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          onChange={(e) => setCounts((prev) => ({ ...prev, workContent: e.target.value.length }))}
        />
        <p className={`mt-1 text-right text-xs ${counts.workContent > MAX_LENGTH * 0.9 ? "text-red-500" : "text-zinc-400"}`}>
          {counts.workContent.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </p>
        {fieldErrors.workContent?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.workContent[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="tomorrowPlan" className="block text-sm font-medium text-zinc-700">
          明日の予定
        </label>
        <textarea
          id="tomorrowPlan"
          name="tomorrowPlan"
          required
          maxLength={MAX_LENGTH}
          rows={4}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          onChange={(e) => setCounts((prev) => ({ ...prev, tomorrowPlan: e.target.value.length }))}
        />
        <p className={`mt-1 text-right text-xs ${counts.tomorrowPlan > MAX_LENGTH * 0.9 ? "text-red-500" : "text-zinc-400"}`}>
          {counts.tomorrowPlan.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </p>
        {fieldErrors.tomorrowPlan?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.tomorrowPlan[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700">
          所感・連絡事項{" "}
          <span className="font-normal text-zinc-400">（任意）</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={MAX_LENGTH}
          rows={3}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          onChange={(e) => setCounts((prev) => ({ ...prev, notes: e.target.value.length }))}
        />
        <p className={`mt-1 text-right text-xs ${counts.notes > MAX_LENGTH * 0.9 ? "text-red-500" : "text-zinc-400"}`}>
          {counts.notes.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </p>
        {fieldErrors.notes?.[0] && (
          <p className="text-xs text-red-600">{fieldErrors.notes[0]}</p>
        )}
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
