// @vitest-environment node
import { notFound, redirect } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  jsonError,
  serializeComment,
  serializeDayOff,
  serializeReport,
  serializeUser,
  statusForError,
  unauthorized,
  withApiErrorHandling,
} from "./api-response";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";

describe("statusForError", () => {
  it("ForbiddenError → 403", () => {
    expect(statusForError(new ForbiddenError())).toBe(403);
  });
  it("NotFoundError → 404", () => {
    expect(statusForError(new NotFoundError())).toBe(404);
  });
  it("ConflictError → 409", () => {
    expect(statusForError(new ConflictError())).toBe(409);
  });
  it("未知のエラー → 500", () => {
    expect(statusForError(new Error("boom"))).toBe(500);
  });
});

describe("jsonError / unauthorized", () => {
  it("jsonError は指定ステータスと { error } を返す", async () => {
    const res = jsonError("だめ", 409);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "だめ" });
  });

  it("unauthorized は 401 と { error: 'Unauthorized' } を返す", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});

describe("serializeReport", () => {
  it("date を YYYY-MM-DD に、author を authorName に平坦化する", () => {
    expect(
      serializeReport({
        id: "r1",
        date: new Date("2026-07-15T00:00:00.000Z"),
        authorId: "u1",
        author: { name: "太郎" },
        workContent: "w",
        tomorrowPlan: "t",
        notes: "n",
      }),
    ).toEqual({
      id: "r1",
      date: "2026-07-15",
      authorId: "u1",
      authorName: "太郎",
      workContent: "w",
      tomorrowPlan: "t",
      notes: "n",
    });
  });
});

describe("serializeComment", () => {
  it("createdAt を ISO に、author を authorName に平坦化する", () => {
    expect(
      serializeComment({
        id: "c1",
        body: "コメント",
        authorId: "u1",
        author: { name: "太郎" },
        createdAt: new Date("2026-07-15T01:02:03.000Z"),
      }),
    ).toEqual({
      id: "c1",
      body: "コメント",
      authorId: "u1",
      authorName: "太郎",
      createdAt: "2026-07-15T01:02:03.000Z",
    });
  });
});

describe("serializeDayOff", () => {
  it("date を YYYY-MM-DD に整形する", () => {
    expect(serializeDayOff({ id: "d1", date: new Date("2026-07-15T00:00:00.000Z") })).toEqual({
      id: "d1",
      date: "2026-07-15",
    });
  });
});

describe("serializeUser", () => {
  it("ユーザーをそのまま整形する", () => {
    expect(
      serializeUser({
        id: "u1",
        name: "太郎",
        email: "taro@example.com",
        role: "ADMIN",
        isActive: true,
      }),
    ).toEqual({
      id: "u1",
      name: "太郎",
      email: "taro@example.com",
      role: "ADMIN",
      isActive: true,
    });
  });
});

describe("withApiErrorHandling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常系: ハンドラの戻り値をそのまま返す", async () => {
    const handler = withApiErrorHandling(async () => new Response("ok", { status: 200 }));

    const res = await handler();

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("ok");
  });

  it("正常系: 引数をそのままハンドラへ渡す", async () => {
    const ctx = { params: Promise.resolve({ id: "x" }) };
    const spy = vi.fn(async (_a: string, _c: typeof ctx) => new Response(null, { status: 204 }));
    const handler = withApiErrorHandling(spy);

    await handler("a", ctx);

    expect(spy).toHaveBeenCalledWith("a", ctx);
  });

  it("異常系: 例外を 500 { error } に変換する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      throw new Error("DB connection lost");
    });

    const res = await handler();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Internal Server Error" });
  });

  it("異常系: 例外の内容をレスポンスに含めない（ログにのみ残す）", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const secret = "postgresql://user:password@host/db";
    const handler = withApiErrorHandling(async () => {
      throw new Error(secret);
    });

    const res = await handler();

    await expect(res.text()).resolves.not.toContain(secret);
    expect(spy).toHaveBeenCalled();
  });

  // Next.js は digest で制御フロー例外を識別する。toThrow() だけだと、
  // 例外を包み直して再 throw する実装（new Error(..., { cause: e })）でも通ってしまい、
  // 本番ではリダイレクトが 500 に化ける。digest まで固定する。
  it("異常系: redirect() の制御フロー例外は digest を保ったまま再 throw する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      redirect("/login");
    });

    await expect(handler()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("異常系: notFound() の制御フロー例外は digest を保ったまま再 throw する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => {
      notFound();
    });

    await expect(handler()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_HTTP_ERROR_FALLBACK"),
    });
  });

  it("正常系: 監査ログを 1 件出力する（ステータスはハンドラの戻り値）", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(
      async (_req: Request) => new Response(null, { status: 204 }),
    );

    await handler(new Request("https://example.com/api/day-off/x1", { method: "DELETE" }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      type: "audit",
      method: "DELETE",
      path: "/api/day-off/x1",
      status: 204,
    });
  });

  // 認証失敗も記録する。userId が取れないため、総当たりの検知は IP に依存する。
  it("正常系: 401 でも記録し、userId は null になる", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => unauthorized());

    await handler(
      new Request("https://example.com/api/reports", {
        headers: { "x-forwarded-for": "203.0.113.9" },
      }),
    );

    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({
      status: 401,
      userId: null,
      ip: "203.0.113.9",
    });
  });

  // logAudit は成功応答を返した後・try 内で呼ばれる。ここで例外が漏れると
  // ラッパーの catch に捕まり、成功済みの 200 が 500 に化ける。
  it("異常系: 監査ログの出力が全滅しても応答のステータスを変えない", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("stdout closed");
    });
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("stderr closed");
    });
    const handler = withApiErrorHandling(async (_req: Request) => new Response("ok"));

    const res = await handler(new Request("https://example.com/api/items"));

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("ok");
  });

  it("異常系: 500 に化けた場合も記録する", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => {
      throw new Error("DB connection lost");
    });

    await handler(new Request("https://example.com/api/reports", { method: "POST" }));

    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({ status: 500 });
  });

  // 制御フロー例外は再 throw するため、ステータスが確定しない。記録しない。
  it("異常系: redirect() の再 throw 時は記録しない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => {
      redirect("/login");
    });

    await expect(handler(new Request("https://example.com/api/me"))).rejects.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it("異常系: Request が渡っていなければ記録しない", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiErrorHandling(async () => new Response("ok"));

    await handler();

    expect(spy).not.toHaveBeenCalled();
  });

  it("異常系: Request が渡っていればメソッドとパスをログに含める", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiErrorHandling(async (_req: Request) => {
      throw new Error("boom");
    });

    await handler(new Request("https://example.com/api/reports", { method: "POST" }));

    expect(spy.mock.calls[0][0]).toContain("POST /api/reports");
  });
});
