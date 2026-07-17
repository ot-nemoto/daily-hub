import { type NextRequest, NextResponse } from "next/server";
import { jsonError, serializeComment, statusForError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { createComment, getComments } from "@/lib/comments";
import { NotFoundError } from "@/lib/errors";
import { getReportById } from "@/lib/reports";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { commentCreateBodySchema } from "@/lib/schemas/comment";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const report = await getReportById(id);
  if (!report) return jsonError("日報が見つかりません", 404);

  const comments = await getComments(id);
  return NextResponse.json({ comments: comments.map(serializeComment) });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = commentCreateBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  try {
    const comment = await createComment({
      reportId: id,
      authorId: user.id,
      body: parsed.data.body,
    });
    return NextResponse.json(serializeComment(comment), { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError)
      return jsonError("日報が見つかりません", statusForError(error));
    throw error;
  }
}
