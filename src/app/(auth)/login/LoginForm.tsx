"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { ErrorMessage } from "@/components/ErrorMessage";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: data.get("email") as string,
      password: data.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setPending(false);
    } else {
      window.location.href = "/reports/daily";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorMessage message={error} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "ログイン中..." : "ログイン"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="font-medium text-zinc-900 hover:underline">
          サインアップ
        </Link>
      </p>
    </form>
  );
}
