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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#0ea5e9"/>
              <rect x="8" y="6" width="13" height="17" rx="2" fill="white" opacity="0.15"/>
              <rect x="8" y="6" width="13" height="17" rx="2" fill="none" stroke="white" strokeWidth="1.5"/>
              <line x1="11" y1="11" x2="18" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              <line x1="11" y1="14" x2="18" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              <line x1="11" y1="17" x2="15" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              <circle cx="22" cy="22" r="6" fill="#22c55e"/>
              <polyline points="19,22 21,24 25,20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
              hasInitialApiKey={dbUser?.apiKey !== null}
            />
          )}
          <SignOutButton className="shrink-0 cursor-pointer rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50" />
        </div>
      </div>
    </header>
  );
}
