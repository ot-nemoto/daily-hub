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

  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwPending, setPwPending] = useState(false);

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNamePending(true);
    setNameError(null);
    setNameSuccess(false);

    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setNamePending(false);
    if (res.ok) {
      setNameSuccess(true);
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      setNameError(json.error ?? "名前の更新に失敗しました");
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwPending(true);
    setPwError(null);
    setPwSuccess(false);

    const data = new FormData(e.currentTarget);
    const currentPassword = data.get("currentPassword") as string;
    const newPassword = data.get("newPassword") as string;
    const confirmPassword = data.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setPwError("新しいパスワードが一致しません");
      setPwPending(false);
      return;
    }

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setPwPending(false);
    if (res.ok) {
      setPwSuccess(true);
      (e.target as HTMLFormElement).reset();
    } else {
      if (res.status === 403) {
        setPwError("現在のパスワードが正しくありません");
      } else {
        const json = await res.json().catch(() => ({}));
        setPwError(json.error ?? "パスワードの変更に失敗しました");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 名前変更 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-zinc-900">プロフィール</h2>
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              メールアドレス
            </label>
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

      {/* パスワード変更 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-zinc-900">パスワード変更</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-700">
              現在のパスワード
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-700">
              新しいパスワード
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700">
              新しいパスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <ErrorMessage message={pwError} />
          {pwSuccess && (
            <p className="text-sm text-green-600">パスワードを変更しました</p>
          )}
          <button
            type="submit"
            disabled={pwPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pwPending ? "変更中..." : "変更する"}
          </button>
        </form>
      </div>
    </div>
  );
}
