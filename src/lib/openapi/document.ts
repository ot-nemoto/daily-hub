import { z } from "zod";

import { commentCreateBodySchema, commentResponseSchema } from "@/lib/schemas/comment";
import { errorResponseSchema } from "@/lib/schemas/common";
import { dayOffCreateBodySchema, dayOffResponseSchema } from "@/lib/schemas/day-off";
import { meUpdateBodySchema } from "@/lib/schemas/me";
import {
  reportAdminBatchBodySchema,
  reportCreateBodySchema,
  reportResponseSchema,
  reportUpdateBodySchema,
} from "@/lib/schemas/report";
import { userAdminUpdateBodySchema, userResponseSchema } from "@/lib/schemas/user";

/**
 * `additionalProperties` を再帰的に除去する。
 * Zod の `z.object()` は既定で strip（未知キーは受理して無視）だが `z.toJSONSchema()` は
 * `additionalProperties: false` を出力するため、これを残すと「未知フィールドは拒否」と読めて
 * 実サーバー挙動（受理して無視）と食い違う。仕様を実挙動に合わせるため除去する。
 */
function stripAdditionalProperties(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) stripAdditionalProperties(item);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    delete obj.additionalProperties;
    for (const value of Object.values(obj)) stripAdditionalProperties(value);
  }
}

/** Zod スキーマを OpenAPI 3.1（JSON Schema 2020-12）に変換する。`$schema`・`additionalProperties` は除去。 */
function toSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  stripAdditionalProperties(json);
  return json;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** JSON レスポンス定義。 */
const jsonResponse = (description: string, schema: object) => ({
  description,
  content: { "application/json": { schema } },
});

/** `{ key: [Item] }` 形式のリストレスポンス定義。 */
const listResponse = (description: string, key: string, itemName: string) =>
  jsonResponse(description, {
    type: "object",
    properties: { [key]: { type: "array", items: ref(itemName) } },
    required: [key],
  });

/** `{ error }` を返す 4xx レスポンス定義。 */
const errorResponse = (description: string) => jsonResponse(description, ref("Error"));

/** 参照名でリクエストボディを定義する。 */
const jsonBody = (name: string) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});

/** 任意スキーマでリクエストボディを定義する。 */
const jsonBodyRaw = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } },
});

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "対象リソースの ID",
};

/** 日報バッチ upsert の結果（`POST /api/reports`・`POST /api/admin/reports`）。 */
const upsertResults = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "YYYY-MM-DD" },
          id: { type: "string" },
          status: { type: "string", enum: ["created", "updated"] },
        },
        required: ["date", "id", "status"],
      },
    },
  },
  required: ["results"],
};

const infoDescription = [
  "daily-hub の外部 REST API。日報・コメント・休日・プロフィール、および ADMIN 向けのユーザー管理を提供する。",
  "",
  "## 認証",
  "個人設定で発行した API キーを `Authorization: Bearer <api-key>` ヘッダーに付与する。無効・未指定は `401` を返す。",
  "",
  "## 共通仕様",
  '- エラーは一律 `{ "error": string }`（日本語メッセージ）。',
  "- 日付は `YYYY-MM-DD`、日時は ISO 8601。",
  "- ロール別: 日報の作成・編集・削除、休日の登録・解除は `VIEWER` 不可（`403`）。コメントは全ロール可。ADMIN 系は `ADMIN` のみ（`403`）。",
  "",
  "## クイックスタート",
  "```sh",
  'curl -H "Authorization: Bearer <api-key>" https://<host>/api/reports',
  "```",
].join("\n");

