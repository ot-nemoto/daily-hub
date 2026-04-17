/**
 * E2Eテスト用シードスクリプト
 * 使い方: npx tsx prisma/seed.ts
 *
 * - テスト直前に実行することを想定
 * - Clerk にユーザーが存在しなければ作成する
 * - 全レポート・コメントを削除してから投入する
 * - ユーザーは upsert（ロール・isActive をシード定義にリセット）
 */
import { createClerkClient } from "@clerk/backend";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
if (!clerkSecretKey) throw new Error("CLERK_SECRET_KEY is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const clerk = createClerkClient({ secretKey: clerkSecretKey });

// テストユーザーの共通パスワード
const SEED_PASSWORD = "Yakitori2026";

// 今日を基準とした日付（UTC 00:00:00）
function getDate(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

// ---- bonjiri: 管理操作の実行者（ADMIN） ----
// 日報なし → 管理画面で「最終日報投稿日: なし」の表示確認用
const BONJIRI_EMAIL = "bonjiri@example.com";
const BONJIRI_NAME  = "bonjiri";

// ---- tsukune: 日報・コメント・ユーザー分離テストのメインユーザー（MEMBER） ----
// 今日を含む過去7日の日報あり。複数ユーザーからのコメントあり。
// apiKey を固定値で設定（REST API 動作確認用）
const TSUKUNE_EMAIL  = "tsukune@example.com";
const TSUKUNE_NAME   = "tsukune";
const TSUKUNE_APIKEY = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const TSUKUNE_REPORTS = [
  { daysAgo: 0, workContent: "機能実装：ログイン画面のバリデーション追加",       tomorrowPlan: "日報詳細ページのUI実装を開始する",       notes: "特に問題なし。チームの連携がスムーズでよかった。" },
  { daysAgo: 1, workContent: "バグ修正：日報一覧が正しく表示されない問題を修正", tomorrowPlan: "コメント機能のAPI実装を進める",           notes: "" },
  { daysAgo: 2, workContent: "コードレビュー：チームメンバーのPRを2件確認",      tomorrowPlan: "月次ビューのデータ取得ロジックを実装する", notes: "" },
  { daysAgo: 3, workContent: "API設計：コメント機能のエンドポイント定義",         tomorrowPlan: "ユーザー一覧APIのテストを書く",           notes: "特に問題なし。チームの連携がスムーズでよかった。" },
  { daysAgo: 4, workContent: "テスト作成：認証フローのE2Eテスト追加",             tomorrowPlan: "ナビゲーションコンポーネントの設計をする", notes: "" },
  { daysAgo: 5, workContent: "ドキュメント整備：APIドキュメントを最新化",         tomorrowPlan: "レスポンシブ対応の確認と修正",            notes: "" },
  { daysAgo: 6, workContent: "リファクタリング：Prismaクエリの最適化",            tomorrowPlan: "全機能の動作確認と最終調整",              notes: "特に問題なし。チームの連携がスムーズでよかった。" },
];

// ---- tebasaki: ユーザー分離テストの「他ユーザー」（MEMBER） ----
// 今日を含む過去7日の日報あり。tsukune とのコメントのやり取りあり。
const TEBASAKI_EMAIL = "tebasaki@example.com";
const TEBASAKI_NAME  = "tebasaki";
const TEBASAKI_REPORTS = [
  { daysAgo: 0, workContent: "月次ビューのデータ取得ロジック実装",   tomorrowPlan: "ユーザー一覧APIのテストを書く",           notes: "特に問題なし。チームの連携がスムーズでよかった。" },
  { daysAgo: 1, workContent: "コメント機能のAPI実装",                tomorrowPlan: "ナビゲーションコンポーネントの設計をする", notes: "" },
  { daysAgo: 2, workContent: "UIコンポーネントの整理",               tomorrowPlan: "レスポンシブ対応の確認と修正",            notes: "" },
  { daysAgo: 3, workContent: "データベース設計の見直し",             tomorrowPlan: "全機能の動作確認と最終調整",              notes: "特に問題なし。チームの連携がスムーズでよかった。" },
  { daysAgo: 4, workContent: "パフォーマンス計測と最適化",           tomorrowPlan: "日報詳細ページのUI実装を開始する",        notes: "" },
  { daysAgo: 5, workContent: "テストカバレッジの改善",               tomorrowPlan: "コメント機能のAPI実装を進める",           notes: "" },
  { daysAgo: 6, workContent: "ドキュメント更新作業",                 tomorrowPlan: "月次ビューのデータ取得ロジックを実装する", notes: "特に問題なし。チームの連携がスムーズでよかった。" },
];

// ---- nankotsu: 日報作成不可・コメントのみ可（VIEWER） ----
// apiKey を固定値で設定（REST API 403 確認用）
const NANKOTSU_EMAIL  = "nankotsu@example.com";
const NANKOTSU_NAME   = "nankotsu";
const NANKOTSU_APIKEY = "v1ew3r04-e5f6-7890-abcd-viewer567890";

// ---- sunagimo: ログイン後 /auth-error?reason=inactive リダイレクトの確認用 ----
const SUNAGIMO_EMAIL = "sunagimo@example.com";
const SUNAGIMO_NAME  = "sunagimo";

// ---- torikawa: 管理画面でのロール変更・無効化テストの対象（MEMBER） ----
// 日報1件あり → 管理画面で「最終日報投稿日・提出率」が表示されることの確認用
const TORIKAWA_EMAIL = "torikawa@example.com";
const TORIKAWA_NAME  = "torikawa";
const TARGET_REPORTS = [
  { daysAgo: 0, workContent: "通常業務の実施", tomorrowPlan: "翌日の作業を進める", notes: "" },
];

type Role = "ADMIN" | "MEMBER" | "VIEWER";

/** Clerk にユーザーが存在しなければ作成し、clerkId を返す */
async function upsertClerkUser(email: string): Promise<string> {
  const { data: existing } = await clerk.users.getUserList({ emailAddress: [email] });
  if (existing.length > 0) return existing[0].id;
  const created = await clerk.users.createUser({
    emailAddress: [email],
    password: SEED_PASSWORD,
  });
  console.log(`  Clerk ユーザーを作成しました: ${email}`);
  return created.id;
}

async function upsertUser(params: { email: string; name: string; role: Role; isActive: boolean; apiKey?: string }) {
  const { email, name, role, isActive, apiKey } = params;
  const clerkId = await upsertClerkUser(email);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, isActive, clerkId, apiKey: apiKey ?? null },
    create: { email, name, role, isActive, clerkId, apiKey: apiKey ?? null },
  });
}

