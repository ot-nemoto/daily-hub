"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { ConflictError } from "@/lib/errors";
import { createReport as libCreateReport } from "@/lib/reports";

const CreateReportSchema = z.object({
  date: z.string().date(),
  workContent: z.string().min(1).max(5000),
  tomorrowPlan: z.string().min(1).max(5000),
  notes: z.string().max(5000).optional().default(""),
});

export async function createReport(input: {
  date: string;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");
  if (session.user.role === "VIEWER") return { error: "日報を作成する権限がありません" };

  const parsed = CreateReportSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const report = await libCreateReport({
      date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      workContent: parsed.data.workContent,
      tomorrowPlan: parsed.data.tomorrowPlan,
      notes: parsed.data.notes,
      authorId: session.user.id,
    });
    revalidatePath("/reports/daily");
    return { id: report.id };
  } catch (e) {
    if (e instanceof ConflictError) return { error: "この日付の日報はすでに作成済みです" };
    throw e;
  }
}
