import Link from "next/link";

import { auth } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/reports/daily" className="text-sm font-bold text-zinc-900">
            Daily Hub
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/reports/daily"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              日次ビュー
            </Link>
            <Link
              href="/reports/monthly"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              月次ビュー
            </Link>
            <Link
              href="/reports/new"
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              日報作成
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-sm text-zinc-500">{session.user.name}</span>
          )}
          <SignOutButton className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50" />
        </div>
      </div>
    </header>
  );
}
