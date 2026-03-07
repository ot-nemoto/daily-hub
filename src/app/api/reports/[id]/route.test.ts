// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { GET } from "./route";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1", name: "山田 太郎", email: "yamada@example.com" } };

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

describe("GET /api/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 日報が存在する場合 200 と詳細を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
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
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ ...mockReport, comments: [] } as never);

    const res = await GET(new Request("http://localhost/api/reports/report-1"), makeContext("report-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.comments).toEqual([]);
  });

  it("異常系: 未認証で 401 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await GET(new Request("http://localhost/api/reports/report-1"), makeContext("report-1"));

    expect(res.status).toBe(401);
    expect(prisma.report.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しない ID で 404 を返す", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/reports/nonexistent"), makeContext("nonexistent"));

    expect(res.status).toBe(404);
  });
});
