// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/users", () => ({ updateUserAdmin: vi.fn(), deleteUser: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteUser as libDeleteUser, updateUserAdmin as libUpdateUserAdmin } from "@/lib/users";
import { deleteUser, updateUserAdmin } from "./actions";

const adminSession = { user: { id: "admin-1", role: "ADMIN", isActive: true } };
const memberSession = { user: { id: "member-1", role: "MEMBER", isActive: true } };

describe("updateUserAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ロールを変更して空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libUpdateUserAdmin).mockResolvedValue({ id: "user-1" });

    const result = await updateUserAdmin({ id: "user-1", role: "MEMBER" as never });

    expect(result).toEqual({});
    expect(libUpdateUserAdmin).toHaveBeenCalledWith({
      id: "user-1",
      currentUserId: "admin-1",
      role: "MEMBER",
      isActive: undefined,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("正常系: isActive を変更して空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libUpdateUserAdmin).mockResolvedValue({ id: "user-1" });

    const result = await updateUserAdmin({ id: "user-1", isActive: false });

    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("異常系: ADMIN 以外で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    await updateUserAdmin({ id: "user-1", isActive: false });

    expect(redirect).toHaveBeenCalledWith("/");
    expect(libUpdateUserAdmin).not.toHaveBeenCalled();
  });

  it("異常系: ForbiddenError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libUpdateUserAdmin).mockRejectedValue(new ForbiddenError("Cannot demote yourself from ADMIN"));

    const result = await updateUserAdmin({ id: "admin-1", role: "MEMBER" as never });

    expect(result).toMatchObject({ error: "Cannot demote yourself from ADMIN" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("異常系: NotFoundError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libUpdateUserAdmin).mockRejectedValue(new NotFoundError());

    const result = await updateUserAdmin({ id: "no-user", isActive: false });

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("deleteUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ユーザーを削除して空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libDeleteUser).mockResolvedValue(undefined);

    const result = await deleteUser({ id: "user-1" });

    expect(result).toEqual({});
    expect(libDeleteUser).toHaveBeenCalledWith({ id: "user-1", currentUserId: "admin-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("異常系: ADMIN 以外で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    await deleteUser({ id: "user-1" });

    expect(redirect).toHaveBeenCalledWith("/");
    expect(libDeleteUser).not.toHaveBeenCalled();
  });

  it("異常系: ForbiddenError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libDeleteUser).mockRejectedValue(new ForbiddenError("Cannot delete yourself"));

    const result = await deleteUser({ id: "admin-1" });

    expect(result).toMatchObject({ error: "Cannot delete yourself" });
  });

  it("異常系: NotFoundError で error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(libDeleteUser).mockRejectedValue(new NotFoundError());

    const result = await deleteUser({ id: "no-user" });

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});
