export const metadata = { title: "提出状況" };

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Period, StatusFilter } from "./StatusFilter";

const PERIOD_DAYS: Record<Period, number> = {
  "1w": 7,
  "2w": 14,
  "1m": 30,
  "1.5m": 45,
  "2m": 60,
  "3m": 90,
};

const DEFAULT_PERIOD: Period = "2w";
const VALID_PERIODS = new Set<string>(Object.keys(PERIOD_DAYS));

function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function parseDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return d;
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

// from〜to の日付リストを古い順（左）→新しい順（右）で生成する
function buildDateList(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(from);
  while (current <= to) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

type SearchParams = { base?: string; period?: string };

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await getSession({ redirectOnInactive: true });

  const params = await searchParams;
  const today = todayUTC();

  const baseDate = parseDate(params.base) ?? today;
  const period: Period = VALID_PERIODS.has(params.period ?? "")
    ? (params.period as Period)
    : DEFAULT_PERIOD;

  const days = PERIOD_DAYS[period];
  const fromDate = addDays(baseDate, -(days - 1));

  const dates = buildDateList(fromDate, baseDate);

  const [users, reports] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.report.findMany({
      where: { date: { gte: fromDate, lte: baseDate } },
      select: { authorId: true, date: true },
    }),
  ]);

  // 提出済みセットを (authorId_YYYY-MM-DD) で管理
  const submitted = new Set(
    reports.map((r) => `${r.authorId}_${formatDate(r.date)}`),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-lg font-bold text-zinc-900">提出状況</h1>

      <StatusFilter base={formatDate(baseDate)} period={period} />

      {users.length === 0 ? (
        <p className="text-sm text-zinc-500">有効なユーザーがいません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="border-collapse text-xs">
            <thead>
              <tr className="sticky top-[52px] z-20 border-b border-zinc-200 bg-white">
                <th className="sticky left-0 z-30 min-w-[8rem] border-r border-zinc-200 bg-white px-3 py-2 text-left font-medium text-zinc-500">
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
