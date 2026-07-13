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
| 開発サーバー | Turbopack | Next.js 16 デフォルト、HMR が高速 |
| パッケージ管理 | npm | devcontainerのデフォルト環境に合わせる |

## 非機能要件

### パフォーマンス

| # | 要件 |
|---|------|
| NFR-1 | 日次ビューの表示は 1 秒以内（チームメンバー 20 名以下想定） |
| NFR-2 | 月次ビューは最大 31 件の日報を一覧表示できる |

### セキュリティ

| # | 要件 |
|---|------|
| SEC-1 | 他ユーザーの日報を編集・削除できない（サーバー側で検証） |
| SEC-2 | 他ユーザーのコメントを削除できない（サーバー側で検証） |
| SEC-3 | パスワード管理は Clerk に委任する（DB にパスワードを保存しない） |
| SEC-4 | セッションは Clerk が管理する（Clerk JWT + DB ユーザー突合で認証） |

> 実装方針は下記「セキュリティ方針」を参照。

### 可用性・運用

| # | 要件 |
|---|------|
| OPS-1 | ローカル環境（devcontainer）で動作する |
| OPS-2 | 将来的にセルフホスト（VPS/コンテナ）でのデプロイが可能な構成にする |
| OPS-3 | データはDBに永続化し、アプリ再起動後も保持される |

### アクセシビリティ（未対応）

現時点では対応必須としない。

| # | 要件 |
|---|------|
| A11Y-1 | ダイアログ・モーダルに `role="dialog"` / `aria-modal` / `aria-labelledby` を付与する |
| A11Y-2 | キーボード操作（Escキーで閉じる、フォーカス移動）に対応する |
| A11Y-3 | スクリーンリーダーで主要操作（日報作成・編集・管理画面操作）が完結できるようにする |

## 認証フロー

詳細は [`docs/auth.md`](auth.md) を参照。

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
# ブラウザ操作（通常フロー）
Client (React)
  → Server Action
  → Prisma Client
  → Neon PostgreSQL

# 外部API連携（Phase 11〜）
External Client
  → REST API Route (POST /api/reports) ※Authorization: Bearer <api-key>
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
  - **例外:** `POST /api/reports`（Phase 11〜）は外部連携用 REST API のため、`Authorization: Bearer <api-key>` ヘッダーを使ったAPIキー認証を採用する。`getSession()` ではなく `prisma.user.findUnique({ where: { apiKey } })` でユーザーを照合する。
- 日報の編集・コメントの削除は `authorId === session.user.id` をサーバー側で検証
- 管理者 API は `session.user.role === "ADMIN"` をサーバー側で検証（Phase 7a）
- 入力値は Zod でバリデーション
- SQLインジェクション対策は Prisma のパラメータ化クエリに委任
- 招待トークンは `crypto.randomUUID()` で生成し、使用後に `usedAt` をセットして無効化（Phase 7b）

## 環境変数

```env
# .env（ローカル開発・本番共通）
DATABASE_URL="postgresql://..."   # Neon の接続プール URL（?pgbouncer=true&connection_limit=1 付き）
DIRECT_URL="postgresql://..."     # Neon の直接接続 URL（prisma migrate 用）

# Clerk（Phase 10〜）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx               # シード実行時の Clerk ユーザー同期にも使用
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/reports/new

# ローカル開発用モック（Clerk をバイパスして DB ユーザーを直接使用）
# MOCK_USER_ID と MOCK_USER_EMAIL は同時に設定しない（MOCK_USER_ID が優先）
# 対象ユーザーが DB に存在しない場合は console.error を出力し getSession() は null を返す
MOCK_USER_ID=<DB の users.id>
# MOCK_USER_EMAIL=<DB の users.email>
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
    → ビルド（vercel-build: prisma migrate deploy && next build）
      → Vercel にデプロイ
        ※ マイグレーションは vercel-build スクリプトで自動実行

git push origin master
  → GitHub Actions (release.yml) が起動
    → package.json のバージョンを取得
    → タグが未存在なら GitHub Releases を即時公開
      → リリースノートをコミット・PR から自動生成
```

## バージョン固有の仕様・既知の指摘パターン

| ライブラリ | 事象 | 正しい仕様 |
|-----------|------|-----------|
| Next.js 16 | `src/proxy.ts` を `middleware.ts` に変更するよう指摘される | Next.js 16 以降、Middleware は Proxy に改称され `proxy.ts` が公式ファイル名となった。変更不要（[公式ドキュメント](https://nextjs.org/docs/app/getting-started/proxy)） |
---
