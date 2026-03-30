"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export function SignOutButton({ className, children = "ログアウト" }: Props) {
  return (
    <ClerkSignOutButton redirectUrl="/login">
      <button type="button" className={className}>
        {children}
      </button>
    </ClerkSignOutButton>
  );
}
