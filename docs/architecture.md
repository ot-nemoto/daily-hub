# architecture.md — 実装方針・技術スタック

## 技術スタック

| レイヤー | 技術 | 理由 |
|----------|------|------|
| フレームワーク | Next.js 16 (App Router) | フロント・APIを一体管理、TypeScript標準対応 |
| 言語 | TypeScript (strict) | 型安全、補完が効く |
| スタイリング | Tailwind CSS v4 | 素早いUI構築、クラスベースで管理しやすい |
| Lint / Format | Biome | ESLint + Prettier を1ツールで代替、高速 |
| ORM | Prisma | 型安全なDBアクセス、マイグレーション管理 |
| DB（開発） | PostgreSQL (Neon) | 開発・本番で同一DBエンジンを使い環境差異をなくす |
| DB（本番） | PostgreSQL (Neon) | サーバーレスPostgreSQL、無料枠で運用可能 |
| 認証 | Clerk (@clerk/nextjs v7, @clerk/backend v3) | eval-hubと同一Clerkアプリを共有・セッション共有。clerkId経由でDBユーザーと紐付け |
| ホスティング | Vercel (Hobby) | Next.jsの開発元、無料枠・無期限、デプロイが最も簡単 |
| ユニットテスト | Vitest + Testing Library | 高速、Vite互換、React コンポーネントテスト対応 |
| E2Eテスト | Playwright | ブラウザ操作・認証フロー・フォーム送信の自動テスト |
| 開発サーバー | Turbopack | Next.js 16 デフォルト、HMR が高速 |
| パッケージ管理 | npm | devcontainerのデフォルト環境に合わせる |

## ディレクトリ構成

```
daily-hub/
├── .github/
│   └── workflows/
│       └── release.yml # master push 時に自動リリース
├── docs/               # 設計ドキュメント
├── prisma/
│   ├── schema.prisma   # DBスキーマ定義
│   ├── seed.ts         # 開発用シードデータ
│   └── migrations/     # マイグレーションファイル
├── prisma.config.ts    # Prisma 7 設定（datasource URL・seed コマンド）
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/[[...rest]]/page.tsx  # Clerk SignIn コンポーネント
│   │   ├── auth-error/
│   │   │   └── page.tsx            # 認証エラー（isActive=false 等）
│   │   ├── reports/
│   │   │   ├── new/page.tsx
│   │   │   ├── daily/page.tsx
│   │   │   ├── monthly/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # 詳細
│   │   │       └── edit/page.tsx   # 編集
│   │   ├── api/
│   │       ├── me/
│   │       │   └── route.ts        # PATCH(名前変更)
│   │       ├── reports/
│   │       │   ├── route.ts        # GET(一覧), POST(作成)
│   │       │   └── [id]/
│   │       │       ├── route.ts    # GET(詳細), PUT(編集)
│   │       │       └── comments/
│   │       │           ├── route.ts        # GET, POST
│   │       │           └── [commentId]/
│   │       │               └── route.ts    # DELETE
│   │       ├── users/
│   │       │   └── route.ts        # GET(ユーザー一覧)
│   │       └── admin/              # 管理者専用API（Phase 7）
│   │           ├── users/
│   │           │   ├── route.ts    # GET(一覧), POST(作成)
│   │           │   └── [id]/
│   │           │       └── route.ts # PATCH(更新), DELETE(削除)
│   │           └── invitations/
│   │               └── route.ts    # GET(一覧), POST(発行)
│   │   ├── settings/
│   │   │   └── page.tsx            # 個人設定（名前変更）（Phase 9）
│   │   └── admin/                  # 管理画面ページ（Phase 7）
│   │       ├── users/
│   │       │   ├── page.tsx        # ユーザー一覧
│   │       │   └── new/page.tsx    # ユーザー作成（Phase 7b）
│   │       └── invitations/
│   │           └── page.tsx        # 招待リンク発行・一覧（Phase 7b）
│   ├── components/     # 再利用UIコンポーネント
│   ├── lib/
│   │   ├── prisma.ts   # Prismaクライアントシングルトン
│   │   └── auth.ts     # getSession()（Clerk + DB統合）
│   └── types/          # 共通型定義
├── e2e/                # Playwright E2Eテスト
├── CLAUDE.md
├── biome.json          # Biome 設定
├── vitest.config.ts    # Vitest 設定
├── playwright.config.ts # Playwright 設定
└── package.json
```

## 認証フロー

```
未認証ユーザー
  → proxy.ts（clerkMiddleware）でセッション確認
  → 未認証なら /login にリダイレクト（Clerk が処理）
  → MOCK_USER_ID が設定されている場合はバイパス（ローカル開発用）

ログイン
  → Clerk の SignIn UI（/login）でメール+パスワード認証
  → Clerk がセッション Cookie を発行

getSession()（src/lib/auth.ts）
  → MOCK_USER_ID 環境変数が設定されている場合は DB ユーザーを直接返す
  → Clerk auth() で userId（clerkId）を取得
  → clerkId で DB ユーザーを検索
  → 未ヒット時：Clerk currentUser() でメールを取得し DB ユーザーと突合
    → 突合成功：clerkId を DB に書き込み（自動紐付け）
    → 突合失敗かつ Clerk にユーザーあり：DB に新規作成
  → isActive === false なら null を返す（API は 401、画面は /auth-error へ）
  → Session 型 { user: { id, name, role, isActive } } を返す
```

