"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  role: string | undefined;
};

function navLinkClass(isActive: boolean) {
  return isActive
    ? "whitespace-nowrap rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-900"
    : "whitespace-nowrap rounded-md px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";
}

export function NavLinks({ role }: Props) {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/reports/daily"
        className={navLinkClass(pathname.startsWith("/reports/daily"))}
      >
        日次ビュー
      </Link>
      <Link
        href="/reports/monthly"
        className={navLinkClass(pathname.startsWith("/reports/monthly"))}
      >
        月次ビュー
      </Link>
      <Link
        href="/reports/status"
        className={navLinkClass(pathname.startsWith("/reports/status"))}
      >
        提出状況
      </Link>
      {(role === "ADMIN" || role === "MEMBER") && (
        <Link
          href="/reports/new"
          className={navLinkClass(pathname.startsWith("/reports/new"))}
        >
          日報作成
        </Link>
      )}
      {role === "ADMIN" && (
        <Link
          href="/admin/users"
          className={navLinkClass(pathname.startsWith("/admin"))}
        >
          ユーザー管理
        </Link>
      )}
    </>
  );
}
