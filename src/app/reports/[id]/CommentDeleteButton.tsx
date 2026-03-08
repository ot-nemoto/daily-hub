"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  reportId: string;
  commentId: string;
};

export function CommentDeleteButton({ reportId, commentId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        setError("コメントの削除に失敗しました。時間をおいて再度お試しください");
      }
    } catch {
      setError("コメントの削除に失敗しました。時間をおいて再度お試しください");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50"
      >
        {pending ? "削除中..." : "削除"}
      </button>
    </span>
  );
}
