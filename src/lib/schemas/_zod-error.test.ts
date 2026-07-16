// @vitest-environment node
import { describe, expect, it } from "vitest";
import { type ZodError, z } from "zod";

import { firstZodError } from "./_zod-error";

describe("firstZodError", () => {
  it("先頭 issue のメッセージを返す", () => {
    const result = z.string({ error: "文字列が必要です" }).safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstZodError(result.error)).toBe("文字列が必要です");
    }
  });

  it("issue が空のときは既定メッセージを返す", () => {
    const empty = { issues: [] } as unknown as ZodError;
    expect(firstZodError(empty)).toBe("リクエストが不正です");
  });
});
