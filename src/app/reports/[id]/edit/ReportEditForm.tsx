"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";

type Props = {
  id: string;
  defaultValues: {
    workContent: string;
    tomorrowPlan: string;
    notes: string;
  };
};

export function ReportEditForm({ id, defaultValues }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workContent: data.get("workContent"),
          tomorrowPlan: data.get("tomorrowPlan"),
          notes: data.get("notes") ?? "",
        }),
      });

      if (res.status === 403) {
        setError("この日報を編集する権限がありません");
      } else if (!res.ok) {
        setError("保存に失敗しました。入力内容を確認してください");
      } else {
        router.push(`/reports/${id}`);
        router.refresh();
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
        <label htmlFor="workContent" className="block text-sm font-medium text-zinc-700">
          本日の作業内容
        </label>
        <textarea
          id="workContent"
          name="workContent"
          required
          maxLength={5000}
          rows={6}
          defaultValue={defaultValues.workContent}
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
          defaultValue={defaultValues.tomorrowPlan}
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
          defaultValue={defaultValues.notes}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/reports/${id}`)}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "保存中..." : "保存する"}
        </button>
      </div>
    </form>
  );
}
