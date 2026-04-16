# development.md — 開発・運用手順

## ローカル開発セットアップ

### 前提条件

- Node.js 20+
- npm
- Neon アカウント（PostgreSQL）

### 初回セットアップ

```bash
npm install
```

`.env.local` をプロジェクトルートに作成する（`.env` ではなく `.env.local` を使う）。環境変数の詳細は [`docs/architecture.md` — 環境変数](architecture.md#環境変数) を参照。

```env
DATABASE_URL="postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://<user>:<password>@<host>.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/reports/daily
# MOCK_USER_ID=<DB の users.id>
# MOCK_USER_EMAIL=<DB の users.email>
```

### 設定済み MCP サーバー

`.mcp.json` に以下のサーバーが定義されている。

| サーバー | 主な用途 | 認証 |
|----------|----------|------|
| `context7` | ライブラリの最新ドキュメント参照 | 不要 |
| `playwright` | E2E テスト（ブラウザ操作・画面確認） | 不要 |

### 必須ツール

| ツール | 用途 |
|--------|------|
| [GitHub CLI (`gh`)](https://cli.github.com/) | Issue・PR の作成・参照・更新 |

`gh auth login` で認証する。

### 開発サーバー起動

```bash
npm run dev
```

---

## Prisma 操作

### Prisma 7 のアーキテクチャ概要

接続設定の詳細は [`docs/architecture.md` — Prisma 7 の接続構成](architecture.md#prisma-7-の接続構成) を参照。

### マイグレーション

マイグレーションは**常に手動で実行**する（ビルドスクリプトによる自動実行は行わない）。

```bash
# スキーマ変更後に新しいマイグレーションを作成・適用
npx prisma migrate dev --name <migration-name>

# 例：初回
npx prisma migrate dev --name init

# 本番・ステージング環境への適用（デプロイ前に手動実行）
npx prisma migrate deploy
```

#### DB を完全リセットしてシードを投入し直す場合

```bash
# DB をリセット（全テーブル削除・マイグレーション再適用）
npx prisma migrate reset --force

# シードデータを投入
npx tsx prisma/seed.ts
```

### Prisma クライアント再生成

```bash
npx prisma generate
```

`schema.prisma` を変更したら必ず実行する。生成先は `src/generated/prisma/`。

### DB 接続確認

```bash
npx prisma db execute --stdin <<'SQL'
SELECT 1 AS ok;
SQL
```

### スキーマの現状確認

```bash
npx prisma migrate status
```

### シードデータ投入

手動テスト前に必ず実行してデータを初期化すること。

```bash
npx tsx prisma/seed.ts
```

#### 投入データ

| データ | 件数 | 詳細 |
|--------|------|------|
| User | 6 | 下表参照 |
| Report | 15 | MEMBER 2名 × 今日を基準とした過去 7 日分 + 管理操作対象 1件 |
| Comment | 5 | ユーザー間の相互コメント（VIEWER によるコメントを含む） |

#### シードユーザー一覧

| email | 名前 | ロール | isActive | 用途 |
|-------|------|--------|----------|------|
| bonjiri@example.com | bonjiri | ADMIN | true | 管理操作の実行者。日報なし（管理画面で「最終日報投稿日: なし」の表示確認用） |
| tsukune@example.com | tsukune | MEMBER | true | 日報・コメント・ユーザー分離テストのメインユーザー。apiKey: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`（REST API 動作確認用） |
| tebasaki@example.com | tebasaki | MEMBER | true | ユーザー分離テストの「他ユーザー」。日報・コメントあり |
| nankotsu@example.com | nankotsu | VIEWER | true | 日報作成不可・コメントのみ可の確認用 |
| sunagimo@example.com | sunagimo | MEMBER | false | ログイン後 `/auth-error?reason=inactive` リダイレクト・再有効化の確認用 |
| torikawa@example.com | torikawa | MEMBER | true | 管理画面でのロール変更・無効化テスト専用。日報1件あり |

- 初期パスワード: `Yakitori2026`
- シードはテスト直前に実行することを想定しており、日報の日付は実行日を基準とした過去 7 日分で作成される
- ユーザーは upsert で投入するため、テスト中に変更されたロール・isActive はシード再実行でリセットされる
- シードを再実行するとレポート・コメントは全削除して再投入する（ユーザーは upsert のため削除しない）
- `CLERK_SECRET_KEY` は必須。未設定の場合はエラーで終了する。シード実行時に Clerk ユーザーも自動作成・紐付けされる（既存ユーザーはスキップ）

### Prisma Studio（GUIでDBを確認）

```bash
npx prisma studio
```

ブラウザで `http://localhost:5555` が開く。

---

## Neon の接続文字列の取得

1. [Neon ダッシュボード](https://console.neon.tech) → プロジェクト → **Connection Details**
2. **Connection pooling ON** の文字列 → `DATABASE_URL`
   - 末尾に `&pgbouncer=true&connection_limit=1` を追加
3. **Connection pooling OFF** の文字列 → `DIRECT_URL`

開発用と本番用でブランチを分けることができる（無料枠で利用可能）。

---

## よくある問題

### `prisma migrate dev` が失敗する

- `DIRECT_URL` が正しいか確認（接続プール URL ではなく直接接続 URL を使う）
- `prisma.config.ts` の `datasource.url` が `DIRECT_URL` を参照しているか確認

### 本番でクエリが失敗する

- `DATABASE_URL` が接続プール URL になっているか確認（`-pooler` が含まれるホスト名）
- `@prisma/adapter-pg` が正しくインストールされているか確認

### Prisma クライアントの型が古い

```bash
npx prisma generate
```

を実行してクライアントを再生成する。

---

## テスト

詳細なテスト方針・カバレッジ規約は [`docs/testing.md`](testing.md) を参照。

## デプロイ（Vercel）

1. Vercel ダッシュボードで環境変数を設定（`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`）
2. デプロイ前に**手動**でマイグレーションを適用する

   ```bash
   npx prisma migrate deploy
   ```

3. `main` ブランチにプッシュすると自動デプロイ（Build Command は `next build` のみ）
