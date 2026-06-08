import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 直近 N 日（今日含む）の日付リストを新しい順で生成する
function buildDateList(days: number): Date[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    return d;
  });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(d: Date): string {
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${m}/${day}(${dow})`;
}

const DAYS = 45;

export default async function StatusPage() {
  await getSession({ redirectOnInactive: true });

  const dates = buildDateList(DAYS);
  const from = dates[dates.length - 1];
  const to = dates[0];

  const [users, reports] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.report.findMany({
      where: { date: { gte: from, lte: to } },
      select: { authorId: true, date: true },
    }),
  ]);

  // 提出済みセットを (authorId_YYYY-MM-DD) で管理
  const submitted = new Set(
    reports.map((r) => `${r.authorId}_${formatDate(r.date)}`),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-lg font-bold text-zinc-900">提出状況</h1>

      {users.length === 0 ? (
        <p className="text-sm text-zinc-500">有効なユーザーがいません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                {/* ユーザー名列ヘッダー */}
                <th className="sticky left-0 z-10 min-w-[8rem] border-r border-zinc-200 bg-white px-3 py-2 text-left font-medium text-zinc-500">
                  ユーザー
                </th>
                {dates.map((d) => {
                  const dow = d.getUTCDay();
                  const isSat = dow === 6;
                  const isSun = dow === 0;
                  return (
                    <th
                      key={formatDate(d)}
                      className={`min-w-[4.5rem] border-r border-zinc-100 px-1 py-2 text-center font-medium ${
                        isSat
                          ? "text-blue-500"
                          : isSun
                            ? "text-red-500"
                            : "text-zinc-500"
                      }`}
                    >
                      {formatDateLabel(d)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50">
                  <td className="sticky left-0 z-10 border-r border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900 hover:bg-zinc-50">
                    {user.name}
                  </td>
                  {dates.map((d) => {
                    const key = `${user.id}_${formatDate(d)}`;
                    const done = submitted.has(key);
                    const dow = d.getUTCDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <td
                        key={formatDate(d)}
                        className={`border-r border-zinc-100 px-1 py-2 text-center ${
                          isWeekend ? "bg-zinc-50" : ""
                        }`}
                      >
                        {done ? (
                          <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                            ✓
                          </span>
                        ) : isWeekend ? (
                          <span className="text-zinc-300">—</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
