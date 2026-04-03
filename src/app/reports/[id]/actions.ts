"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { createComment as libCreateComment, deleteComment as libDeleteComment } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { updateReport as libUpdateReport } from "@/lib/reports";

export async function updateReport(input: {
  id: string;
  workContent: string;
  tomorrowPlan: string;
  notes: string;
}): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return redirect("/login");
  if (session.user.role === "VIEWER") return { error: "日報を編集する権限がありません" };

  try {
    await libUpdateReport({
      id: input.id,
      authorId: session.user.id,
      workContent: input.workContent,
      tomorrowPlan: input.tomorrowPlan,
      notes: input.notes,
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

  try {
    const comment = await libCreateComment({
      reportId: input.reportId,
      authorId: session.user.id,
      body: input.body,
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
