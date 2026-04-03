// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createComment, deleteComment } from "./comments";
import { ForbiddenError, NotFoundError } from "./errors";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("createComment", () => {
  const input = {
    reportId: "report-1",
    authorId: "user-1",
    body: "お疲れ様です",
  };

  beforeEach(() => vi.clearAllMocks());

  it("正常系: コメントを作成して id を返す", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ id: "report-1" } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: "comment-1" } as never);

    const result = await createComment(input);

    expect(result).toEqual({ id: "comment-1" });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { body: input.body, reportId: input.reportId, authorId: input.authorId },
      select: { id: true },
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
