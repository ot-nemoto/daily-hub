"use client";

import { usePathname } from "next/navigation";

import { PendingLink } from "./PendingLink";

type Props = {
  role: string | undefined;
};

function navLinkClass(isActive: boolean) {
  return isActive
    ? "whitespace-nowrap rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-900"
    : "whitespace-nowrap rounded-md px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <PendingLink href={href} className={navLinkClass(isActive)}>
      {children}
    </PendingLink>
  );
}

export function NavLinks({ role }: Props) {
  const pathname = usePathname();

  return (
    <>
      {(role === "ADMIN" || role === "MEMBER") && (
        <NavLink href="/reports/new" isActive={pathname.startsWith("/reports/new")}>
          日報作成
        </NavLink>
      )}
      <NavLink href="/reports/daily" isActive={pathname.startsWith("/reports/daily")}>
        日次ビュー
      </NavLink>
      <NavLink href="/reports/monthly" isActive={pathname.startsWith("/reports/monthly")}>
        月次ビュー
      </NavLink>
      <NavLink href="/reports/status" isActive={pathname.startsWith("/reports/status")}>
        提出状況
      </NavLink>
      {role === "ADMIN" && (
        <NavLink href="/admin/users" isActive={pathname.startsWith("/admin")}>
          ユーザー管理
        </NavLink>
      )}
    </>
  );
}
