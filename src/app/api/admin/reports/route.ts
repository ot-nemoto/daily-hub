import { type NextRequest, NextResponse } from "next/server";
import { adminForbidden, jsonError, unauthorized } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/apiAuth";
import { resolveOrCreateUserByName, upsertReportByAuthorId } from "@/lib/reports";
import { firstZodError } from "@/lib/schemas/_zod-error";
import { reportAdminBatchBodySchema } from "@/lib/schemas/report";

export async function POST(req: NextRequest) {
  // 1. 認証
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  // 2. ADMIN のみ利用可能
  if (user.role !== "ADMIN") return adminForbidden();

  // 3. リクエストボディのバリデーション
  const body = await req.json().catch(() => null);
  const parsed = reportAdminBatchBodySchema.safeParse(body);
  if (!parsed.success) return jsonError(firstZodError(parsed.error), 400);

  // 4. ユニークな userName を事前に順次解決（並列 create による重複ユーザー作成を防ぐ）
  const uniqueUserNames = [...new Set(parsed.data.map((d) => d.userName))];
  const userMap = new Map<string, string>();
  for (const userName of uniqueUserNames) {
    const resolved = await resolveOrCreateUserByName(userName);
    userMap.set(userName, resolved.id);
  }

  // 5. 各レポートを upsert
  const results = await Promise.all(
    parsed.data.map(async ({ userName, date, workContent, tomorrowPlan, notes }) => {
      const authorId = userMap.get(userName);
      if (!authorId) throw new Error(`userName not resolved: ${userName}`);
      const { id, status } = await upsertReportByAuthorId({
        authorId,
        date: new Date(`${date}T00:00:00.000Z`),
        workContent,
        tomorrowPlan,
        notes,
      });
      return { date, id, status };
    }),
  );

  return NextResponse.json({ results }, { status: 200 });
}
