import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { deleteComment } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId, commentId } = await params;

  try {
    await deleteComment({ commentId, reportId, authorId: session.user.id });
    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
