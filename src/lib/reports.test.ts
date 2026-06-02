// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { createReport, resolveOrCreateUserByName, updateReport, upsertReportForUserName } from "./reports";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    report: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const baseInput = {
  date: new Date("2026-03-06T00:00:00.000Z"),
  workContent: "作業内容",
  tomorrowPlan: "明日の予定",
  notes: "所感",
  authorId: "user-1",
};

describe("createReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 日報を作成して id を返す", async () => {
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.report.create).mockResolvedValue({ id: "report-1" } as never);

    const result = await createReport(baseInput);

    expect(result).toEqual({ id: "report-1" });
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: {
        date: baseInput.date,
        workContent: baseInput.workContent,
        tomorrowPlan: baseInput.tomorrowPlan,
        notes: baseInput.notes,
        authorId: baseInput.authorId,
      },
    });
  });

  it("異常系: 同日に日報が存在する場合 ConflictError を投げる", async () => {
    vi.mocked(prisma.report.findFirst).mockResolvedValue({ id: "existing" } as never);

    await expect(createReport(baseInput)).rejects.toThrow(ConflictError);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it("異常系: DB の P2002 競合エラーを ConflictError に変換する", async () => {
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    vi.mocked(prisma.report.create).mockRejectedValue(p2002);

    await expect(createReport(baseInput)).rejects.toThrow(ConflictError);
  });

  it("異常系: その他の DB エラーはそのまま投げる", async () => {
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.report.create).mockRejectedValue(new Error("DB error"));

    await expect(createReport(baseInput)).rejects.toThrow("DB error");
  });
});

describe("updateReport", () => {
  const input = {
    id: "report-1",
    authorId: "user-1",
    workContent: "更新内容",
    tomorrowPlan: "明日の予定",
    notes: "所感",
  };

  beforeEach(() => vi.clearAllMocks());

  it("正常系: 日報を更新して id を返す", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ authorId: "user-1" } as never);
    vi.mocked(prisma.report.update).mockResolvedValue({ id: "report-1" } as never);

    const result = await updateReport(input);

    expect(result).toEqual({ id: "report-1" });
    expect(prisma.report.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: {
        workContent: input.workContent,
        tomorrowPlan: input.tomorrowPlan,
        notes: input.notes,
      },
      select: { id: true },
    });
  });

  it("異常系: 存在しない ID で NotFoundError を投げる", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue(null);

    await expect(updateReport(input)).rejects.toThrow(NotFoundError);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it("異常系: 他ユーザーの日報で ForbiddenError を投げる", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({ authorId: "user-99" } as never);

    await expect(updateReport(input)).rejects.toThrow(ForbiddenError);
    expect(prisma.report.update).not.toHaveBeenCalled();
  });
});

describe("resolveOrCreateUserByName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("既存ユーザーが見つかった場合はそのまま返す", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "user-1" } as never);

    const result = await resolveOrCreateUserByName("山田太郎");

    expect(result).toEqual({ id: "user-1" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("存在しない場合は VIEWER ロールで自動作成する", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "new-user-1" } as never);

    const result = await resolveOrCreateUserByName("山田太郎");

    expect(result).toEqual({ id: "new-user-1" });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "山田太郎", role: "VIEWER" }),
      }),
    );
  });

  it("自動作成されたユーザーの email は @example.com ドメインである", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "new-user-1" } as never);

    await resolveOrCreateUserByName("山田太郎");
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.email).toMatch(/@example\.com$/);
  });
});

describe("upsertReportForUserName", () => {
  const baseInput = {
    userName: "山田太郎",
    date: new Date("2026-06-01T00:00:00.000Z"),
    workContent: "作業内容",
    tomorrowPlan: "明日の予定",
    notes: "所感",
  };

  beforeEach(() => vi.clearAllMocks());

  it("新規登録の場合 status: created を返す", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-1" } as never);

    const result = await upsertReportForUserName(baseInput);

    expect(result).toEqual({ id: "report-1", status: "created" });
  });

  it("既存日報がある場合 status: updated を返す", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.report.findFirst).mockResolvedValue({ id: "report-1" } as never);
    vi.mocked(prisma.report.upsert).mockResolvedValue({ id: "report-1" } as never);

    const result = await upsertReportForUserName(baseInput);

    expect(result).toEqual({ id: "report-1", status: "updated" });
  });
});
