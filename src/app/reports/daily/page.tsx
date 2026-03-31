import Link from "next/link";

import { getSession } from "@/lib/auth";
import { isValidDate, today } from "@/lib/dateUtils";
import { prisma } from "@/lib/prisma";
import { DailyFilter } from "./DailyFilter";

export default async function DailyViewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; userId?: string }>;
}) {
  const [session, params] = await Promise.all([getSession({ redirectOnInactive: true }), searchParams]);
  // 不正な日付が URL から渡された場合は today() にフォールバック
  const date = params.date && isValidDate(params.date) ? params.date : today();
  const userId = params.userId ?? "";

  const [users, reports] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.report.findMany({
      where: {
        date: new Date(`${date}T00:00:00.000Z`),
        ...(userId ? { authorId: userId } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { author: { name: "asc" } },
    }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-lg font-bold text-zinc-900">日次ビュー</h1>
          <DailyFilter currentDate={date} currentUserId={userId} users={users} />
        </div>

        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-500">
                {date} の日報はありません
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const isAuthor = session?.user?.id === report.authorId;
              return (
                <div key={report.id} className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">{date}</p>
                      <p className="font-medium text-zinc-900">{report.author.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {report._count.comments > 0 && (
                        <span className="text-xs text-zinc-400">
                          💬 {report._count.comments}
                        </span>
                      )}
                      {isAuthor && (
                        <Link
                          href={`/reports/${report.id}/edit`}
                          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          編集
                        </Link>
                      )}
                      <Link
                        href={`/reports/${report.id}`}
                        className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
                      >
                        詳細
                      </Link>
                    </div>
                  </div>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">本日の作業内容</dt>
                      <dd className="mt-0.5 line-clamp-3 text-sm text-zinc-900">
                        {report.workContent}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-zinc-500">明日の予定</dt>
                      <dd className="mt-0.5 line-clamp-2 text-sm text-zinc-900">
                        {report.tomorrowPlan}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
