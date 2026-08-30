"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { deleteHolidayByDate, upsertHoliday } from "@/lib/holiday";

const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で入力してください")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "実在する日付を入力してください");

export async function saveHoliday(input: {
  date: string;
  name?: string | null;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");
  if (session.user.role !== "ADMIN") return { error: "祝日を設定する権限がありません" };

  const parsed = DateString.safeParse(input.date);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const name = input.name?.trim() ? input.name.trim() : null;
  if (name && name.length > 50) return { error: "名称は50文字以内で入力してください" };

  const date = new Date(`${parsed.data}T00:00:00.000Z`);
  await upsertHoliday({ date, name });

  revalidatePath("/admin/holidays");
  revalidatePath("/reports/status");
  return {};
}

export async function removeHoliday(input: { date: string }): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");
  if (session.user.role !== "ADMIN") return { error: "祝日を解除する権限がありません" };

  const parsed = DateString.safeParse(input.date);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const date = new Date(`${parsed.data}T00:00:00.000Z`);
  await deleteHolidayByDate({ date });

  revalidatePath("/admin/holidays");
  revalidatePath("/reports/status");
  return {};
}