async function main() {
  // レポート・コメントを全削除（テスト前のクリーンな状態を保証）
  await prisma.comment.deleteMany();
  await prisma.report.deleteMany();
  console.log("Deleted all reports and comments");

  // ユーザーを upsert（ロール・isActive をシード定義にリセット）
  const [bonjiri, tsukune, tebasaki, nankotsu, , torikawa] = await Promise.all([
    upsertUser({ email: BONJIRI_EMAIL,  name: BONJIRI_NAME,  role: "ADMIN",  isActive: true  }),
    upsertUser({ email: TSUKUNE_EMAIL,  name: TSUKUNE_NAME,  role: "MEMBER", isActive: true,  apiKey: TSUKUNE_APIKEY }),
    upsertUser({ email: TEBASAKI_EMAIL, name: TEBASAKI_NAME, role: "MEMBER", isActive: true  }),
    upsertUser({ email: NANKOTSU_EMAIL, name: NANKOTSU_NAME, role: "VIEWER", isActive: true,  apiKey: NANKOTSU_APIKEY }),
    upsertUser({ email: SUNAGIMO_EMAIL, name: SUNAGIMO_NAME, role: "MEMBER", isActive: false }),
    upsertUser({ email: TORIKAWA_EMAIL, name: TORIKAWA_NAME, role: "MEMBER", isActive: true  }),
  ]);
  console.log("Upserted 6 users");

  // tsukune の日報（7件: 今日〜6日前）
  const tsukuneReports = [];
  for (const r of TSUKUNE_REPORTS) {
    const report = await prisma.report.create({
      data: { authorId: tsukune.id, date: getDate(r.daysAgo), workContent: r.workContent, tomorrowPlan: r.tomorrowPlan, notes: r.notes },
    });
    tsukuneReports.push(report);
  }
  console.log(`${TSUKUNE_EMAIL}: 日報 ${tsukuneReports.length} 件を投入しました`);

  // tebasaki の日報（7件: 今日〜6日前）
  const tebasakiReports = [];
  for (const r of TEBASAKI_REPORTS) {
    const report = await prisma.report.create({
      data: { authorId: tebasaki.id, date: getDate(r.daysAgo), workContent: r.workContent, tomorrowPlan: r.tomorrowPlan, notes: r.notes },
    });
    tebasakiReports.push(report);
  }
  console.log(`${TEBASAKI_EMAIL}: 日報 ${tebasakiReports.length} 件を投入しました`);

  // torikawa の日報（1件: 今日）
  await prisma.report.create({
    data: { authorId: torikawa.id, date: getDate(TARGET_REPORTS[0].daysAgo), workContent: TARGET_REPORTS[0].workContent, tomorrowPlan: TARGET_REPORTS[0].tomorrowPlan, notes: TARGET_REPORTS[0].notes },
  });
  console.log(`${TORIKAWA_EMAIL}: 日報 1 件を投入しました`);

  // コメント
  // tsukune の今日の日報（tsukuneReports[0]）
  //   → 複数ユーザーからのコメントあり（コメント一覧・削除・VIEWER コメント・ユーザー分離の確認用）
  await prisma.comment.create({ data: { reportId: tsukuneReports[0].id, authorId: tebasaki.id, body: "進捗確認しました。引き続きよろしくお願いします。" } });
  await prisma.comment.create({ data: { reportId: tsukuneReports[0].id, authorId: bonjiri.id,  body: "お疲れ様です！バリデーションの追加、助かります。" } });
  await prisma.comment.create({ data: { reportId: tsukuneReports[0].id, authorId: nankotsu.id, body: "閲覧しました。参考になります！" } });
  // tebasaki の今日の日報（tebasakiReports[0]）
  //   → tsukune がコメント（ユーザー分離テスト: tsukune は自コメントに削除ボタンあり）
  await prisma.comment.create({ data: { reportId: tebasakiReports[0].id, authorId: tsukune.id,  body: "ありがとうございます！参考にして実装を進めます。" } });
  await prisma.comment.create({ data: { reportId: tebasakiReports[0].id, authorId: bonjiri.id,  body: "月次ビューの設計方針、共有いただけると助かります。" } });
  // tsukune の1日前の日報（tsukuneReports[1]）→ コメントなし（空状態テスト用）
  console.log("Created 5 comments");

  console.log("\nSeed completed successfully!");
  console.log("\n--- Users ---");
  console.log(`  ${BONJIRI_EMAIL}  (ADMIN,  active)   — 管理操作の実行者`);
  console.log(`  ${TSUKUNE_EMAIL}  (MEMBER, active)   — 日報7件・コメントあり・apiKey: ${TSUKUNE_APIKEY}`);
  console.log(`  ${TEBASAKI_EMAIL} (MEMBER, active)   — 日報7件・コメントあり`);
  console.log(`  ${NANKOTSU_EMAIL} (VIEWER, active)   — コメントあり・apiKey: ${NANKOTSU_APIKEY}`);
  console.log(`  ${SUNAGIMO_EMAIL} (MEMBER, inactive) — 認証エラーリダイレクト確認用`);
  console.log(`  ${TORIKAWA_EMAIL} (MEMBER, active)   — 管理操作テスト対象・日報1件`);
  console.log(`\nPassword: ${SEED_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
