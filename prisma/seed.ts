import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });
config(); // fallback to .env

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const USERS = [
  { name: "田中 太郎", email: "tanaka@example.com", role: "ADMIN" as const },
  { name: "鈴木 花子", email: "suzuki@example.com", role: "MEMBER" as const },
  { name: "佐藤 健", email: "sato@example.com", role: "MEMBER" as const },
];

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

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // 既存データを削除（外部キー制約の順序で）
  await prisma.comment.deleteMany();
  await prisma.report.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.user.deleteMany();

  // ユーザー作成
  const users = await Promise.all(
    USERS.map(({ name, email, role }) =>
      prisma.user.create({
        data: { name, email, passwordHash, role },
      }),
    ),
  );
  console.log(`Created ${users.length} users`);

  // 各ユーザーに過去7日分の日報を作成
  const reports = [];
  for (const [userIndex, user] of users.entries()) {
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

  // コメント作成
  // 鈴木→田中の最新日報
  await prisma.comment.create({
    data: {
      reportId: reports[0].id,
      authorId: users[1].id,
      body: "お疲れ様です！バリデーションの追加、助かります。",
    },
  });
  // 佐藤→田中の最新日報
  await prisma.comment.create({
    data: {
      reportId: reports[0].id,
      authorId: users[2].id,
      body: "進捗確認しました。引き続きよろしくお願いします。",
    },
  });
  // 田中→鈴木の最新日報
  await prisma.comment.create({
    data: {
      reportId: reports[7].id,
      authorId: users[0].id,
      body: "ありがとうございます！参考にして実装を進めます。",
    },
  });
  // 佐藤→鈴木の最新日報
  await prisma.comment.create({
    data: {
      reportId: reports[7].id,
      authorId: users[2].id,
      body: "月次ビューの設計方針、共有いただけると助かります。",
    },
  });
  // 田中→佐藤の最新日報
  await prisma.comment.create({
    data: {
      reportId: reports[14].id,
      authorId: users[0].id,
      body: "テスト追加ありがとうございます！カバレッジが上がりましたね。",
    },
  });
  console.log("Created 5 comments");

  console.log("\nSeed completed successfully!");
  console.log("Login credentials: password123 (all users)");
  for (const u of users) console.log(`  ${u.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
