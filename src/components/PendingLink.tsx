"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function Spinner() {
  return (
    <svg
      className="h-3 w-3 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function LinkContent({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="flex items-center gap-1">
      {children}
      {pending && <Spinner />}
    </span>
  );
}

type Props = ComponentProps<typeof Link>;

export function PendingLink({ children, ...props }: Props) {
  return (
    <Link {...props}>
      <LinkContent>{children}</LinkContent>
    </Link>
  );
}
