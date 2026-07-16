import { type NextRequest, NextResponse } from "next/server";
import { jsonError, serializeReport, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteReportByAuthor, getReportById, updateReport } from "@/lib/reports";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { reportUpdateBodySchema } from "@/lib/schemas/report";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const report = await getReportById(id);
  if (!report) return jsonError("日報が見つかりません", 404);

  return NextResponse.json(serializeReport(report));
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  if (user.role === "VIEWER") {
    return jsonError("日報を編集する権限がありません", 403);
  }

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = reportUpdateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    await updateReport({ id, authorId: user.id, ...parsed.data });
  } catch (error) {
    if (error instanceof NotFoundError) return jsonError("日報が見つかりません", 404);
    if (error instanceof ForbiddenError) {
      return jsonError("この日報を編集する権限がありません", 403);
    }
    throw error;
  }

  const updated = await getReportById(id);
  if (!updated) return jsonError("日報が見つかりません", 404);
  return NextResponse.json(serializeReport(updated));
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    await deleteReportByAuthor({ id, authorId: user.id });
  } catch (error) {
    if (error instanceof NotFoundError) return jsonError("日報が見つかりません", 404);
    if (error instanceof ForbiddenError) {
      return jsonError("この日報を削除する権限がありません", 403);
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
