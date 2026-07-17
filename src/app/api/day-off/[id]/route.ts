import { type NextRequest, NextResponse } from "next/server";
import { jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { deleteDayOffByOwner } from "@/lib/day-off";
import { NotFoundError } from "@/lib/errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  if (user.role === "VIEWER") {
    return jsonError("休日を解除する権限がありません", 403);
  }

  const { id } = await params;

  try {
    await deleteDayOffByOwner({ id, userId: user.id });
  } catch (error) {
    if (error instanceof NotFoundError)
      return jsonError("休日が見つかりません", statusForError(error));
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
