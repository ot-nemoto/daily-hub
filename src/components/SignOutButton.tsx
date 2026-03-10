"use client";

import { signOut } from "next-auth/react";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function SignOutButton({ className, children = "ログアウト" }: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
    >
      {children}
    </button>
  );
}
