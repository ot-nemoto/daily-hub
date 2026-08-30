import { type NextRequest, NextResponse } from "next/server";
import {
  adminForbidden,
  jsonError,
  serializeHoliday,
  statusForError,
  unauthorized,
} from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ConflictError } from "@/lib/errors";
import { createHoliday, getHolidays } from "@/lib/holiday";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { holidayCreateBodySchema } from "@/lib/schemas/holiday";

/** `YYYY-MM-DD` を検証して UTC 0 時の Date に変換する。不正なら "invalid"、未指定なら null。 */
function parseDateParam(value: string | null): Date | null | "invalid" {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return "invalid";
  return d;
}

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const from = parseDateParam(url.searchParams.get("from"));
  const to = parseDateParam(url.searchParams.get("to"));
  if (from === "invalid" || to === "invalid") {
    return jsonError("from / to は YYYY-MM-DD 形式で指定してください", 400);
  }

  const range = from || to ? { from: from ?? undefined, to: to ?? undefined } : undefined;
  const holidays = await getHolidays(range);
  return NextResponse.json({ holidays: holidays.map(serializeHoliday) });
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return adminForbidden();

  const body = await req.json().catch(() => null);
  const parsed = holidayCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  const date = new Date(`${parsed.data.date}T00:00:00.000Z`);

  try {
    const holiday = await createHoliday({ date, name: parsed.data.name });
    return NextResponse.json(serializeHoliday(holiday), { status: 201 });
  } catch (error) {
    if (error instanceof ConflictError) {
      return jsonError("この日付はすでに祝日として登録されています", statusForError(error));
    }
    throw error;
  }
}
