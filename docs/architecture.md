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
| 認証 | NextAuth.js v5 | Next.jsとの統合が容易、Credentials providerで実装 |
| ホスティング | Vercel (Hobby) | Next.jsの開発元、無料枠・無期限、デプロイが最も簡単 |
| ユニットテスト | Vitest + Testing Library | 高速、Vite互換、React コンポーネントテスト対応 |
| E2Eテスト | Playwright | ブラウザ操作・認証フロー・フォーム送信の自動テスト |
| 開発サーバー | Turbopack | Next.js 16 デフォルト、HMR が高速 |
| パッケージ管理 | npm | devcontainerのデフォルト環境に合わせる |

## ディレクトリ構成

```
daily-hub/
├── docs/               # 設計ドキュメント
├── prisma/
│   ├── schema.prisma   # DBスキーマ定義
│   └── migrations/     # マイグレーションファイル
├── src/
│   ├── app/            # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── reports/
│   │   │   ├── new/page.tsx
│   │   │   ├── daily/page.tsx
│   │   │   ├── monthly/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # 詳細
│   │   │       └── edit/page.tsx   # 編集
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── reports/
│   │       │   ├── route.ts        # GET(一覧), POST(作成)
│   │       │   └── [id]/
│   │       │       ├── route.ts    # GET(詳細), PUT(編集)
│   │       │       └── comments/
│   │       │           └── route.ts # GET, POST
│   │       └── users/
│   │           └── route.ts        # GET(ユーザー一覧)
│   ├── components/     # 再利用UIコンポーネント
│   ├── lib/
│   │   ├── prisma.ts   # Prismaクライアントシングルトン
│   │   └── auth.ts     # NextAuth設定
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
  → 全ルートで middleware がセッション確認
  → 未認証なら /login にリダイレクト

ログイン
  → POST /api/auth/callback/credentials
  → bcryptでパスワード検証
  → セッションCookieを発行

セッション
  → NextAuth の JWT セッション (httpOnly Cookie)
  → サーバーコンポーネントで getServerSession() で取得
  → APIルートで auth() で取得
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

## セキュリティ方針

- APIルートは全て `auth()` でセッション確認してから処理
- 日報の編集・コメントの削除は `authorId === session.user.id` をサーバー側で検証
- 入力値は Zod でバリデーション
- SQLインジェクション対策は Prisma のパラメータ化クエリに委任

## 環境変数

```env
# .env.local（ローカル開発）
DATABASE_URL="postgresql://..."   # Neon の接続プール URL（?pgbouncer=true&connection_limit=1 付き）
DIRECT_URL="postgresql://..."     # Neon の直接接続 URL（prisma migrate 用）
NEXTAUTH_SECRET="..."             # openssl rand -base64 32 で生成
NEXTAUTH_URL="http://localhost:3000"

# Vercel 環境変数（本番）
DATABASE_URL="postgresql://..."   # 本番の接続プール URL
DIRECT_URL="postgresql://..."     # 本番の直接接続 URL
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://<your-app>.vercel.app"
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
git push origin main
  → Vercel が自動検知
    → ビルド（next build）
      → Vercel にデプロイ
        → prisma migrate deploy（マイグレーション）
```

## 将来の移行パス

| 項目 | 現在（MVP） | 将来 |
|------|------------|------|
| DB | Neon 無料枠 | Neon の有料プラン or 他の PostgreSQL に移行可 |
| 認証 | Credentials | NextAuth の Provider 追加で Google/GitHub SSO 対応可 |
| ホスティング | Vercel Hobby | Vercel Pro または VPS/Cloud Run に移行可 |
