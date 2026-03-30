"use client";

import { ErrorMessage } from "@/components/ErrorMessage";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  initialName: string;
  email: string;
};

export function SettingsForm({ initialName, email }: Props) {
  const router = useRouter();
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNamePending(true);
    setNameError(null);
    setNameSuccess(false);

    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setNameSuccess(true);
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        setNameError(json.error ?? "名前の更新に失敗しました");
      }
    } catch {
      setNameError("通信エラーが発生しました");
    } finally {
      setNamePending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 名前変更 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-zinc-900">プロフィール</h2>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <p className="block text-sm font-medium text-zinc-700">メールアドレス</p>
            <p className="mt-1 text-sm text-zinc-500">{email}</p>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
              名前
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={initialName}
              maxLength={100}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <ErrorMessage message={nameError} />
          {nameSuccess && (
            <p className="text-sm text-green-600">名前を更新しました</p>
          )}
          <button
            type="submit"
            disabled={namePending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {namePending ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
