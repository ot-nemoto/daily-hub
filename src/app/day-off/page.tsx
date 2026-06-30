import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DayOffCalendar } from "./DayOffCalendar";
import { DayOffUserSelect } from "./DayOffUserSelect";

export const metadata = { title: "休日管理" };

type SearchParams = { userId?: string };

export default async function DayOffPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession({ redirectOnInactive: true });
  if (!session) return null;
  if (session.user.role === "VIEWER") redirect("/reports/daily");

  const isAdmin = session.user.role === "ADMIN";
  const params = await searchParams;

  // ADMIN のみ userId クエリを解釈する
  const requestedUserId = isAdmin ? (params.userId ?? session.user.id) : session.user.id;

  // 指定ユーザーが実在する場合のみ採用。不正な userId は自分にフォールバック
  const targetUser = await prisma.user.findUnique({
    where: { id: requestedUserId },
    select: { id: true, name: true },
  });
  const target = targetUser ?? { id: session.user.id, name: session.user.name };
  const isSelf = target.id === session.user.id;

  const [dayOffs, allUsers] = await Promise.all([
    prisma.dayOff.findMany({
      where: { userId: target.id },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="bg-zinc-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-zinc-900">休日管理</h1>

        {isAdmin && allUsers && <DayOffUserSelect users={allUsers} currentUserId={target.id} />}

        <DayOffCalendar
          key={target.id}
          dates={dayOffs.map((d) => d.date.toISOString().slice(0, 10))}
          targetUserId={target.id}
          targetName={isSelf ? undefined : target.name}
        />
      </div>
    </div>
  );
}
