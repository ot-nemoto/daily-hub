import { type NextRequest, NextResponse } from "next/server";

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteReportById } from "@/lib/reports";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 1. Authorization ヘッダーから API キーを取得
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. API キーで DB ユーザーを検索
  const user = await prisma.user.findUnique({
    where: { apiKey },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. ADMIN のみ利用可能
  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "このエンドポイントは ADMIN のみ使用できます" },
      { status: 403 },
    );
  }

  // 4. 日報を削除（コメントも削除）
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
