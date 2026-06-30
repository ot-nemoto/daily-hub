export const metadata = { title: "ユーザー管理" };

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserTable } from "./UserTable";

export default async function AdminUsersPage() {
  const session = await getSession({ redirectOnInactive: true });
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      reports: {
        select: { date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  const usersWithStats = users.map((user) => {
    const lastReport = user.reports[0] ?? null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastReportAt: lastReport ? lastReport.date.toISOString() : null,
    };
  });

  return (
    <div className="bg-zinc-50 py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-lg font-bold text-zinc-900">ユーザー管理</h1>
          </div>
          <UserTable users={usersWithStats} currentUserId={session.user.id ?? ""} />
        </div>
      </div>
    </div>
  );
}
