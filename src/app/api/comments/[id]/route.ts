import { type NextRequest, NextResponse } from "next/server";
import { jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteCommentByAuthor } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    await deleteCommentByAuthor({ commentId: id, authorId: user.id });
  } catch (error) {
    if (error instanceof NotFoundError)
      return jsonError("コメントが見つかりません", statusForError(error));
    if (error instanceof ForbiddenError) {
      return jsonError("このコメントを削除する権限がありません", statusForError(error));
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
