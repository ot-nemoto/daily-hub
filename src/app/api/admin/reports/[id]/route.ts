import { type NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/apiAuth";
import { NotFoundError } from "@/lib/errors";
import { deleteReportById } from "@/lib/reports";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. 認証
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. ADMIN のみ利用可能
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "このエンドポイントは ADMIN のみ使用できます" },
      { status: 403 },
    );
  }

  // 3. 日報を削除（コメントも削除）
  const { id } = await params;
  try {
    await deleteReportById({ id });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "指定された日報が見つかりません" }, { status: 404 });
    }
    throw error;
  }

  return new NextResponse(null, { status: 204 });
}
