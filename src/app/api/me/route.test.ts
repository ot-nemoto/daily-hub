// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/users", () => ({
  updateMe: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { updateMe } from "@/lib/users";
import { PATCH } from "./route";

const session = { user: { id: "user-1", role: "MEMBER", isActive: true } };

const makeRequest = (body: object) =>
  new Request("http://localhost/api/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

const makeRawRequest = (body: string) =>
  new Request("http://localhost/api/me", {
    method: "PATCH",
    body,
  });

describe("PATCH /api/me", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("名前変更", () => {
    it("正常系: 名前を変更できる", async () => {
      vi.mocked(getSession).mockResolvedValue(session as never);
      vi.mocked(updateMe).mockResolvedValue({ id: "user-1", name: "新しい名前", email: "user@example.com" });

      const res = await PATCH(makeRequest({ name: "新しい名前" }) as never);

      expect(res.status).toBe(200);
      expect(updateMe).toHaveBeenCalledWith({ id: "user-1", name: "新しい名前" });
    });

    it("異常系: 名前が空文字は 400 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({ name: "" }) as never);
      expect(res.status).toBe(400);
    });

    it("異常系: 名前が 100 文字超は 400 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(session as never);

      const res = await PATCH(makeRequest({ name: "a".repeat(101) }) as never);
      expect(res.status).toBe(400);
    });
  });

  describe("認証", () => {
    it("異常系: 未認証は 401 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const res = await PATCH(makeRequest({ name: "新しい名前" }) as never);
      expect(res.status).toBe(401);
      expect(updateMe).not.toHaveBeenCalled();
    });
  });

  describe("バリデーション", () => {
    it("異常系: 不正 JSON は 400 を返す", async () => {
      vi.mocked(getSession).mockResolvedValue(session as never);

      const res = await PATCH(makeRawRequest("not-json") as never);
      expect(res.status).toBe(400);
    });
  });
});
