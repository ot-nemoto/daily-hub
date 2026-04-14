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
  id        String   @id @default(cuid())
  clerkId   String?  @unique @map("clerk_id")              // Phase 10: Clerk ユーザーID（初回ログイン時に紐付け）
  apiKey    String?  @unique @map("api_key")               // Phase 11: 外部API用キー（nullable）
  name      String
  email     String   @unique
  role      Role     @default(MEMBER)                      // Phase 7a
  isActive  Boolean  @default(true) @map("is_active")      // Phase 7a: false でログイン不可
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  reports  Report[]
  comments Comment[]
}

model Report {
  id           String   @id @default(cuid())
  date         DateTime                                    // 日付部分のみ使用（時刻は 00:00:00 UTC で統一）
  workContent  String   @map("work_content")               // 作業内容
  tomorrowPlan String   @map("tomorrow_plan")              // 明日の予定
  notes        String   @default("")                       // 感想・課題・問題点（任意）
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  authorId String  @map("author_id")
  author   User    @relation(fields: [authorId], references: [id])
  comments Comment[]

  @@unique([authorId, date]) // 1ユーザー1日1件制約 + 月次ビュー用インデックスを兼ねる
  @@index([date])            // 日次ビュー用
}

model Comment {
  id        String   @id @default(cuid())
  body      String
  createdAt DateTime @default(now()) @map("created_at")

  reportId String @map("report_id")
  report   Report @relation(fields: [reportId], references: [id])
  authorId String @map("author_id")
  author   User   @relation(fields: [authorId], references: [id])

  @@index([reportId])
}
```

---

## リレーション図

```mermaid
erDiagram
    User {
        String id PK
        String clerkId UK "nullable"
        String apiKey UK "nullable"
        String name
        String email UK
        Role role "ADMIN / MEMBER / VIEWER"
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
    }
    Report {
        String id PK
        DateTime date
        String workContent
        String tomorrowPlan
        String notes
        String authorId FK
        DateTime createdAt
        DateTime updatedAt
    }
    Comment {
        String id PK
        String body
        String reportId FK
        String authorId FK
        DateTime createdAt
    }
    User ||--o{ Report : "作成"
    User ||--o{ Comment : "投稿"
    Report ||--o{ Comment : "コメント"
```

---

## テーブル定義（概要）

### User

| カラム | 型 | 説明 |
|--------|-----|------|
| id | String (CUID) | 主キー |
| clerkId | String? | Clerk ユーザーID（nullable・ユニーク）。初回ログイン時に自動紐付け |
| apiKey | String? | 外部API用キー（nullable・ユニーク）。ユーザーが個人設定で生成・失効 |
| name | String | 表示名 |
| email | String | ユニーク、Clerk 側のメールと紐付けに使用 |
| role | Role (enum) | `ADMIN` / `MEMBER` / `VIEWER`、デフォルト `MEMBER` |
| isActive | Boolean | `false` でログイン不可（データは保持）、デフォルト `true` |
| createdAt | DateTime | 作成日時 |
| updatedAt | DateTime | 更新日時 |

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

## カスケード動作

Prisma スキーマに `onDelete` を指定していないため、全リレーションのデフォルトは **`Restrict`**（参照先レコードが存在する間は削除不可）となる。

| リレーション | onDelete | 影響 |
|-------------|----------|------|
| Report → User | Restrict | User 削除前に Report を削除する必要がある |
| Comment → User | Restrict | User 削除前に Comment を削除する必要がある |
| Comment → Report | Restrict | Report 削除前に Comment を削除する必要がある |

**`deleteUser`（ADM-11）実装時の注意：** User を削除する前に、その User が投稿した Comment および Report をアプリケーション側で先に削除すること。

---

## インデックス設計

| テーブル | インデックス | 用途 |
|----------|------------|------|
| Report | `date` | 日次ビュー（特定日付の全ユーザー日報取得） |
| Report | `(authorId, date)` | ユニーク制約として自動作成。月次ビュー用インデックスを兼ねる |
| Comment | `reportId` | 日報詳細のコメント取得 |

