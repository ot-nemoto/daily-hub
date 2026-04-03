"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";
import { deleteComment } from "./actions";

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
      const result = await deleteComment({ reportId, commentId });

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("コメントの削除に失敗しました。時間をおいて再度お試しください");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ErrorMessage message={error} />
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50"
      >
        {pending ? "削除中..." : "削除"}
      </button>
    </div>
  );
}
