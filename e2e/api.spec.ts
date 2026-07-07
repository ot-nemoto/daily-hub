import { expect, test } from "./fixtures";

// シードで固定された各ロールの API キー（prisma/seed.ts と一致）
const TSUKUNE_KEY = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"; // MEMBER
const NANKOTSU_KEY = "b1e3a704-e5f6-7890-abcd-ef1234567890"; // VIEWER
const BONJIRI_KEY = "c1d2e3f4-a5b6-7890-abcd-ef1234567890"; // ADMIN

function auth(key: string) {
  return { Authorization: `Bearer ${key}` };
}

// シードは UTC 基準で「今日」の日報を投入するため、UTC の日付文字列を作る
function todayUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ビューやシードに影響しない未来日付（各テストで別日付を使う）
const FUTURE = {
  upsert: "2099-03-01",
  del: "2099-03-05",
  bulk: "2099-03-10",
  smoke: "2099-03-20",
};

// 実 DB でしか検証できない挙動に絞る（認証/バリデーションの全マトリクスはユニットテストで網羅済み）
test.describe("REST API（外部連携）", () => {
  test("POST /api/reports は新規=201(created)・再送=200(updated) で upsert する", async ({
    request,
  }) => {
    const body = {
      date: FUTURE.upsert,
      workContent: "E2E作業",
      tomorrowPlan: "E2E予定",
      notes: "",
    };
    const res1 = await request.post("/api/reports", { headers: auth(TSUKUNE_KEY), data: body });
    expect(res1.status()).toBe(201);
    const json1 = await res1.json();
    expect(json1.results[0].status).toBe("created");
    expect(json1.results[0].id).toBeTruthy();

    const res2 = await request.post("/api/reports", {
      headers: auth(TSUKUNE_KEY),
      data: { ...body, workContent: "E2E作業（更新）" },
    });
    expect(res2.status()).toBe(200);
    const json2 = await res2.json();
    expect(json2.results[0].status).toBe("updated");
  });

  test("GET /api/reports は date・authorId フィルタで対象行を返す", async ({ request }) => {
    const today = todayUtc();
    const res = await request.get(`/api/reports?date=${today}`, { headers: auth(TSUKUNE_KEY) });
    expect(res.status()).toBe(200);
    const { reports } = await res.json();
    const tsukune = reports.find((r: { authorName: string }) => r.authorName === "tsukune");
    expect(tsukune).toBeTruthy();

    // authorId で絞り込むと当該ユーザーの行だけが返る
    const res2 = await request.get(`/api/reports?date=${today}&authorId=${tsukune.authorId}`, {
      headers: auth(TSUKUNE_KEY),
    });
    expect(res2.status()).toBe(200);
    const { reports: filtered } = await res2.json();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r: { authorId: string }) => r.authorId === tsukune.authorId)).toBe(true);
  });

  test("DELETE /api/admin/reports/[id] は日報を削除し 204、再削除は 404", async ({ request }) => {
    // 削除対象を自己完結で作成
    const create = await request.post("/api/reports", {
      headers: auth(TSUKUNE_KEY),
      data: { date: FUTURE.del, workContent: "削除対象", tomorrowPlan: "x", notes: "" },
    });
    expect(create.status()).toBe(201);
    const id = (await create.json()).results[0].id;

    const del = await request.delete(`/api/admin/reports/${id}`, { headers: auth(BONJIRI_KEY) });
    expect(del.status()).toBe(204);

    // 実 DB から消えていることを GET で確認
    const check = await request.get(`/api/reports?date=${FUTURE.del}`, {
      headers: auth(TSUKUNE_KEY),
    });
    expect(check.status()).toBe(200);
    const { reports } = await check.json();
    expect(reports.find((r: { id: string }) => r.id === id)).toBeFalsy();

    // 再削除は 404
    const del2 = await request.delete(`/api/admin/reports/${id}`, { headers: auth(BONJIRI_KEY) });
    expect(del2.status()).toBe(404);
  });

  test("POST /api/admin/reports は userName 解決で一括登録する", async ({ request }) => {
    const res = await request.post("/api/admin/reports", {
      headers: auth(BONJIRI_KEY),
      data: [
        {
          userName: "tsukune",
          date: FUTURE.bulk,
          workContent: "一括登録",
          tomorrowPlan: "x",
          notes: "",
        },
      ],
    });
    expect(res.status()).toBe(200);
    const { results } = await res.json();
    expect(results[0].date).toBe(FUTURE.bulk);
    expect(["created", "updated"]).toContain(results[0].status);
  });

  test("GET /api/admin/users は ADMIN でユーザー一覧を返す", async ({ request }) => {
    const res = await request.get("/api/admin/users", { headers: auth(BONJIRI_KEY) });
    expect(res.status()).toBe(200);
    const { users } = await res.json();
    expect(users.map((u: { email: string }) => u.email)).toContain("tsukune@example.com");
  });

  // 配線確認のみ（全マトリクスはユニットテストで網羅済み）
  test.describe("認証・認可スモーク", () => {
    test("認証なしの POST /api/reports は 401", async ({ request }) => {
      const res = await request.post("/api/reports", {
        data: { date: FUTURE.smoke, workContent: "x", tomorrowPlan: "y", notes: "" },
      });
      expect(res.status()).toBe(401);
    });

    test("VIEWER の POST /api/reports は 403", async ({ request }) => {
      const res = await request.post("/api/reports", {
        headers: auth(NANKOTSU_KEY),
        data: { date: FUTURE.smoke, workContent: "x", tomorrowPlan: "y", notes: "" },
      });
      expect(res.status()).toBe(403);
    });

    test("非ADMIN の GET /api/admin/users は 403", async ({ request }) => {
      const res = await request.get("/api/admin/users", { headers: auth(TSUKUNE_KEY) });
      expect(res.status()).toBe(403);
    });
  });
});
