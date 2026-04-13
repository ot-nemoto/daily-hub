# testing.md — テスト方針

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| Server Actions（`src/app/**/actions.ts`） | ユニットテストの作成をもって完了 |
| Route Handlers（`src/app/api/**/route.ts`） | ユニットテストの作成をもって完了 |
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
| UI コンポーネント | 手動動作確認をもって完了（[docs/e2e-scenarios.md](e2e-scenarios.md) 参照） |

---

## ユニットテスト（Vitest）

### 実行

```bash
npm test                          # 1回実行
npm run test:watch                # ウォッチモード（開発中）
npx vitest run --reporter=verbose # テストケース名を全て表示
npm run test:ui                   # UI モード（ブラウザで結果確認）
npm run test:coverage             # カバレッジレポート出力
```

### 対象・方針

- `src/app/**/actions.ts`（Server Actions）はユニットテスト必須
- `src/app/api/**/route.ts`（Route Handlers）はユニットテスト必須
- `src/lib/` 配下のユーティリティ関数はユニットテスト必須
- テストファイルは実装ファイルと同じディレクトリに `[name].test.ts` で配置
- Prisma・Clerk 等の外部依存は `vi.mock` でモック化する
- テストファイル先頭に `// @vitest-environment node` を付ける

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))
```

### カバレッジ方針

#### Server Actions

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値（`{}` または `{ id }` 等） |
| バリデーションエラー | `{ error }` を返す |
| 認可エラー | `{ error }` を返す（認可チェックがある場合） |
| リソース重複 | `{ error }` を返す（該当する場合） |
| リソース未存在 | `{ error }` を返す（該当する場合） |

#### ユーティリティ関数

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |

---

## 手動テスト

機能実装・修正後は [docs/e2e-scenarios.md](e2e-scenarios.md) の対応セクションを参照して動作確認を行う。

---

## E2E テスト（Playwright MCP）

### 制約：T127 Clerk dev browser 問題

開発環境では `proxy.ts`（Node.js runtime）と `@clerk/nextjs` の `clerkMiddleware`（Edge Runtime 向け設計）の非互換により、**Clerk dev browser cookie 未設定の初回ブラウザアクセスが 404 になる**（Clerk 側の対応待ち）。

そのため、E2E テストでは `MOCK_USER_EMAIL` を使って Clerk 認証をバイパスする。

| テストの種類 | MOCK の要否 |
|------------|------------|
| 機能テスト・ロールベースのシナリオ | MOCK 使用 |
| isActive=false の挙動（sunagimo） | MOCK 使用（代替可能） |
| 実際の Clerk ログイン・ログアウトフロー | T127 解消まで自動テスト対象外 |
| 未ログイン → /login リダイレクト | T127 解消まで自動テスト対象外 |

### テストユーザー（`prisma/seed.ts` のシードデータ）

シードユーザーの一覧は [`docs/schema.md` — 初期データ（開発用シード）](schema.md#初期データ開発用シード) を参照。

### Playwright MCP への指示例

```
以下の手順で E2E テストを実施してください。

## 事前準備
1. `npx tsx prisma/seed.ts` を実行してテストデータを初期化する
2. `.env.local` の `MOCK_USER_EMAIL` にテストユーザーのメールアドレスを設定する
3. `npm run dev` でサーバーを起動する（ポート: 3000）

## 制約
- Clerk dev browser の既知バグ（T127）により、MOCK_USER_EMAIL を必ず設定すること
- MOCK_USER_EMAIL を設定した状態では Clerk の実認証フロー・未ログイン挙動は確認できない
- テストユーザーを切り替える場合は .env.local を書き換えてサーバーを再起動すること

## テスト対象
docs/e2e-scenarios.md の [テストしたいセクション名] を参照してテストを実施してください。
```

---

## テストデータ投入（Seed）

### 概要

`prisma/seed.ts` を使って手動テスト用のデータを投入できる。
実行のたびに全レポート・コメントを削除してからデータを投入するため、テスト前に実行することでクリーンな状態を保証できる。
ユーザーは upsert で投入するため、テスト中に変更されたロール・isActive もシード再実行でリセットされる。

### 投入データ

シードデータの詳細（ユーザー一覧・日報・コメント件数）は [`docs/schema.md` — 初期データ（開発用シード）](schema.md#初期データ開発用シード) を参照。

### 実行

手動テスト前に必ず実行してデータを初期化すること。

```bash
npx tsx prisma/seed.ts
```

### 注意事項

- Clerk にユーザーが存在しない場合は自動作成される（パスワード: `Yakitori2026`）
- 既存のレポート・コメントは全削除されるため、手動で追加したデータは失われる
- `CLERK_SECRET_KEY` が `.env.local` に設定されていること
