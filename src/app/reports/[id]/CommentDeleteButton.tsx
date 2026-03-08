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

  async function handleDelete() {
    setPending(true);
    try {
      await fetch(`/api/reports/${reportId}/comments/${commentId}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50"
    >
      {pending ? "削除中..." : "削除"}
    </button>
  );
}
