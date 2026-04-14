import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// POST /api/reports リクエストスキーマ
export const CreateReportSchema = registry.register(
  "CreateReportRequest",
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date は YYYY-MM-DD 形式で入力してください")
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
      }, "date は実在する日付を入力してください")
      .openapi({ example: "2026-04-14" }),
    workContent: z
      .string()
      .min(1, "workContent は必須です")
      .max(5000)
      .openapi({ example: "○○機能の実装" }),
    tomorrowPlan: z
      .string()
      .min(1, "tomorrowPlan は必須です")
      .max(5000)
      .openapi({ example: "○○機能のテスト作成" }),
    notes: z
      .string()
      .max(5000)
      .default("")
      .openapi({ example: "詰まった点など" }),
  }),
);

registry.registerPath({
  method: "post",
  path: "/api/reports",
  summary: "日報作成",
  description: "APIキー認証で日報を作成します。MEMBER・ADMIN ロールのみ利用可能です。",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: CreateReportSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "作成成功",
      content: {
        "application/json": {
          schema: z.object({ id: z.string().openapi({ example: "clxxxxxxxxxxxxxxxx" }) }),
        },
      },
    },
    401: {
      description: "未認証（APIキーなし・無効・アカウント無効）",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "権限不足（VIEWER ロール）",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    409: {
      description: "同日の日報が既存",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    422: {
      description: "バリデーションエラー",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export function generateOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "daily-hub API",
      version: "1.0.0",
      description: "外部連携用 REST API（APIキー認証）",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "個人設定ページで発行した API キーを指定",
        },
      },
    },
  });
}
