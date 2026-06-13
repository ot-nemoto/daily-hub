import Link from "next/link";

import { getSession } from "@/lib/auth";
import { NavLinks } from "./NavLinks";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const session = await getSession({ redirectOnInactive: true });

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href="/reports/new" className="shrink-0 text-sm font-bold text-zinc-900">
            Daily Hub
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <NavLinks role={session?.user?.role} />
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {session?.user?.name && (
            <Link
              href="/settings"
              className="hidden text-sm text-zinc-500 hover:text-zinc-900 sm:inline"
            >
              {session.user.name}
            </Link>
          )}
          <SignOutButton className="shrink-0 cursor-pointer rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50" />
        </div>
      </div>
    </header>
  );
}