/** OpenAPI 3.1 ドキュメントを組み立てる。`serverUrl`（アクセス元オリジン）があれば servers 先頭に置く。 */
export function buildOpenApiDocument(options: { version?: string; serverUrl?: string } = {}) {
  const localhost = "http://localhost:3000";
  // アクセス元オリジンが localhost（ポート違い含む）なら、固定の localhost 候補は紛らわしいので加えない。
  const originIsLocalhost = options.serverUrl
    ? new URL(options.serverUrl).hostname === "localhost"
    : false;
  const servers = [
    ...(options.serverUrl ? [{ url: options.serverUrl }] : []),
    ...(originIsLocalhost ? [] : [{ url: localhost, description: "ローカル開発" }]),
  ];

  return {
    openapi: "3.1.0",
    info: {
      title: "daily-hub API",
      version: options.version ?? "0.0.0",
      description: infoDescription,
    },
    servers,
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "個人設定で発行した API キー",
        },
      },
      schemas: {
        Error: toSchema(errorResponseSchema),
        User: toSchema(userResponseSchema),
        MeUpdateBody: toSchema(meUpdateBodySchema),
        Report: toSchema(reportResponseSchema),
        ReportCreateBody: toSchema(reportCreateBodySchema),
        ReportUpdateBody: toSchema(reportUpdateBodySchema),
        ReportAdminBatchBody: toSchema(reportAdminBatchBodySchema),
        Comment: toSchema(commentResponseSchema),
        CommentCreateBody: toSchema(commentCreateBodySchema),
        DayOff: toSchema(dayOffResponseSchema),
        DayOffCreateBody: toSchema(dayOffCreateBodySchema),
        UserAdminUpdateBody: toSchema(userAdminUpdateBodySchema),
      },
    },
    paths: {
      "/api/me": {
        get: {
          operationId: "getMe",
          summary: "自分のプロフィールを取得",
          tags: ["me"],
          responses: {
            200: jsonResponse("プロフィール", ref("User")),
            401: errorResponse("認証エラー"),
            404: errorResponse("ユーザーが存在しない"),
          },
        },
        patch: {
          operationId: "updateMe",
          summary: "自分の氏名を更新",
          tags: ["me"],
          requestBody: jsonBody("MeUpdateBody"),
          responses: {
            200: jsonResponse("更新後のプロフィール", ref("User")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            404: errorResponse("ユーザーが存在しない"),
          },
        },
      },
      "/api/reports": {
        get: {
          operationId: "listReports",
          summary: "日報一覧を取得（date / from・to / authorId で絞り込み）",
          tags: ["reports"],
          parameters: [
            { name: "date", in: "query", schema: { type: "string" }, description: "YYYY-MM-DD" },
            {
              name: "from",
              in: "query",
              schema: { type: "string" },
              description: "YYYY-MM-DD（to とセット）",
            },
            {
              name: "to",
              in: "query",
              schema: { type: "string" },
              description: "YYYY-MM-DD（from とセット）",
            },
            { name: "authorId", in: "query", schema: { type: "string" } },
          ],
          responses: {
            200: listResponse("日報の一覧", "reports", "Report"),
            400: errorResponse("クエリのバリデーションエラー"),
            401: errorResponse("認証エラー"),
          },
        },
        post: {
          operationId: "upsertReports",
          summary: "日報を作成/更新（単体または配列で一括 upsert）",
          tags: ["reports"],
          requestBody: jsonBodyRaw({
            oneOf: [ref("ReportCreateBody"), { type: "array", items: ref("ReportCreateBody") }],
          }),
          responses: {
            200: jsonResponse("upsert 結果（既存を含む場合）", upsertResults),
            201: jsonResponse("upsert 結果（全件新規作成）", upsertResults),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("VIEWER は作成できない"),
          },
        },
      },
      "/api/reports/{id}": {
        get: {
          operationId: "getReport",
          summary: "日報を1件取得",
          tags: ["reports"],
          parameters: [idParam],
          responses: {
            200: jsonResponse("日報", ref("Report")),
            401: errorResponse("認証エラー"),
            404: errorResponse("未存在"),
          },
        },
        patch: {
          operationId: "updateReport",
          summary: "自分の日報を更新",
          tags: ["reports"],
          parameters: [idParam],
          requestBody: jsonBody("ReportUpdateBody"),
          responses: {
            200: jsonResponse("更新後の日報", ref("Report")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("VIEWER または他ユーザーの日報"),
            404: errorResponse("未存在"),
          },
        },
        delete: {
          operationId: "deleteReport",
          summary: "自分の日報を削除",
          tags: ["reports"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("VIEWER または他ユーザーの日報"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/reports/{id}/comments": {
        get: {
          operationId: "listReportComments",
          summary: "日報のコメント一覧を取得",
          tags: ["comments"],
          parameters: [idParam],
          responses: {
            200: listResponse("コメントの一覧", "comments", "Comment"),
            401: errorResponse("認証エラー"),
            404: errorResponse("対象の日報が未存在"),
          },
        },
        post: {
          operationId: "createReportComment",
          summary: "日報にコメントを投稿",
          tags: ["comments"],
          parameters: [idParam],
          requestBody: jsonBody("CommentCreateBody"),
          responses: {
            201: jsonResponse("作成されたコメント", ref("Comment")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            404: errorResponse("対象の日報が未存在"),
          },
        },
      },
      "/api/comments/{id}": {
        delete: {
          operationId: "deleteComment",
          summary: "自分のコメントを削除",
          tags: ["comments"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("他ユーザーのコメント"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/day-off": {
        get: {
          operationId: "listDayOffs",
          summary: "自分の休日一覧を取得",
          tags: ["day-off"],
          responses: {
            200: listResponse("休日の一覧", "dayOffs", "DayOff"),
            401: errorResponse("認証エラー"),
          },
        },
        post: {
          operationId: "createDayOff",
          summary: "休日を登録",
          tags: ["day-off"],
          requestBody: jsonBody("DayOffCreateBody"),
          responses: {
            201: jsonResponse("登録された休日", ref("DayOff")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("VIEWER は登録できない"),
            409: errorResponse("同日が既に登録済み"),
          },
        },
      },
      "/api/day-off/{id}": {
        delete: {
          operationId: "deleteDayOff",
          summary: "自分の休日を解除",
          tags: ["day-off"],
          parameters: [idParam],
          responses: {
            204: { description: "解除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("VIEWER は解除できない"),
            404: errorResponse("未存在 / 他ユーザーの休日"),
          },
        },
      },
      "/api/admin/users": {
        get: {
          operationId: "adminListUsers",
          summary: "ユーザー一覧を取得（ADMIN）",
          tags: ["admin"],
          responses: {
            200: listResponse("ユーザーの一覧", "users", "User"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 以外"),
          },
        },
      },
      "/api/admin/users/{id}": {
        patch: {
          operationId: "adminUpdateUser",
          summary: "ユーザーのロール・有効状態を更新（ADMIN）",
          tags: ["admin"],
          parameters: [idParam],
          requestBody: jsonBody("UserAdminUpdateBody"),
          responses: {
            200: jsonResponse("更新後のユーザー", ref("User")),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 以外 / 自分自身または最後の管理者"),
            404: errorResponse("未存在"),
          },
        },
        delete: {
          operationId: "adminDeleteUser",
          summary: "ユーザーを削除（ADMIN）",
          tags: ["admin"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 以外 / 自分自身または最後の管理者"),
            404: errorResponse("未存在"),
          },
        },
      },
      "/api/admin/reports": {
        post: {
          operationId: "adminBatchReports",
          summary: "日報をバッチ登録（ADMIN・userName で対象ユーザーを解決）",
          tags: ["admin"],
          requestBody: jsonBody("ReportAdminBatchBody"),
          responses: {
            200: jsonResponse("upsert 結果", upsertResults),
            400: errorResponse("バリデーションエラー"),
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 以外"),
          },
        },
      },
      "/api/admin/reports/{id}": {
        delete: {
          operationId: "adminDeleteReport",
          summary: "日報を削除（ADMIN・所有者検証なし）",
          tags: ["admin"],
          parameters: [idParam],
          responses: {
            204: { description: "削除成功（ボディなし）" },
            401: errorResponse("認証エラー"),
            403: errorResponse("ADMIN 以外"),
            404: errorResponse("未存在"),
          },
        },
      },
    },
  };
}
