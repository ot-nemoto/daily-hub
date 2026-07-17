// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { ForbiddenError, NotFoundError } from "./errors";
import {
  deleteUser,
  generateApiKey,
  getMe,
  getUsers,
  revokeApiKey,
  updateMe,
  updateUserAdmin,
} from "./users";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    comment: { deleteMany: vi.fn() },
    report: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("getUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 全ユーザーを name 昇順で取得する", async () => {
    const rows = [
      { id: "u1", name: "Alice", email: "a@example.com", role: "ADMIN", isActive: true },
    ];
    vi.mocked(prisma.user.findMany).mockResolvedValue(rows as never);

    const result = await getUsers();
    expect(result).toBe(rows);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: { name: "asc" },
    });
  });
});

describe("updateUserAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ロールを変更し更新後ユーザーを返す", async () => {
    const updated = {
      id: "user-1",
      name: "太郎",
      email: "u@example.com",
      role: "MEMBER",
      isActive: true,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(updated as never);

    const result = await updateUserAdmin({
      id: "user-1",
      currentUserId: "admin-1",
      role: "MEMBER" as never,
    });

    expect(result).toEqual(updated);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "MEMBER" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  });

  it("正常系: isActive を変更し更新後ユーザーを返す", async () => {
    const updated = {
      id: "user-1",
      name: "太郎",
      email: "u@example.com",
      role: "MEMBER",
      isActive: false,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(updated as never);

    const result = await updateUserAdmin({
      id: "user-1",
      currentUserId: "admin-1",
      isActive: false,
    });

    expect(result).toEqual(updated);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isActive: false },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  });

  it("異常系: 自分自身の ADMIN 降格で ForbiddenError を投げる", async () => {
    await expect(
      updateUserAdmin({ id: "admin-1", currentUserId: "admin-1", role: "MEMBER" as never }),
    ).rejects.toThrow(ForbiddenError);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 自分自身の isActive 変更で ForbiddenError を投げる", async () => {
    await expect(
      updateUserAdmin({ id: "admin-1", currentUserId: "admin-1", isActive: false }),
    ).rejects.toThrow(ForbiddenError);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 最後の有効 ADMIN を降格しようとすると ForbiddenError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      isActive: true,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    await expect(
      updateUserAdmin({ id: "admin-2", currentUserId: "admin-1", role: "MEMBER" as never }),
    ).rejects.toThrow(ForbiddenError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("異常系: 最後の有効 ADMIN を無効化しようとすると ForbiddenError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      isActive: true,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    await expect(
      updateUserAdmin({ id: "admin-2", currentUserId: "admin-1", isActive: false }),
    ).rejects.toThrow(ForbiddenError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("正常系: 他に有効 ADMIN が居れば ADMIN を降格できる", async () => {
    const updated = {
      id: "admin-2",
      name: "管理者2",
      email: "a2@example.com",
      role: "MEMBER",
      isActive: true,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      isActive: true,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(2);
    vi.mocked(prisma.user.update).mockResolvedValue(updated as never);

    const result = await updateUserAdmin({
      id: "admin-2",
      currentUserId: "admin-1",
      role: "MEMBER" as never,
    });
    expect(result).toEqual(updated);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      updateUserAdmin({ id: "no-user", currentUserId: "admin-1", isActive: false }),
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
    await expect(deleteUser({ id: "admin-1", currentUserId: "admin-1" })).rejects.toThrow(
      ForbiddenError,
    );

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(deleteUser({ id: "no-user", currentUserId: "admin-1" })).rejects.toThrow(
      NotFoundError,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("異常系: 最後の有効 ADMIN の削除で ForbiddenError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      isActive: true,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    await expect(deleteUser({ id: "admin-2", currentUserId: "admin-1" })).rejects.toThrow(
      ForbiddenError,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("正常系: 他に有効 ADMIN が居れば ADMIN を削除できる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-2",
      role: "ADMIN",
      isActive: true,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(2);
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

    await expect(deleteUser({ id: "admin-2", currentUserId: "admin-1" })).resolves.toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe("updateMe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 名前を更新し role・isActive を含めて返す", async () => {
    const updated = {
      id: "user-1",
      name: "新しい名前",
      email: "user@example.com",
      role: "MEMBER",
      isActive: true,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(updated as never);

    const result = await updateMe({ id: "user-1", name: "新しい名前" });

    expect(result).toEqual(updated);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "新しい名前" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  });

  it("異常系: 存在しないユーザーで NotFoundError を投げる", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(updateMe({ id: "no-user", name: "名前" })).rejects.toThrow(NotFoundError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("getMe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 本人のプロフィールを取得する", async () => {
    const me = {
      id: "user-1",
      name: "太郎",
      email: "user@example.com",
      role: "MEMBER",
      isActive: true,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(me as never);

    const result = await getMe("user-1");

    expect(result).toEqual(me);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  });

  it("存在しない場合は null を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    expect(await getMe("missing")).toBeNull();
  });
});

describe("generateApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: API キーを生成して返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as never);

    const result = await generateApiKey({ id: "user-1" });

    expect(result.apiKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
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
