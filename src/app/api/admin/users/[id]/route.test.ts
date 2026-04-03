// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  updateUserAdmin: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/generated/prisma/client", () => ({
  Role: { ADMIN: "ADMIN", MEMBER: "MEMBER", VIEWER: "VIEWER" },
}));

import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { deleteUser, updateUserAdmin } from "@/lib/users";
import { DELETE, PATCH } from "./route";

const adminSession = { user: { id: "admin-1", role: "ADMIN", isActive: true } };
const memberSession = { user: { id: "member-1", role: "MEMBER", isActive: true } };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/admin/users/user-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const makeRawRequest = (body: string) =>
  new Request("http://localhost/api/admin/users/user-1", {
    method: "PATCH",
    body,
  });

const makeParams = (id = "user-1") =>
  ({ params: Promise.resolve({ id }) }) as never;

describe("PATCH /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ロールを変更できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(updateUserAdmin).mockResolvedValue({ id: "user-1" });

    const res = await PATCH(makeRequest({ role: "MEMBER" }) as never, makeParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "user-1" });
  });

  it("正常系: isActive を変更できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(updateUserAdmin).mockResolvedValue({ id: "user-1" });

    const res = await PATCH(makeRequest({ isActive: false }) as never, makeParams());
    expect(res.status).toBe(200);
  });

  it("異常系: 不正なロール値は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRequest({ role: "INVALID" }) as never, makeParams());
    expect(res.status).toBe(400);
    expect(updateUserAdmin).not.toHaveBeenCalled();
  });

  it("異常系: 自分自身の ADMIN を降格しようとすると 403", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(updateUserAdmin).mockRejectedValue(new ForbiddenError("Cannot demote yourself from ADMIN"));

    const res = await PATCH(makeRequest({ role: "MEMBER" }) as never, makeParams("admin-1"));
    expect(res.status).toBe(403);
  });

  it("異常系: 自分自身の isActive を変更しようとすると 403", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(updateUserAdmin).mockRejectedValue(new ForbiddenError("Cannot change your own active status"));

    const res = await PATCH(makeRequest({ isActive: false }) as never, makeParams("admin-1"));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Cannot change your own active status" });
  });

  it("異常系: 存在しないユーザーは 404", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(updateUserAdmin).mockRejectedValue(new NotFoundError("User not found"));

    const res = await PATCH(makeRequest({ isActive: false }) as never, makeParams("no-user"));
    expect(res.status).toBe(404);
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const res = await PATCH(makeRequest({ role: "MEMBER" }) as never, makeParams());
    expect(res.status).toBe(403);
    expect(updateUserAdmin).not.toHaveBeenCalled();
  });

  it("異常系: 不正JSON は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRawRequest("not-json") as never, makeParams());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON" });
  });

  it("異常系: isActive が boolean 以外は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRequest({ isActive: "yes" }) as never, makeParams());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "isActive must be a boolean" });
  });

  it("異常系: 更新フィールドなし（空ボディ）は 400 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);

    const res = await PATCH(makeRequest({}) as never, makeParams());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "No updatable fields provided" });
  });
});

const makeDeleteRequest = () =>
  new Request("http://localhost/api/admin/users/user-1", { method: "DELETE" });

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: ユーザーを削除できる", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(deleteUser).mockResolvedValue(undefined);

    const res = await DELETE(makeDeleteRequest() as never, makeParams());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalledWith({ id: "user-1", currentUserId: "admin-1" });
  });

  it("異常系: 自分自身の削除は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(deleteUser).mockRejectedValue(new ForbiddenError("Cannot delete yourself"));

    const res = await DELETE(makeDeleteRequest() as never, makeParams("admin-1"));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Cannot delete yourself" });
  });

  it("異常系: MEMBER は 403 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as never);

    const res = await DELETE(makeDeleteRequest() as never, makeParams());
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("異常系: 存在しないユーザーは 404 を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as never);
    vi.mocked(deleteUser).mockRejectedValue(new NotFoundError("User not found"));

    const res = await DELETE(makeDeleteRequest() as never, makeParams("no-user"));
    expect(res.status).toBe(404);
  });
});
