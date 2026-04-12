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
├── prisma.config.ts    # Prisma 7 設定（datasource URL）
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
│   │   │   └── reports/
│   │   │       └── route.ts        # POST(作成) ※APIキー認証（Phase 11）

│   │   ├── settings/
│   │   │   └── page.tsx            # 個人設定（名前変更）（Phase 9）
│   │   └── admin/                  # 管理画面ページ（Phase 7）
│   │       └── users/
│   │           └── page.tsx        # ユーザー一覧
│   ├── components/     # 再利用UIコンポーネント
│   ├── lib/
│   │   ├── prisma.ts   # Prismaクライアントシングルトン
│   │   └── auth.ts     # getSession()（Clerk + DB統合）
│   └── types/          # 共通型定義
├── CLAUDE.md
├── biome.json          # Biome 設定
├── vitest.config.ts    # Vitest 設定
└── package.json
```

## 認証フロー

```
未認証ユーザー
  → proxy.ts（clerkMiddleware）でセッション確認
  → 未認証なら /login にリダイレクト（Clerk が処理）
  → MOCK_USER_ID / MOCK_USER_EMAIL が設定されている場合はバイパス（ローカル開発用）

ログイン
  → Clerk の SignIn UI（/login）でメール+パスワード認証
  → Clerk がセッション Cookie を発行

getSession()（src/lib/auth.ts）
  → MOCK_USER_ID 環境変数が設定されている場合は id で DB ユーザーを直接返す
  → MOCK_USER_EMAIL 環境変数が設定されている場合は email で DB ユーザーを直接返す
  → どちらも対象ユーザーが DB に存在しない場合は console.error を出力し null を返す
  → Clerk auth() で userId（clerkId）を取得
  → clerkId で DB ユーザーを検索
  → 未ヒット時：Clerk currentUser() でメールを取得し DB ユーザーと突合
    → 突合成功：clerkId を DB に書き込み（自動紐付け）
    → 突合失敗かつ Clerk にユーザーあり：DB に新規作成
  → isActive === false なら: ページ（redirectOnInactive=true）は /auth-error?reason=inactive にリダイレクト、API は null を返す（401）
  → 未認証（Clerk セッションなし）なら null を返す（API は 401、画面は /login へ）
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
# .env.local（ローカル開発・本番共通）
DATABASE_URL="postgresql://..."   # Neon の接続プール URL（?pgbouncer=true&connection_limit=1 付き）
DIRECT_URL="postgresql://..."     # Neon の直接接続 URL（prisma migrate 用）

# Clerk（Phase 10〜）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx               # シード実行時の Clerk ユーザー同期にも使用
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/reports/daily

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
    → ビルド（next build）
      → Vercel にデプロイ
        ※ マイグレーションは事前に手動で実行（prisma migrate deploy）

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
| Next.js 16 + `@clerk/nextjs` v7 | 開発環境の初回ブラウザアクセス時に全ルートが 404 になる（T127） | **既知の不具合。詳細は [T127](#t127-開発環境の初回ブラウザアクセスで-404-になる) を参照。** |

---

## 既知の不具合

### [T127] 開発環境の初回ブラウザアクセスで 404 になる

**影響範囲：** `npm run dev` 起動後、Clerk dev browser cookie が未設定の状態でブラウザからページにアクセスしたとき

**発生条件（3条件の AND）：**
1. 開発環境（`NODE_ENV=development`）
2. Clerk dev browser cookie 未設定（初回アクセス・Cookie クリア後）
3. ブラウザのナビゲーションリクエスト（`Sec-Fetch-Dest: document`）

**根本原因：**
- `proxy.ts` は Node.js runtime で動作する（Next.js 16 の新機能）
- `@clerk/nextjs` の `clerkMiddleware` は Edge Runtime（`middleware.ts`）向けに実装されており、`proxy.ts` では dev browser handshake フローが正しく処理されない
- dev browser missing 検出 → Clerk FAPI へのハンドシェイクリダイレクト → `proxy.ts` でリダイレクトが正しく処理されず `/clerk_XXXX` へリライト → 404
- Clerk 公式 Issue にて `proxy.ts`（Node.js runtime）の完全対応は未完了（[clerk/javascript#7705](https://github.com/clerk/javascript/issues/7705) は用語変更のみ）

**本番環境での影響：** なし（Vercel 本番環境は dev browser チェックが存在しない）

**回避策：** `.env.local` に以下のいずれか1つを設定することで Clerk 認証をバイパスできる

> **注意:** `MOCK_USER_ID` と `MOCK_USER_EMAIL` は同時に設定しないこと。両方設定した場合は `MOCK_USER_ID` が優先される。

```env
# どちらか片方のみ設定
MOCK_USER_ID=<DBのユーザーID>
# または
# MOCK_USER_EMAIL=<DBのメールアドレス>
```

**E2E テスト（Playwright）での対応：** `MOCK_USER_ID` または `MOCK_USER_EMAIL` を設定した状態でテストを実行すること（`prisma/seed.ts` のシードデータに含まれるユーザーを使用）

**対応方針：** Clerk 側の `proxy.ts` 対応完了後に回避策を削除する

---

## 将来の移行パス

| 項目 | 現在（MVP） | 将来 |
|------|------------|------|
| DB | Neon 無料枠 | Neon の有料プラン or 他の PostgreSQL に移行可 |
| 認証 | Clerk | Clerk のダッシュボードで SSO・MFA 等の拡張が可能 |
| ホスティング | Vercel Hobby | Vercel Pro または VPS/Cloud Run に移行可 |
