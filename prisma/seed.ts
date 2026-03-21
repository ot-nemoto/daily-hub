import { createClerkClient } from "@clerk/backend";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config(); // fallback to .env

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const clerkClient =
  process.env.NODE_ENV !== "production" && process.env.CLERK_SECRET_KEY
    ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    : null;

async function syncClerkUser(email: string): Promise<string | null> {
  if (!clerkClient) {
    if (process.env.NODE_ENV === "production") {
      console.warn("  本番環境のため Clerk ユーザー作成をスキップします");
    } else {
      console.warn("  CLERK_SECRET_KEY が未設定のため Clerk ユーザー作成をスキップします");
    }
    return null;
  }

  // 既存の Clerk ユーザーを検索
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0].id;

  // 新規作成
  const created = await clerkClient.users.createUser({
    emailAddress: [email],
    password: "AmericanDogs",
    skipPasswordChecks: true,
  });
  return created.id;
}

// 基準日: 2026-03-07（UTC 00:00:00）
function getDate(daysAgo: number): Date {
  const d = new Date("2026-03-07T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

const WORK_CONTENTS = [
  "機能実装：ログイン画面のバリデーション追加",
  "バグ修正：日報一覧が正しく表示されない問題を修正",
  "コードレビュー：チームメンバーのPRを2件確認",
  "API設計：コメント機能のエンドポイント定義",
  "テスト作成：認証フローのE2Eテスト追加",
  "ドキュメント整備：APIドキュメントを最新化",
  "リファクタリング：Prismaクエリの最適化",
];

const TOMORROW_PLANS = [
  "日報詳細ページのUI実装を開始する",
  "コメント機能のAPI実装を進める",
  "月次ビューのデータ取得ロジックを実装する",
  "ユーザー一覧APIのテストを書く",
  "ナビゲーションコンポーネントの設計をする",
  "レスポンシブ対応の確認と修正",
  "全機能の動作確認と最終調整",
];

// eval-hub と同一ユーザーセット
const USERS = [
  { email: "doigaki@example.com",  name: "土井垣将", role: "ADMIN"  as const },
  { email: "shiranui@example.com", name: "不知火守", role: "ADMIN"  as const },
  { email: "yamada@example.com",   name: "山田太郎", role: "MEMBER" as const },
  { email: "satonaka@example.com", name: "里中智",   role: "MEMBER" as const },
  { email: "iwaki@example.com",    name: "岩鬼正美", role: "MEMBER" as const },
];

async function main() {
  // 既存データを削除（外部キー制約の順序で）
  await prisma.comment.deleteMany();
  await prisma.report.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.user.deleteMany();
  console.log("Deleted all existing data");

  // ユーザー作成（Clerk と同期）
  const users = [];
  for (const { email, name, role } of USERS) {
    const clerkId = await syncClerkUser(email);
    const user = await prisma.user.create({
      data: { email, name, role, ...(clerkId ? { clerkId } : {}) },
    });
    users.push(user);
    console.log(`  Created user: ${email}${clerkId ? " (Clerk synced)" : " (no Clerk)"}`);
  }
  console.log(`Created ${users.length} users`);

  // MEMBER ユーザー（yamada, satonaka, iwaki）に過去7日分の日報を作成
  const memberUsers = users.filter((u) => u.role === "MEMBER");
  const reports = [];
  for (const [userIndex, user] of memberUsers.entries()) {
    for (let i = 0; i < 7; i++) {
      const date = getDate(i);
      const contentIndex = (userIndex * 7 + i) % WORK_CONTENTS.length;
      const report = await prisma.report.create({
        data: {
          authorId: user.id,
          date,
          workContent: WORK_CONTENTS[contentIndex],
          tomorrowPlan: TOMORROW_PLANS[contentIndex],
          notes: i % 3 === 0 ? "特に問題なし。チームの連携がスムーズでよかった。" : "",
        },
      });
      reports.push(report);
    }
  }
  console.log(`Created ${reports.length} reports`);

  // コメント作成（土井垣・不知火がメンバーの日報にコメント）
  const [, shiranui, yamada, satonaka] = users;

  // 不知火→山田の最新日報
  await prisma.comment.create({
    data: { reportId: reports[0].id, authorId: shiranui.id, body: "お疲れ様です！バリデーションの追加、助かります。" },
  });
  // 里中→山田の最新日報
  await prisma.comment.create({
    data: { reportId: reports[0].id, authorId: satonaka.id, body: "進捗確認しました。引き続きよろしくお願いします。" },
  });
  // 山田→里中の最新日報
  await prisma.comment.create({
    data: { reportId: reports[7].id, authorId: yamada.id, body: "ありがとうございます！参考にして実装を進めます。" },
  });
  // 不知火→里中の最新日報
  await prisma.comment.create({
    data: { reportId: reports[7].id, authorId: shiranui.id, body: "月次ビューの設計方針、共有いただけると助かります。" },
  });
  // 山田→岩鬼の最新日報
  await prisma.comment.create({
    data: { reportId: reports[14].id, authorId: yamada.id, body: "テスト追加ありがとうございます！カバレッジが上がりましたね。" },
  });
  console.log("Created 5 comments");

  console.log("\nSeed completed successfully!");
  for (const u of users) console.log(`  ${u.email} / role: ${u.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
