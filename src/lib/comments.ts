import { prisma } from "@/lib/prisma";

import { ForbiddenError, NotFoundError } from "./errors";

export async function createComment(input: {
  reportId: string;
  authorId: string;
  body: string;
}): Promise<{ id: string }> {
  const { reportId, authorId, body } = input;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true },
  });
  if (!report) {
    throw new NotFoundError("Report not found");
  }

  const comment = await prisma.comment.create({
    data: { body, reportId, authorId },
    select: { id: true },
  });
  return { id: comment.id };
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
