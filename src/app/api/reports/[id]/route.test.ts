// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { GET, PUT } from "./route";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com", role: "MEMBER", isActive: true } };
const mockViewerSession = { user: { id: "user-2", name: "閲覧 ユーザー", email: "viewer@example.com", role: "VIEWER", isActive: true } };

const now = new Date("2026-03-06T12:00:00.000Z");
const mockReport = {
  id: "report-1",
  date: new Date("2026-03-06T00:00:00.000Z"),
  workContent: "○○機能の実装",
  tomorrowPlan: "レビュー対応",
  notes: "DBの設計で詰まった",
  authorId: "user-1",
  createdAt: now,
  updatedAt: now,
  author: { id: "user-1", name: "山田 太郎" },
  comments: [
    {
      id: "comment-1",
      body: "お疲れ様です",
      author: { id: "user-2", name: "鈴木 花子" },
      createdAt: new Date("2026-03-06T19:00:00.000Z"),
    },
  ],
};

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ----------------------------------------------------------------
// GET /api/reports/[id]
// ----------------------------------------------------------------
describe("GET /api/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 日報が存在する場合 200 と詳細を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(mockReport as never);

    const res = await GET(new Request("http://localhost/api/reports/report-1"), makeContext("report-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      id: "report-1",
      date: "2026-03-06",
      workContent: "○○機能の実装",
      tomorrowPlan: "レビュー対応",
      notes: "DBの設計で詰まった",
      author: { id: "user-1", name: "山田 太郎" },
      comments: [
        {
          id: "comment-1",
          body: "お疲れ様です",
          author: { id: "user-2", name: "鈴木 花子" },
          createdAt: "2026-03-06T19:00:00.000Z",
        },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(prisma.report.findUnique).toHaveBeenCalledWith({
      where: { id: "report-1" },
      include: {
        author: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  it("正常系: コメントなしの日報も正しく返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ ...mockReport, comments: [] } as never);

    const res = await GET(new Request("http://localhost/api/reports/report-1"), makeContext("report-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.comments).toEqual([]);
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await GET(new Request("http://localhost/api/reports/report-1"), makeContext("report-1"));

    expect(res.status).toBe(401);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しない ID で 404 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/reports/nonexistent"), makeContext("nonexistent"));

    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// PUT /api/reports/[id]
// ----------------------------------------------------------------
describe("PUT /api/reports/[id]", () => {
  const validBody = {
    workContent: "○○機能の実装（完了）",
    tomorrowPlan: "レビュー対応",
    notes: "解決できた",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 自分の日報を更新して 200 と id を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ authorId: "user-1" } as never);
    vi.mocked(prisma.report.update).mockResolvedValue({ id: "report-1" } as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ id: "report-1" });
    expect(prisma.report.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: { workContent: validBody.workContent, tomorrowPlan: validBody.tomorrowPlan, notes: validBody.notes },
      select: { id: true },
    });
  });

  it("正常系: notes 省略時は空文字で更新される", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ authorId: "user-1" } as never);
    vi.mocked(prisma.report.update).mockResolvedValue({ id: "report-1" } as never);

    const { notes: _notes, ...bodyWithoutNotes } = validBody;
    await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(bodyWithoutNotes),
      }),
      makeContext("report-1"),
    );

    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notes: "" }) }),
    );
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(null as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(401);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: workContent が空で 400 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify({ ...validBody, workContent: "" }),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(400);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しない ID で 404 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

    const res = await PUT(
      new Request("http://localhost/api/reports/nonexistent", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("nonexistent"),
    );

    expect(res.status).toBe(404);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it("異常系: 他ユーザーの日報で 403 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);
    // authorId が別ユーザー
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ authorId: "user-99" } as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(403);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it("異常系: 不正な JSON で 400 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockSession as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: "not json",
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(400);
  });

  it("異常系: VIEWER ロールで 403 を返す", async () => {
    const { getSession } = await import("@/lib/auth");
    vi.mocked(getSession).mockResolvedValue(mockViewerSession as never);

    const res = await PUT(
      new Request("http://localhost/api/reports/report-1", {
        method: "PUT",
        body: JSON.stringify(validBody),
      }),
      makeContext("report-1"),
    );

    expect(res.status).toBe(403);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});
