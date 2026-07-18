// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createComment, deleteComment, deleteCommentByAuthor, getComments } from "./comments";
import { ForbiddenError, NotFoundError } from "./errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("getComments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 指定した日報のコメントを作成日時の昇順で取得する", async () => {
    const rows = [
      { id: "comment-1", body: "1件目", createdAt: new Date(), author: { id: "u1", name: "太郎" } },
    ];
    vi.mocked(prisma.comment.findMany).mockResolvedValue(rows as never);

    const result = await getComments("report-1");

    expect(result).toBe(rows);
    expect(prisma.comment.findMany).toHaveBeenCalledWith({
      where: { reportId: "report-1" },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("createComment", () => {
  const input = {
    reportId: "report-1",
    authorId: "user-1",
    body: "お疲れ様です",
  };

  beforeEach(() => vi.clearAllMocks());

  it("正常系: コメントを作成し author を含めて返す", async () => {
    const created = { id: "comment-1", body: input.body, author: { id: "user-1", name: "太郎" } };
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ id: "report-1" } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue(created as never);

    const result = await createComment(input);

    expect(result).toEqual(created);
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { body: input.body, reportId: input.reportId, authorId: input.authorId },
      include: { author: { select: { id: true, name: true } } },
    });
  });

  it("異常系: 存在しない reportId で NotFoundError を投げる", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

    await expect(createComment(input)).rejects.toThrow(NotFoundError);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });
});

describe("deleteComment", () => {
  const input = {
    commentId: "comment-1",
    reportId: "report-1",
    authorId: "user-1",
  };

  beforeEach(() => vi.clearAllMocks());

  it("正常系: コメントを削除する", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      authorId: "user-1",
      reportId: "report-1",
    } as never);
    vi.mocked(prisma.comment.delete).mockResolvedValue({} as never);

    await expect(deleteComment(input)).resolves.toBeUndefined();
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("異常系: 存在しないコメントで NotFoundError を投げる", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

    await expect(deleteComment(input)).rejects.toThrow(NotFoundError);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("異常系: 別の日報のコメントで NotFoundError を投げる", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      authorId: "user-1",
      reportId: "report-2",
    } as never);

    await expect(deleteComment(input)).rejects.toThrow(NotFoundError);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("異常系: 他ユーザーのコメントで ForbiddenError を投げる", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      authorId: "user-2",
      reportId: "report-1",
    } as never);

    await expect(deleteComment(input)).rejects.toThrow(ForbiddenError);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });
});

describe("deleteCommentByAuthor", () => {
  const input = { commentId: "comment-1", authorId: "user-1" };

  beforeEach(() => vi.clearAllMocks());

  it("正常系: 所有者のコメントを削除する", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ authorId: "user-1" } as never);
    vi.mocked(prisma.comment.delete).mockResolvedValue({} as never);

    await expect(deleteCommentByAuthor(input)).resolves.toBeUndefined();
    expect(prisma.comment.findUnique).toHaveBeenCalledWith({
      where: { id: "comment-1" },
      select: { authorId: true },
    });
    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: "comment-1" } });
  });

  it("異常系: 存在しないコメントで NotFoundError を投げる", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

    await expect(deleteCommentByAuthor(input)).rejects.toThrow(NotFoundError);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });

  it("異常系: 他ユーザーのコメントで ForbiddenError を投げる", async () => {
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({ authorId: "user-2" } as never);

    await expect(deleteCommentByAuthor(input)).rejects.toThrow(ForbiddenError);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });
});
