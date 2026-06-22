import Link from "next/link";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLinks } from "./NavLinks";
import { SettingsModalTrigger } from "./SettingsModalTrigger";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const session = await getSession({ redirectOnInactive: true });

  const dbUser = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, apiKey: true },
      })
    : null;

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/reports/new" className="shrink-0 flex items-center gap-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className="h-7 w-7 shrink-0"
              aria-hidden="true"
            >
              <line
                x1="11"
                y1="10"
                x2="8"
                y2="29"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="21"
                y1="10"
                x2="24"
                y2="29"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <polyline
                points="4,10 13,10 16,5 19,10 28,10"
                fill="none"
                stroke="black"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="11"
                y1="16"
                x2="21"
                y2="16"
                stroke="black"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-base font-bold text-zinc-900">Daily Hub</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <NavLinks role={session?.user?.role} />
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {session?.user?.name && (
            <SettingsModalTrigger
              name={session.user.name}
              email={dbUser?.email ?? ""}
              hasInitialApiKey={dbUser?.apiKey != null}
            />
          )}
          <SignOutButton className="shrink-0 cursor-pointer rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50" />
        </div>
      </div>
    </header>
  );
}
