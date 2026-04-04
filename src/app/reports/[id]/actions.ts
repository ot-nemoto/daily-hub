"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { createComment as libCreateComment, deleteComment as libDeleteComment } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { updateReport as libUpdateReport } from "@/lib/reports";

const UpdateReportSchema = z.object({
  workContent: z.string().min(1).max(5000),
  tomorrowPlan: z.string().min(1).max(5000),
  notes: z.string().max(5000).optional().default(""),
});

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(1000),
});

export async function updateReport(input: {
  id: string;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");
  if (session.user.role === "VIEWER") return { error: "日報を編集する権限がありません" };

  const parsed = UpdateReportSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await libUpdateReport({
      id: input.id,
      authorId: session.user.id,
      workContent: parsed.data.workContent,
      tomorrowPlan: parsed.data.tomorrowPlan,
      notes: parsed.data.notes,
    });
    revalidatePath(`/reports/${input.id}`);
    return {};
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "日報が見つかりません" };
    if (e instanceof ForbiddenError) return { error: "この日報を編集する権限がありません" };
    throw e;
  }
}

export async function createComment(input: {
  reportId: string;
  body: string;
}): Promise<{ id?: string; error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");

  const parsed = CreateCommentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const comment = await libCreateComment({
      reportId: input.reportId,
      authorId: session.user.id,
      body: parsed.data.body,
    });
    revalidatePath(`/reports/${input.reportId}`);
    return { id: comment.id };
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "日報が見つかりません" };
    throw e;
  }
}

export async function deleteComment(input: {
  reportId: string;
  commentId: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");

  try {
    await libDeleteComment({
      commentId: input.commentId,
      reportId: input.reportId,
      authorId: session.user.id,
    });
    revalidatePath(`/reports/${input.reportId}`);
    return {};
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "コメントが見つかりません" };
    if (e instanceof ForbiddenError) return { error: "このコメントを削除する権限がありません" };
    throw e;
  }
}
