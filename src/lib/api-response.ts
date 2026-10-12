import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

import { ConflictError, ForbiddenError, NotFoundError } from "./errors";

/** `{ error }` ボディ付きのエラーレスポンスを返す。 */
export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** 認証失敗（401）レスポンス。 */
export function unauthorized() {
  return jsonError("Unauthorized", 401);
}

/**
 * ルートハンドラを包み、捕捉されない例外を `500 { error }` に変換する。
 *
 * lib は業務エラーを型付きで throw し、ルートがそれを `statusForError()` で変換する。
 * そこに該当しない例外（DB 障害等）は Next.js 既定の 500 になり、spec が定める
 * `{ error }` 形式にならないため、ここで受け止める。
 *
 * 各ルートに try/catch を書き並べると書き漏れが起きるため共通化している
 * （実際、導入前は 13 ルート中 3 つが try/catch を持っていなかった）。
 *
 * 例外の内容（接続先・スタック等）はレスポンスに含めず、ログにのみ残す。
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (e) {
      // redirect() / notFound() 等は例外で制御フローを表現する。先に再 throw しないと
      // 500 に化ける（現時点の API ルートでは未使用だが、後から足した人が気づけない）。
      unstable_rethrow(e);
      const req = args[0];
      const where = req instanceof Request ? `${req.method} ${new URL(req.url).pathname}` : "";
      console.error(`[api] 500 ${where}`.trimEnd(), e);
      return jsonError("Internal Server Error", 500);
    }
  };
}

/** ADMIN 以外による admin エンドポイントへのアクセス（403）レスポンス。 */
export function adminForbidden() {
  return jsonError("このエンドポイントは ADMIN のみ使用できます", 403);
}

/**
 * lib が throw する型付きエラーを HTTP ステータスにマッピングする。
 * 既知の業務エラー以外（DB 障害等）は 500 とし、呼び出し側で再 throw する想定。
 */
export function statusForError(error: unknown): number {
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  return 500;
}

type SerializableReport = {
  id: string;
  date: Date;
  authorId: string;
  author: { name: string };
  workContent: string;
  tomorrowPlan: string;
  notes: string;
};

/** 日報を外部 API レスポンス形式（`date` は YYYY-MM-DD・`authorName` を平坦化）に整形する。 */
export function serializeReport(r: SerializableReport) {
  return {
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    authorId: r.authorId,
    authorName: r.author.name,
    workContent: r.workContent,
    tomorrowPlan: r.tomorrowPlan,
    notes: r.notes,
  };
}

type SerializableComment = {
  id: string;
  body: string;
  authorId: string;
  author: { name: string };
  createdAt: Date;
};

/** コメントを外部 API レスポンス形式（`createdAt` は ISO・`authorName` を平坦化）に整形する。 */
export function serializeComment(c: SerializableComment) {
  return {
    id: c.id,
    body: c.body,
    authorId: c.authorId,
    authorName: c.author.name,
    createdAt: c.createdAt.toISOString(),
  };
}

type SerializableDayOff = { id: string; date: Date };

/** 休日を外部 API レスポンス形式（`date` は YYYY-MM-DD）に整形する。 */
export function serializeDayOff(d: SerializableDayOff) {
  return {
    id: d.id,
    date: d.date.toISOString().slice(0, 10),
  };
}

type SerializableHoliday = { id: string; date: Date; name: string | null };

/** 祝日を外部 API レスポンス形式（`date` は YYYY-MM-DD・`name` は null 許容）に整形する。 */
export function serializeHoliday(h: SerializableHoliday) {
  return {
    id: h.id,
    date: h.date.toISOString().slice(0, 10),
    name: h.name,
  };
}

type SerializableUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

/** ユーザーを外部 API レスポンス形式に整形する（admin 一覧・プロフィール共通）。 */
export function serializeUser(u: SerializableUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
  };
}
