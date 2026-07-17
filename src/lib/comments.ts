import { prisma } from "@/lib/prisma";

import { ForbiddenError, NotFoundError } from "./errors";

export async function getComments(reportId: string) {
  return prisma.comment.findMany({
    where: { reportId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createComment(input: { reportId: string; authorId: string; body: string }) {
  const { reportId, authorId, body } = input;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true },
  });
  if (!report) {
    throw new NotFoundError("Report not found");
  }

  // author を含めて返し、呼び出し側（REST の POST）が再取得せず整形できるようにする。
  return prisma.comment.create({
    data: { body, reportId, authorId },
    include: { author: { select: { id: true, name: true } } },
  });
}

export async function deleteComment(input: {
  commentId: string;
  reportId: string;
  authorId: string;
}): Promise<void> {
  const { commentId, reportId, authorId } = input;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, reportId: true },
  });

  if (!comment || comment.reportId !== reportId) {
    throw new NotFoundError("Comment not found");
  }
  if (comment.authorId !== authorId) {
    throw new ForbiddenError("Forbidden");
  }

  await prisma.comment.delete({ where: { id: commentId } });
}

/**
 * 所有者検証つきでコメントを削除する（外部 API の DELETE /api/comments/{id} 用）。
 * パスに reportId を持たないため commentId のみで照合する。
 * 未存在→NotFoundError／他ユーザー→ForbiddenError。
 * reportId スコープつきの UI 用は `deleteComment` を使う。
 */
export async function deleteCommentByAuthor(input: {
  commentId: string;
  authorId: string;
}): Promise<void> {
  const { commentId, authorId } = input;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!comment) {
    throw new NotFoundError("Comment not found");
  }
  if (comment.authorId !== authorId) {
    throw new ForbiddenError("Forbidden");
  }

  await prisma.comment.delete({ where: { id: commentId } });
}
