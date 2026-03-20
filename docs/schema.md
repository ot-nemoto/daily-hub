# schema.md — DBスキーマ定義

## Prisma スキーマ（`prisma/schema.prisma`）

```prisma
// Prisma 7: generator provider は "prisma-client"、output でクライアント生成先を指定
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

// Prisma 7: datasource に URL は書かない。URL は prisma.config.ts で管理する
datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN   // 管理画面フルアクセス
  MEMBER  // 日報作成・編集・コメント（デフォルト）
  VIEWER  // 閲覧・コメントのみ（Phase 7c）
}

model User {
  id        String  @id @default(cuid())
  clerkId   String? @unique               // Phase 10: Clerk ユーザーID（初回ログイン時に紐付け）
  name      String
  email     String  @unique
  role      Role    @default(MEMBER)      // Phase 7a
  isActive  Boolean @default(true)        // Phase 7a: false でログイン不可
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reports     Report[]
  comments    Comment[]
  invitations Invitation[] @relation("InvitedBy")
}

model Invitation {
  id          String    @id @default(cuid())
  token       String    @unique             // URL に埋め込む使い捨てトークン
  email       String?                       // 招待先メール（任意、指定時はそのメールのみ利用可）
  expiresAt   DateTime                      // 有効期限（発行から72時間）
  usedAt      DateTime?                     // 使用済み日時（null = 未使用）
  createdAt   DateTime  @default(now())

  invitedById String
  invitedBy   User      @relation("InvitedBy", fields: [invitedById], references: [id])

  @@index([token])
}

model Report {
  id           String    @id @default(cuid())
  date         DateTime  // 日付部分のみ使用（時刻は 00:00:00 UTC で統一）
  workContent  String    // 作業内容
  tomorrowPlan String    // 明日の予定
  notes        String    @default("") // 感想・課題・問題点（任意）
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  authorId String
  author   User      @relation(fields: [authorId], references: [id])
  comments Comment[]

  @@unique([authorId, date]) // 1ユーザー1日1件制約 + 月次ビュー用インデックスを兼ねる
  @@index([date])            // 日次ビュー用
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  createdAt DateTime @default(now())

  reportId String
  report   Report @relation(fields: [reportId], references: [id])
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  @@index([reportId])
}
```

---

## テーブル定義（概要）

### User

| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| clerkId | String? | Clerk ユーザーID（nullable・ユニーク）。初回ログイン時に自動紐付け |
| name | String | 表示名 |
| email | String | ユニーク、Clerk 側のメールと紐付けに使用 |
| role | Role (enum) | `ADMIN` / `MEMBER` / `VIEWER`、デフォルト `MEMBER` |
| isActive | Boolean | `false` でログイン不可（データは保持）、デフォルト `true` |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

### Invitation（Phase 7b）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| token | String | ユニーク、URLに埋め込む使い捨てトークン（`crypto.randomUUID()`） |
| email | String? | 招待先メール（任意、指定時はそのメールのみ利用可） |
| expiresAt | DateTime | 有効期限（発行から72時間） |
| usedAt | DateTime? | 使用済み日時（null = 未使用） |
| invitedById | String | 外部キー → User.id（招待した管理者） |
| createdAt | DateTime | 作成日時 |

### Report

| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| date | DateTime | 日報の日付（00:00:00 UTC で保存） |
| workContent | String | 作業内容（必須） |
| tomorrowPlan | String | 明日の予定（必須） |
| notes | String | 感想・課題・問題点（任意、デフォルト空） |
| authorId | String | 外部キー → User.id |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

**制約**
- `(authorId, date)` のユニーク制約で1ユーザー1日1件を保証

### Comment

| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| body | String | コメント本文（必須、1〜1000文字） |
| reportId | String | 外部キー → Report.id |
| authorId | String | 外部キー → User.id |
| createdAt | DateTime | 作成日時 |

---

## インデックス設計

| テーブル | インデックス | 用途 |
|----------|------------|------|
| Report | `date` | 日次ビュー（特定日付の全ユーザー日報取得） |
| Report | `(authorId, date)` | ユニーク制約として自動作成。月次ビュー用インデックスを兼ねる |
| Comment | `reportId` | 日報詳細のコメント取得 |
| Invitation | `token` | 招待リンクのトークン検索 |

---

## 初期データ（開発用シード）

実行コマンド: `npx prisma db seed`（`prisma.config.ts` の `migrations.seed` で設定済み）

| データ | 件数 | 詳細 |
|--------|------|------|
| User | 3 | tanaka@example.com (`ADMIN`) / suzuki@example.com (`MEMBER`) / sato@example.com (`MEMBER`)（パスワード共通: `password123`） |
| Report | 21 | 各ユーザーに過去 7 日分 |
| Comment | 5 | ユーザー間の相互コメント |

シードを再実行すると既存データを全削除してから投入する（べき等）。

---

## 環境変数

```env
# .env.local（開発・本番共通。Neon ダッシュボードから取得）

# 接続プール経由（Vercel Functions から使用）
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dailyhub?pgbouncer=true&connection_limit=1"

# 直接接続（prisma migrate 実行時に使用）
DIRECT_URL="postgresql://user:password@ep-xxx.neon.tech/dailyhub"
```

Neon では開発用と本番用でブランチを分けることができる（無料枠で利用可能）。
