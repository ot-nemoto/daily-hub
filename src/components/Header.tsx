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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="#18181b"/>
              <text x="12" y="16.5" fontFamily="sans-serif" fontSize="10" fontWeight="700" fill="white" textAnchor="middle">DH</text>
            </svg>
            <span className="text-sm font-bold text-zinc-900">Daily Hub</span>
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
