import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserTable } from "./UserTable";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

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
          <h1 className="mb-6 text-lg font-bold text-zinc-900">
            ユーザー管理
          </h1>
          <UserTable
            users={usersWithStats}
            currentUserId={session.user.id ?? ""}
          />
        </div>
      </div>
    </div>
  );
}
