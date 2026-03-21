import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId, commentId } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, reportId: true },
  });

  if (!comment || comment.reportId !== reportId) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });

  return new Response(null, { status: 204 });
}
