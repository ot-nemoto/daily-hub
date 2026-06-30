"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "実在する日付を入力してください");

type Session = Awaited<ReturnType<typeof getSession>> & object;

async function resolveTargetUserId(
  session: Session,
  userId?: string,
): Promise<{ targetUserId: string } | { error: string }> {
  const selfId = session.user.id;

  if (!userId || userId === selfId) return { targetUserId: selfId };
  if (session.user.role !== "ADMIN")
    return { error: "他のユーザーの休日を変更する権限がありません" };

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { error: "指定されたユーザーが見つかりません" };

  return { targetUserId: userId };
}

export async function addDayOff(input: {
  date: string;
  userId?: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");

  const parsed = DateString.safeParse(input.date);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const resolved = await resolveTargetUserId(session, input.userId);
  if ("error" in resolved) return { error: resolved.error };
  const { targetUserId } = resolved;

  const date = new Date(`${parsed.data}T00:00:00.000Z`);

  const existing = await prisma.dayOff.findUnique({
    where: { userId_date: { userId: targetUserId, date } },
  });
  if (existing) return { error: "この日付はすでに休日として登録されています" };

  await prisma.dayOff.create({ data: { userId: targetUserId, date } });

  revalidatePath("/day-off");
  return {};
}

export async function removeDayOff(input: {
  date: string;
  userId?: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");

  const parsed = DateString.safeParse(input.date);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const resolved = await resolveTargetUserId(session, input.userId);
  if ("error" in resolved) return { error: resolved.error };
  const { targetUserId } = resolved;

  const date = new Date(`${parsed.data}T00:00:00.000Z`);

  // userId でスコープするため、未登録日付を指定しても 0 件削除で安全に無視される
  await prisma.dayOff.deleteMany({ where: { userId: targetUserId, date } });

  revalidatePath("/day-off");
  return {};
}
