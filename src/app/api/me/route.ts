import { type NextRequest, NextResponse } from "next/server";
import { jsonError, serializeUser, statusForError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { NotFoundError } from "@/lib/errors";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { meUpdateBodySchema } from "@/lib/schemas/me";
import { getMe, updateMe } from "@/lib/users";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const me = await getMe(user.id);
  if (!me) return jsonError("ユーザーが見つかりません", 404);

  return NextResponse.json(serializeUser(me));
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = meUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const updated = await updateMe({ id: user.id, name: parsed.data.name });
    return NextResponse.json(serializeUser(updated));
  } catch (error) {
    if (error instanceof NotFoundError)
      return jsonError("ユーザーが見つかりません", statusForError(error));
    throw error;
  }
}
