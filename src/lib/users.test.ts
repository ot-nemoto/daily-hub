// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { ForbiddenError, NotFoundError } from "./errors";
import { deleteUser, generateApiKey, revokeApiKey, updateMe, updateUserAdmin } from "./users";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: { deleteMany: vi.fn() },
    report: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("updateUserAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ロールを変更できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as never);

    const result = await updateUserAdmin({
      id: "user-1",
      currentUserId: "admin-1",
      role: "MEMBER" as never,
    });

    expect(result).toEqual({ id: "user-1" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "MEMBER" },
    });
  });

  it("正常系: isActive を変更できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as never);

    const result = await updateUserAdmin({
      id: "user-1",
      currentUserId: "admin-1",
      isActive: false,
    });

    expect(result).toEqual({ id: "user-1" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isActive: false },
    });
  });

  it("異常系: 自分自身の ADMIN 降格で ForbiddenError を投げる", async () => {
    await expect(
      updateUserAdmin({ id: "admin-1", currentUserId: "admin-1", role: "MEMBER" as never })
    ).rejects.toThrow(ForbiddenError);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 自分自身の isActive 変更で ForbiddenError を投げる", async () => {
    await expect(
      updateUserAdmin({ id: "admin-1", currentUserId: "admin-1", isActive: false })
    ).rejects.toThrow(ForbiddenError);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      updateUserAdmin({ id: "no-user", currentUserId: "admin-1", isActive: false })
    ).rejects.toThrow(NotFoundError);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("deleteUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ユーザーを削除できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await expect(deleteUser({ id: "user-1", currentUserId: "admin-1" })).resolves.toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("異常系: 自分自身の削除で ForbiddenError を投げる", async () => {
    await expect(
      deleteUser({ id: "admin-1", currentUserId: "admin-1" })
    ).rejects.toThrow(ForbiddenError);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      deleteUser({ id: "no-user", currentUserId: "admin-1" })
    ).rejects.toThrow(NotFoundError);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("updateMe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 名前を更新できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      name: "新しい名前",
      email: "user@example.com",
    } as never);

    const result = await updateMe({ id: "user-1", name: "新しい名前" });

    expect(result).toEqual({ id: "user-1", name: "新しい名前", email: "user@example.com" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "新しい名前" },
      select: { id: true, name: true, email: true },
    });
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(updateMe({ id: "no-user", name: "名前" })).rejects.toThrow(NotFoundError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("generateApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: API キーを生成して返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as never);

    const result = await generateApiKey({ id: "user-1" });

    expect(result.apiKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { apiKey: result.apiKey },
    });
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(generateApiKey({ id: "no-user" })).rejects.toThrow(NotFoundError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("revokeApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: API キーを null に更新する", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as never);

    await expect(revokeApiKey({ id: "user-1" })).resolves.toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { apiKey: null },
    });
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(revokeApiKey({ id: "no-user" })).rejects.toThrow(NotFoundError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
