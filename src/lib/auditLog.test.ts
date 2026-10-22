// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAuditRecord, logAudit, resetAuditThrottle, setAuditUserId } from "./auditLog";

function req(
  url = "https://example.com/api/reports",
  init: RequestInit & { headers?: Record<string, string> } = {},
) {
  return new Request(url, { method: "GET", ...init });
}

describe("buildAuditRecord", () => {
  it("正常系: メソッド・パス・クエリ・ステータスを記録する", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/reports?from=2026-10-01&to=2026-10-31", { method: "PATCH" }),
      200,
    );

    expect(r).toMatchObject({
      type: "audit",
      userId: null,
      method: "PATCH",
      path: "/api/reports",
      query: "?from=2026-10-01&to=2026-10-31",
      status: 200,
      ip: null,
    });
    expect(r.at).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });

  it("正常系: setAuditUserId で渡したユーザーを紐づける", () => {
    const r1 = req();
    setAuditUserId(r1, "user-1");

    expect(buildAuditRecord(r1, 200).userId).toBe("user-1");
    // 別インスタンスには漏れない（WeakMap のキーは Request 単位）
    expect(buildAuditRecord(req(), 200).userId).toBeNull();
  });

  it("正常系: x-forwarded-for の先頭を IP とする", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", {
        headers: { "x-forwarded-for": "203.0.113.1, 70.41.3.18, 150.172.238.178" },
      }),
      200,
    );

    expect(r.ip).toBe("203.0.113.1");
  });

  it("正常系: x-forwarded-for が無ければ x-real-ip を使う", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", { headers: { "x-real-ip": "198.51.100.7" } }),
      200,
    );

    expect(r.ip).toBe("198.51.100.7");
  });

  // 本文の内容は記録しないが、バイト数は残す。バッチ更新
  // （POST /api/admin/reports は userName で対象を指定する）が空振りだったのか
  // 大量更新だったのかを、本文を持たずに区別できるようにするため。
  it("正常系: content-length をバイト数として記録する", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/admin/reports", {
        method: "POST",
        headers: { "content-length": "4096" },
      }),
      200,
    );

    expect(r.bytes).toBe(4096);
  });

  it("境界値: content-length が無ければ null", () => {
    expect(buildAuditRecord(req(), 200).bytes).toBeNull();
  });

  // Number() だと "" が 0、"1e3" が 1000、"0x10" が 16 になり、
  // クライアントが送った不正な値から数値をでっち上げてしまう。
  it.each([
    ["空文字", ""],
    ["指数表記", "1e3"],
    ["16 進数", "0x10"],
    ["符号付き", "+5"],
    ["小数", "1.5"],
    ["負数", "-1"],
  ])("異常系: content-length が %s なら null", (_label, value) => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", { headers: { "content-length": value } }),
      200,
    );

    expect(r.bytes).toBeNull();
  });

  // Headers は Fetch 仕様に従って値の前後の空白を取り除くため、
  // " 10 " は get() の時点で "10" になる。アプリ側で trim する必要はない。
  it("境界値: content-length の前後の空白は Headers が正規化する", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", { headers: { "content-length": " 10 " } }),
      200,
    );

    expect(r.bytes).toBe(10);
  });

  it("異常系: content-length が数値でなければ null", () => {
    const r = buildAuditRecord(
      req("https://example.com/api/me", { headers: { "content-length": "abc" } }),
      200,
    );

    expect(r.bytes).toBeNull();
  });

  it("境界値: クエリが無ければ空文字", () => {
    expect(buildAuditRecord(req(), 200).query).toBe("");
  });

  // 「誰のキーで」を userId で表すため、キー自体は記録しない。
  // 記録してしまうと、ログの保存先がキーの保管場所になってしまう。
  it("異常系: Authorization ヘッダの APIキーを記録しない", () => {
    const secret = "dh_SUPERSECRETKEYVALUE000000000000000000000";
    const r = buildAuditRecord(
      req("https://example.com/api/reports", {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      }),
      201,
    );

    expect(JSON.stringify(r)).not.toContain(secret);
  });

  it("異常系: リクエストボディを記録しない", () => {
    const body = "本日は結合テストを実施した";
    const r = buildAuditRecord(
      new Request("https://example.com/api/reports", { method: "POST", body }),
      201,
    );

    expect(JSON.stringify(r)).not.toContain(body);
  });
});

