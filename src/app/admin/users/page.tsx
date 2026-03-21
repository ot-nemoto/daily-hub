import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfTodayUtc } from "@/lib/dateUtils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserTable } from "./UserTable";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  const today = startOfTodayUtc();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);

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
      },
    },
  });

  const usersWithStats = users.map((user) => {
    const lastReport = user.reports[0] ?? null;
    const reportsInRange = user.reports.filter(
      (r) => r.date >= thirtyDaysAgo && r.date <= today
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastReportAt: lastReport ? lastReport.date.toISOString() : null,
      submissionRate30d: Math.round((reportsInRange.length / 30) * 100) / 100,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-lg font-bold text-zinc-900">ユーザー管理</h1>
            <Link
              href="/admin/users/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ユーザーを追加
            </Link>
          </div>
          <UserTable
            users={usersWithStats}
            currentUserId={session.user.id ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
