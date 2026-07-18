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
