export const metadata = { title: "提出状況" };

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PERIOD,
  formatDateLabel,
  isPeriod,
  PERIOD_DAYS,
  parseYmd,
  todayYmd,
  toYmd,
} from "@/lib/statusPeriod";
import { StatusFilter } from "./StatusFilter";
import { StatusTableScroll } from "./StatusTableScroll";

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
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
  const today = todayYmd();

  const baseDate = parseYmd(params.base) ?? new Date(`${today}T00:00:00.000Z`);
  const period = isPeriod(params.period) ? params.period : DEFAULT_PERIOD;

  const days = PERIOD_DAYS[period];
  const fromDate = addDays(baseDate, -(days - 1));

  const dates = buildDateList(fromDate, baseDate);

  const [users, reports, dayOffs, holidays] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.report.findMany({
      where: { date: { gte: fromDate, lte: baseDate } },
      select: { authorId: true, date: true },
    }),
    prisma.dayOff.findMany({
      where: { date: { gte: fromDate, lte: baseDate } },
      select: { userId: true, date: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: fromDate, lte: baseDate } },
      select: { date: true, name: true },
    }),
  ]);

  // 提出済みセットを (authorId_YYYY-MM-DD) で管理
  const submitted = new Set(reports.map((r) => `${r.authorId}_${toYmd(r.date)}`));
  // 休日セットを (userId_YYYY-MM-DD) で管理
  const dayOffSet = new Set(dayOffs.map((d) => `${d.userId}_${toYmd(d.date)}`));
  // 祝日は全ユーザー共通。日付キーで保持し、名称はツールチップ表示に使う
  const holidaySet = new Set(holidays.map((h) => toYmd(h.date)));
  const holidayNames = new Map(holidays.map((h) => [toYmd(h.date), h.name]));
  // 平日の日付リスト（提出率算出用）。土日と祝日は稼働日でないため除外する
  const weekdays = dates.filter((d) => {
    const dow = d.getUTCDay();
    return dow !== 0 && dow !== 6 && !holidaySet.has(toYmd(d));
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-lg font-bold text-zinc-900">提出状況</h1>

      <StatusFilter base={toYmd(baseDate)} period={period} today={today} />

      {users.length === 0 ? (
        <p className="text-sm text-zinc-500">有効なユーザーがいません。</p>
      ) : (
        <StatusTableScroll>
          <table className="border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="sticky left-0 top-0 z-30 w-48 min-w-[12rem] border-r border-zinc-200 bg-white px-3 py-2 text-left font-medium text-zinc-500">
                  ユーザー
                </th>
                {dates.map((d) => {
                  const ds = toYmd(d);
                  const dow = d.getUTCDay();
                  const isSat = dow === 6;
                  const isSun = dow === 0;
                  const isHoliday = holidaySet.has(ds);
                  // 祝日は日曜と同じ赤扱い。名称は日付の下に表示し、省略時はツールチップで全文を出す
                  const holidayName = isHoliday ? (holidayNames.get(ds) ?? "祝日") : undefined;
                  const colorClass =
                    isHoliday || isSun ? "text-red-500" : isSat ? "text-blue-500" : "text-zinc-500";
                  return (
                    <th
                      key={ds}
                      title={holidayName}
                      className={`sticky top-0 z-20 min-w-[4.5rem] border-r border-zinc-100 bg-white px-1 py-2 text-center align-top font-medium ${colorClass}`}
                    >
                      {formatDateLabel(d)}
                      {holidayName && (
                        // th の max-width は CSS 仕様上効かない（Firefox 等）ため、内側の要素で幅を固定して省略する
                        <span className="block w-[4rem] truncate text-[10px] font-normal leading-tight">
                          {holidayName}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((user) => {
                const userDayOffCount = weekdays.filter((d) =>
                  dayOffSet.has(`${user.id}_${toYmd(d)}`),
                ).length;
                const denominator = weekdays.length - userDayOffCount;
                const submittedCount = weekdays.filter(
                  (d) =>
                    submitted.has(`${user.id}_${toYmd(d)}`) &&
                    !dayOffSet.has(`${user.id}_${toYmd(d)}`),
                ).length;
                const rate = denominator > 0 ? Math.floor((submittedCount / denominator) * 100) : 0;
                return (
                  <tr key={user.id} className="hover:bg-zinc-50">
                    <td className="sticky left-0 z-10 w-48 min-w-[12rem] max-w-[12rem] border-r border-zinc-200 bg-white px-3 py-2 font-medium text-zinc-900 hover:bg-zinc-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{user.name}</span>
                        <span className="shrink-0 font-normal text-zinc-500">{rate}%</span>
                      </div>
                    </td>
                    {dates.map((d) => {
                      const ds = toYmd(d);
                      const key = `${user.id}_${ds}`;
                      const done = submitted.has(key);
                      const isDayOff = dayOffSet.has(key);
                      const isHoliday = holidaySet.has(ds);
                      const dow = d.getUTCDay();
                      const isWeekend = dow === 0 || dow === 6;
                      // 祝日は赤系背景、週末はグレー背景。祝日は全ユーザー共通なので列の背景と見出しで示し、
                      // セルのバッジは個人の休日(休)だけに限定する
                      const bgClass = isHoliday ? "bg-red-50" : isWeekend ? "bg-zinc-50" : "";
                      return (
                        <td
                          key={ds}
                          className={`border-r border-zinc-100 px-1 py-2 text-center ${bgClass}`}
                        >
                          {isDayOff ? (
                            <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                              休
                            </span>
                          ) : done ? (
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
                );
              })}
            </tbody>
          </table>
        </StatusTableScroll>
      )}
    </main>
  );
}
