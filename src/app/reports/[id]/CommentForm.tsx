"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { parseApiError } from "@/lib/apiError";

type Props = {
  reportId: string;
};

export function CommentForm({ reportId }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: data.get("body") }),
      });

      if (!res.ok) {
        setError(await parseApiError(res, "コメントの投稿に失敗しました。入力内容を確認してください"));
      } else {
        formRef.current?.reset();
        router.refresh();
      }
    } catch {
      setError("コメントの投稿に失敗しました。時間をおいて再度お試しください");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-3 border-t border-zinc-100 pt-6">
      <label htmlFor="body" className="block text-sm font-medium text-zinc-700">
        コメントを追加
      </label>
      <textarea
        id="body"
        name="body"
        required
        maxLength={1000}
        rows={3}
        placeholder="コメントを入力してください（1000文字以内）"
        className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      />
      <ErrorMessage message={error} />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "投稿中..." : "コメントする"}
        </button>
      </div>
    </form>
  );
}
