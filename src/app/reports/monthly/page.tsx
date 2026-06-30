export const metadata = { title: "月次ビュー" };

import { DisplayFieldProvider } from "@/components/DisplayFieldContext";
import { ReportSearchList } from "@/components/ReportSearchList";
import { getSession } from "@/lib/auth";
import { currentMonth, formatMonthJa, isValidDate, monthRange } from "@/lib/dateUtils";
import { prisma } from "@/lib/prisma";
import { MonthlyFilter } from "./MonthlyFilter";

export default async function MonthlyViewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; authorId?: string }>;
}) {
  const [session, params] = await Promise.all([
    getSession({ redirectOnInactive: true }),
    searchParams,
  ]);

  const month = currentMonth();
  // 不正な日付が URL から渡された場合は今月にフォールバック
  const range =
    params.from && params.to && isValidDate(params.from) && isValidDate(params.to)
      ? { from: params.from, to: params.to }
      : monthRange(month);
  const authorId = params.authorId ?? session?.user?.id ?? "";
  const displayMonth = range.from.slice(0, 7);

  const [users, reports] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.report.findMany({
      where: {
        date: {
          gte: new Date(`${range.from}T00:00:00.000Z`),
          lte: new Date(`${range.to}T00:00:00.000Z`),
        },
        ...(authorId ? { authorId } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ date: "desc" }],
    }),
  ]);

  return (
    <DisplayFieldProvider>
      <div className="bg-zinc-50 py-10">
        <div className="mx-auto max-w-3xl space-y-6 px-4">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-lg font-bold text-zinc-900">月次ビュー</h1>
            <MonthlyFilter currentMonth={displayMonth} currentAuthorId={authorId} users={users} />
          </div>

          <ReportSearchList
            primary="date"
            emptyMessage={`${formatMonthJa(displayMonth)} の日報はありません`}
            reports={reports.map((report) => ({
              id: report.id,
              date: report.date.toISOString().slice(0, 10),
              authorName: report.author.name,
              workContent: report.workContent,
              tomorrowPlan: report.tomorrowPlan,
              notes: report.notes,
              commentCount: report._count.comments,
              isAuthor: session?.user?.id === report.authorId,
            }))}
          />
        </div>
      </div>
    </DisplayFieldProvider>
  );
}
