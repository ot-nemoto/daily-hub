"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    try {
      await signOut({ redirectUrl: "/login" });
    } catch {
      setError("ログアウトに失敗しました。時間をおいて再度お試しください");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        disabled={loading}
        onClick={handleSignOut}
        className={className}
      >
        {loading ? "ログアウト中..." : "ログアウト"}
      </button>
    </div>
  );
}
