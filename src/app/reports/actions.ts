"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { ConflictError } from "@/lib/errors";
import { createReport as libCreateReport } from "@/lib/reports";

export async function createReport(input: {
  date: string;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");
  if (session.user.role === "VIEWER") return { error: "日報を作成する権限がありません" };

  try {
    const report = await libCreateReport({
      date: new Date(`${input.date}T00:00:00.000Z`),
      workContent: input.workContent,
      tomorrowPlan: input.tomorrowPlan,
      notes: input.notes,
      authorId: session.user.id,
    });
    revalidatePath("/reports/daily");
    return { id: report.id };
  } catch (e) {
    if (e instanceof ConflictError) return { error: "この日付の日報はすでに作成済みです" };
    throw e;
  }
}
