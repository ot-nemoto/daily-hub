// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  jsonError,
  serializeComment,
  serializeDayOff,
  serializeReport,
  serializeUser,
  statusForError,
  unauthorized,
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
