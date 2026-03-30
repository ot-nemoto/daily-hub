"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ redirectUrl: "/login" });
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleSignOut}
      className={className}
    >
      {loading ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
