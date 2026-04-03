// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/users", () => ({ updateMe: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { updateMe as libUpdateMe } from "@/lib/users";
import { updateMe } from "./actions";

const session = { user: { id: "user-1", role: "MEMBER", isActive: true } };

describe("updateMe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("正常系: 名前を更新して空オブジェクトを返す", async () => {
    vi.mocked(getSession).mockResolvedValue(session as never);
    vi.mocked(libUpdateMe).mockResolvedValue({ id: "user-1", name: "新しい名前", email: "user@example.com" });

    const result = await updateMe({ name: "新しい名前" });

    expect(result).toEqual({});
    expect(libUpdateMe).toHaveBeenCalledWith({ id: "user-1", name: "新しい名前" });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("異常系: 未認証で redirect する", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    await updateMe({ name: "新しい名前" });

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(libUpdateMe).not.toHaveBeenCalled();
  });

  it("異常系: ユーザーが見つからない場合 error を返す", async () => {
    vi.mocked(getSession).mockResolvedValue(session as never);
    vi.mocked(libUpdateMe).mockRejectedValue(new NotFoundError());

    const result = await updateMe({ name: "新しい名前" });

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
