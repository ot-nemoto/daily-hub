import { type NextRequest, NextResponse } from "next/server";
import { jsonError, serializeDayOff, statusForError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createDayOff, getDayOffs } from "@/lib/day-off";
import { ConflictError } from "@/lib/errors";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { dayOffCreateBodySchema } from "@/lib/schemas/day-off";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const dayOffs = await getDayOffs(user.id);
  return NextResponse.json({ dayOffs: dayOffs.map(serializeDayOff) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  if (user.role === "VIEWER") {
    return jsonError("休日を登録する権限がありません", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = dayOffCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);

  try {
    const dayOff = await createDayOff({ userId: user.id, date });
    return NextResponse.json(serializeDayOff(dayOff), { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) {
      return jsonError("この日付はすでに休日として登録されています", statusForError(error));
    }
    throw error;
  }
}
