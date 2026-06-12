import { getSession } from "@/lib/auth";
import { formatDateJa, isValidDate, today } from "@/lib/dateUtils";
import { prisma } from "@/lib/prisma";
import { ReportSearchList } from "@/components/ReportSearchList";
import { DailyFilter } from "./DailyFilter";

export default async function DailyViewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [session, params] = await Promise.all([getSession({ redirectOnInactive: true }), searchParams]);
  // 不正な日付が URL から渡された場合は today() にフォールバック
  const date = params.date && isValidDate(params.date) ? params.date : today();

  const reports = await prisma.report.findMany({
    where: {
      date: new Date(`${date}T00:00:00.000Z`),
    },
    include: {
      author: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { author: { name: "asc" } },
  });

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-lg font-bold text-zinc-900">日次ビュー</h1>
          <DailyFilter currentDate={date} />
        </div>

        <ReportSearchList
          primary="authorName"
          emptyMessage={`${formatDateJa(date)} の日報はありません`}
          reports={reports.map((report) => ({
            id: report.id,
            date,
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
  );
}
