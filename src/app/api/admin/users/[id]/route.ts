import { type NextRequest, NextResponse } from "next/server";
import {
  adminForbidden,
  jsonError,
  serializeUser,
  statusForError,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { userAdminUpdateBodySchema } from "@/lib/schemas/user";
import { deleteUser, updateUserAdmin } from "@/lib/users";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return adminForbidden();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = userAdminUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const updated = await updateUserAdmin({ id, currentUserId: user.id, ...parsed.data });
    return NextResponse.json(serializeUser(updated));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonError("指定されたユーザーが見つかりません", statusForError(error));
    }
    if (error instanceof ForbiddenError) {
      return jsonError(
        "自分自身または最後の管理者のロール・有効状態は変更できません",
        statusForError(error),
      );
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return adminForbidden();

  const { id } = await params;

  try {
    await deleteUser({ id, currentUserId: user.id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonError("指定されたユーザーが見つかりません", statusForError(error));
    }
    if (error instanceof ForbiddenError) {
      return jsonError("自分自身または最後の管理者は削除できません", statusForError(error));
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