describe("logAudit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常系: 1 行 1 JSON で出力する", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logAudit(req("https://example.com/api/day-off", { method: "DELETE" }), 204);

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toMatchObject({
      type: "audit",
      method: "DELETE",
      path: "/api/day-off",
      status: 204,
    });
  });

  // 監査ログの出力失敗でリクエストを落とさない（fail-open）。
  // 標準出力が書けない状況では標準エラーも書けないことがある。ここで例外が
  // 漏れると withApiErrorHandling の try 内で捕まり、成功応答が 500 に化ける。
  it("異常系: console.error も失敗してもスローしない", () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("stdout closed");
    });
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("stderr closed");
    });

    expect(() => logAudit(req(), 200)).not.toThrow();
  });

  it("異常系: 出力が失敗してもスローしない", () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("stdout closed");
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => logAudit(req(), 200)).not.toThrow();
    expect(err).toHaveBeenCalled();
  });
});

// 404 を返す経路（proxy.ts とキャッチオール）は認証より前・認証なしで通るため、
// キーを持たない誰でも記録を 1 行ずつ増やせる。レート制限が無いと、
// 本物の痕跡を大量のノイズで埋められる。
describe("未認証リクエストの記録抑制", () => {
  beforeEach(() => {
    resetAuditThrottle();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function floodUnauthenticated(count: number, ip = "203.0.113.1") {
    return Array.from({ length: count }, () =>
      logAudit(req("https://example.com/api/unknown", { headers: { "x-forwarded-for": ip } }), 404),
    );
  }

  it("正常系: 窓内の上限（30 件）までは記録する", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    floodUnauthenticated(30);

    expect(spy).toHaveBeenCalledTimes(30);
  });

  // 上限 30 件 ＋ 抑制開始の印 1 件 = 31 件
  it("異常系: 上限を超えた分は記録しない", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    floodUnauthenticated(100);

    expect(spy).toHaveBeenCalledTimes(31);
  });

  // 抑制の開始を 1 件だけ印付きで記録することで、
  // 「その IP が洪水を起こしている」信号自体は失わない。
  it("正常系: 上限に達した 1 件に throttled の印が付く", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    floodUnauthenticated(100);

    const records = spy.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(records.filter((r) => r.throttled === true)).toHaveLength(1);
    // 印が付くのは最後（上限に達した 1 件）
    expect(records.at(-1)?.throttled).toBe(true);
  });

  it("正常系: 窓が切り替わると再び記録できる", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    floodUnauthenticated(100);
    spy.mockClear();

    vi.advanceTimersByTime(60 * 1000);
    floodUnauthenticated(5);

    expect(spy).toHaveBeenCalledTimes(5);
  });

  it("正常系: 抑制されていなければ throttled は付かない", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    floodUnauthenticated(1);

    expect(JSON.parse(spy.mock.calls[0][0] as string)).not.toHaveProperty("throttled");
  });

  it("正常系: IP ごとに独立して数える", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    floodUnauthenticated(100, "203.0.113.1");
    floodUnauthenticated(5, "198.51.100.2");

    expect(spy).toHaveBeenCalledTimes(31 + 5);
  });

  // 認証済みの記録はキーの発行数で上界があるため抑制しない。
  it("正常系: 認証済みの記録は抑制しない", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    for (let i = 0; i < 100; i += 1) {
      const r = req("https://example.com/api/reports", {
        headers: { "x-forwarded-for": "203.0.113.1" },
      });
      setAuditUserId(r, "user-1");
      logAudit(r, 200);
    }

    expect(spy).toHaveBeenCalledTimes(100);
  });

  // IP が取れない場合はまとめて数えると正当な記録まで落ちる。
  it("境界値: IP が取れない場合は抑制しない", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    for (let i = 0; i < 100; i += 1) logAudit(req("https://example.com/api/unknown"), 404);

    expect(spy).toHaveBeenCalledTimes(100);
  });
});
