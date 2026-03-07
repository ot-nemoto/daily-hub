// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { authorizeCredentials } from "./authorize";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}));

const mockUser = {
  id: "test-id",
  name: "テスト ユーザー",
  email: "test@example.com",
  passwordHash: "hashed_password",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("authorizeCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 有効なメール・パスワードでユーザーオブジェクトを返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const { compare } = await import("bcryptjs");
    vi.mocked(compare).mockResolvedValue(true as never);

    const result = await authorizeCredentials("test@example.com", "password123");

    expect(result).toEqual({
      id: "test-id",
      name: "テスト ユーザー",
      email: "test@example.com",
    });
  });

  it("異常系: email が undefined で null を返す", async () => {
    const result = await authorizeCredentials(undefined, "password123");
    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: password が undefined で null を返す", async () => {
    const result = await authorizeCredentials("test@example.com", undefined);
    expect(result).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("異常系: ユーザーが存在しない場合 null を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await authorizeCredentials("notfound@example.com", "password123");

    expect(result).toBeNull();
  });

  it("異常系: パスワードが一致しない場合 null を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    const { compare } = await import("bcryptjs");
    vi.mocked(compare).mockResolvedValue(false as never);

    const result = await authorizeCredentials("test@example.com", "wrong_password");

    expect(result).toBeNull();
  });
});
