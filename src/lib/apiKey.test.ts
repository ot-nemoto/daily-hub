import { describe, expect, it } from "vitest";

import { createApiKeyValue, hashApiKey } from "./apiKey";

describe("createApiKeyValue", () => {
  it("dh_ prefix 付きの base64url 形式のキーを生成する", () => {
    // dh_ + base64url(32 bytes) = 43 文字
    expect(createApiKeyValue()).toMatch(/^dh_[A-Za-z0-9_-]{43}$/);
  });

  it("呼ぶたびに異なる値を返す", () => {
    expect(createApiKeyValue()).not.toBe(createApiKeyValue());
  });
});

describe("hashApiKey", () => {
  it("SHA-256 の hex を返す（既知ベクタ）", async () => {
    // echo -n "abc" | sha256sum
    await expect(hashApiKey("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("マルチバイト文字は UTF-8 バイト列としてハッシュ化する", async () => {
    // echo -n "あ" | sha256sum
    await expect(hashApiKey("あ")).resolves.toBe(
      "dc5a4d3d82f7e15792959dc661538ae0e541ce66494516f5c9cfd9cd3308494d",
    );
  });

  it("空文字でもハッシュを返す", async () => {
    await expect(hashApiKey("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});
