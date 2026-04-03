// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/reports", () => ({ updateReport: vi.fn() }));
vi.mock("@/lib/comments", () => ({ createComment: vi.fn(), deleteComment: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createComment as libCreateComment, deleteComment as libDeleteComment } from "@/lib/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { updateReport as libUpdateReport } from "@/lib/reports";
import { createComment, deleteComment, updateReport } from "./actions";

const memberSession = { user: { id: "user-1", role: "MEMBER", isActive: true } };
const viewerSession = { user: { id: "user-2", role: "VIEWER", isActive: true } };

describe("updateReport", () => {
  const input = { id: "report-1", workContent: "更新内容", tomorrowPlan: "明日の予定", notes: "所感" };
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 日報を更新して空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libUpdateReport).mockResolvedValue({ id: "report-1" });

    const result = await updateReport(input);

    expect(result).toEqual({});
    expect(libUpdateReport).toHaveBeenCalledWith({
      id: "report-1",
      authorId: "user-1",
      workContent: input.workContent,
      tomorrowPlan: input.tomorrowPlan,
      notes: input.notes,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reports/report-1");
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await updateReport(input);

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(libUpdateReport).not.toHaveBeenCalled();
  });

  it("異常系: VIEWER ロールで error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(viewerSession as never);

    const result = await updateReport(input);

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(libUpdateReport).not.toHaveBeenCalled();
  });

  it("異常系: NotFoundError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libUpdateReport).mockRejectedValue(new NotFoundError());

    const result = await updateReport(input);

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("異常系: ForbiddenError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libUpdateReport).mockRejectedValue(new ForbiddenError());

    const result = await updateReport(input);

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("createComment", () => {
  const input = { reportId: "report-1", body: "お疲れ様です" };
  beforeEach(() => vi.clearAllMocks());

  it("正常系: コメントを作成して id を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libCreateComment).mockResolvedValue({ id: "comment-1" });

    const result = await createComment(input);

    expect(result).toEqual({ id: "comment-1" });
    expect(libCreateComment).toHaveBeenCalledWith({
      reportId: "report-1",
      authorId: "user-1",
      body: "お疲れ様です",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reports/report-1");
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await createComment(input);

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(libCreateComment).not.toHaveBeenCalled();
  });

  it("異常系: NotFoundError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libCreateComment).mockRejectedValue(new NotFoundError());

    const result = await createComment(input);

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("deleteComment", () => {
  const input = { reportId: "report-1", commentId: "comment-1" };
  beforeEach(() => vi.clearAllMocks());

  it("正常系: コメントを削除して空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libDeleteComment).mockResolvedValue(undefined);

    const result = await deleteComment(input);

    expect(result).toEqual({});
    expect(libDeleteComment).toHaveBeenCalledWith({
      commentId: "comment-1",
      reportId: "report-1",
      authorId: "user-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/reports/report-1");
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await deleteComment(input);

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(libDeleteComment).not.toHaveBeenCalled();
  });

  it("異常系: NotFoundError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libDeleteComment).mockRejectedValue(new NotFoundError());

    const result = await deleteComment(input);

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("異常系: ForbiddenError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);
    vi.mocked(libDeleteComment).mockRejectedValue(new ForbiddenError());

    const result = await deleteComment(input);

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});
