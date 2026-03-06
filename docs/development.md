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

`.env.local` をプロジェクトルートに作成する（`.env` ではなく `.env.local` を使う）：

```env
DATABASE_URL="postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require&pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://<user>:<password>@<host>.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require"
NEXTAUTH_SECRET="<openssl rand -base64 32 で生成>"
NEXTAUTH_URL="http://localhost:3000"
```

### 開発サーバー起動

```bash
npm run dev
```

---

## Prisma 操作

### Prisma 7 のアーキテクチャ概要

Prisma 7 では接続設定が2箇所に分離されている。

- **`prisma.config.ts`**：CLI（migrate / generate）が使う設定。`DIRECT_URL`（直接接続）を使う。
- **`src/lib/prisma.ts`**：ランタイムの `PrismaClient`。`@prisma/adapter-pg` 経由で `DATABASE_URL`（接続プール）を渡す。

`schema.prisma` の `datasource db` ブロックには URL を書かない（Prisma 7 以降の仕様）。

### マイグレーション

```bash
# スキーマ変更後に新しいマイグレーションを作成・適用
npx prisma migrate dev --name <migration-name>

# 例：初回
npx prisma migrate dev --name init

# 本番への適用（デプロイ時に実行）
npx prisma migrate deploy
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

```bash
npx prisma db seed
```

`prisma.config.ts` の `migrations.seed` で設定済み：

```ts
migrations: {
  seed: "tsx prisma/seed.ts",
}
```

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

---

## NEXTAUTH_SECRET の生成

```bash
openssl rand -base64 32
```

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

## デプロイ（Vercel）

1. Vercel ダッシュボードで環境変数を設定（`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`）
2. `main` ブランチにプッシュすると自動デプロイ
3. デプロイ後に `prisma migrate deploy` を実行（Vercel の Build Command に追加推奨）

```
# Vercel Build Command の例
npx prisma migrate deploy && next build
```