## アクセス制御（Phase 7a）

```
/admin/* へのアクセス
  → middleware で role === "ADMIN" を確認
  → admin 以外は / にリダイレクト

/api/admin/* へのアクセス
  → auth() でセッション取得
  → role !== "ADMIN" なら 403 を返す
```

## インフラ構成

```
ブラウザ
  → Vercel Edge Network
    → Next.js (Vercel Functions)
      → Prisma Client
        → Neon PostgreSQL (サーバーレス)
```

## データフロー

```
Client (React)
  → Server Action / fetch()
  → API Route (src/app/api/...)
  → Prisma Client
  → Neon PostgreSQL
```

## 状態管理方針

- グローバルな状態管理ライブラリは使わない（MVP）
- サーバーコンポーネント中心で、データフェッチはサーバー側で行う
- フォームの送信は Server Actions または fetch + API Routes
- クライアント状態（フィルター選択など）は `useState` で管理

### フィルター入力バリデーション方針

日次・月次ビューのフィルターコンポーネント（`DailyFilter`, `MonthlyFilter`）は以下の方針で実装する。

| 入力種別 | 動作 |
|----------|------|
| ユーザー選択（`<select>`） | `onChange` で即時 `router.push()`（選択肢は常に有効値のため検証不要） |
| 日付入力（`<input type="date">`, `<input type="month">`） | `useState` でローカル管理し `onChange` で入力値を更新。有効な場合のみ `router.push()`、無効な場合は `border-red-500` を適用してエラーを示す（URL は変更しない） |

- 入力フィールドは `defaultValue`（非制御）ではなく `value` + `useState`（制御コンポーネント）で管理する
- 日付バリデーションは `isValidDate(value)` / `isValidMonth(value)` のようなユーティリティ関数で行い、正規表現＋`Date` コンストラクタの組み合わせで検証する

## セキュリティ方針

- APIルートは全て `getSession()` でセッション確認してから処理
- 日報の編集・コメントの削除は `authorId === session.user.id` をサーバー側で検証
- 管理者 API は `session.user.role === "ADMIN"` をサーバー側で検証（Phase 7a）
- 入力値は Zod でバリデーション
- SQLインジェクション対策は Prisma のパラメータ化クエリに委任
- 招待トークンは `crypto.randomUUID()` で生成し、使用後に `usedAt` をセットして無効化（Phase 7b）

## 環境変数

```env
# .env.local（ローカル開発・本番共通）
DATABASE_URL="postgresql://..."   # Neon の接続プール URL（?pgbouncer=true&connection_limit=1 付き）
DIRECT_URL="postgresql://..."     # Neon の直接接続 URL（prisma migrate 用）

# Clerk（Phase 10〜）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx               # シード実行時の Clerk ユーザー同期にも使用
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/reports/daily

# ローカル開発用モック（Clerk をバイパスして DB ユーザーを直接使用）
MOCK_USER_ID=<DB の users.id>
```

## Prisma 7 の接続構成

Prisma 7 では URL の設定箇所が分離された。

| 設定箇所 | URL | 用途 |
|----------|-----|------|
| `prisma.config.ts` → `datasource.url` | `DIRECT_URL` | CLI（migrate / generate） |
| `src/lib/prisma.ts` → `PrismaClient` adapter | `DATABASE_URL` | ランタイム（クエリ） |

- `DATABASE_URL`：Neon の **接続プール URL**（`?pgbouncer=true&connection_limit=1` 付き）。Vercel Functions のサーバーレス環境で接続数を節約するために使用。`@prisma/adapter-pg` 経由で渡す。
- `DIRECT_URL`：Neon の **直接接続 URL**。`prisma migrate` は接続プール非対応のため直接接続が必要。

## デプロイフロー

```
git push origin develop
  → Vercel が自動検知
    → ビルド（next build）
      → Vercel にデプロイ
        ※ マイグレーションは事前に手動で実行（prisma migrate deploy）

git push origin master
  → GitHub Actions (release.yml) が起動
    → package.json のバージョンを取得
    → タグが未存在なら GitHub Releases を即時公開
      → リリースノートをコミット・PR から自動生成
```

## 将来の移行パス

| 項目 | 現在（MVP） | 将来 |
|------|------------|------|
| DB | Neon 無料枠 | Neon の有料プラン or 他の PostgreSQL に移行可 |
| 認証 | Clerk | Clerk のダッシュボードで SSO・MFA 等の拡張が可能 |
| ホスティング | Vercel Hobby | Vercel Pro または VPS/Cloud Run に移行可 |
