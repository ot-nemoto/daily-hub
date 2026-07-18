import { type NextRequest, NextResponse } from "next/server";
import { adminForbidden, jsonError, statusForError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { NotFoundError } from "@/lib/errors";
import { deleteReportById } from "@/lib/reports";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return adminForbidden();

  const { id } = await params;

  try {
    await deleteReportById({ id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonError("指定された日報が見つかりません", statusForError(error));
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
