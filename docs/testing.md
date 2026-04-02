# testing.md — テスト方針

## テスト種別

| 種別 | ツール | 必須 |
|------|--------|------|
| ユニットテスト | Vitest + Testing Library | APIルート・`src/lib/` は必須 |
| 手動テスト | — | UI実装時に必須（[manual-testing.md](manual-testing.md) 参照） |
| E2E・ビジュアルリグレッション | 未導入 | UIコンポーネントのユニットテストはこれらで代替する場合のみ必須 |

## 完了条件

- **APIルート**の実装はユニットテストの作成・通過をもって完了とする
- **`src/lib/` 配下のユーティリティ関数**もユニットテストの作成をもって完了とする
- **UIコンポーネント**のユニットテストは必須としない

## ファイル配置

テストファイルは実装ファイルと同じディレクトリに配置する。

```
src/app/api/reports/route.ts
src/app/api/reports/route.test.ts   ← 同階層に配置

src/lib/utils.ts
src/lib/utils.test.ts
```

テストファイルの先頭に以下を付ける（APIルートは Node 環境で実行）：

```ts
// @vitest-environment node
```

## モック方針

Prisma・外部サービス（Clerk、bcrypt 等）は `vi.mock` でモック化する。

```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))
```

## カバレッジ方針

### APIルート

| ケース | 条件 |
|--------|------|
| 正常系 | 期待するステータスコードとレスポンス |
| バリデーションエラー | 400 |
| 認可エラー | 403（認可チェックがある場合） |
| リソース重複 | 409（該当する場合） |
| リソース未存在 | 404（該当する場合） |

### ユーティリティ関数

| ケース | 条件 |
|--------|------|
| 正常系 | 期待する戻り値 |
| 境界値・エッジケース | 空文字、フォーマット違反、範囲外の値など |

## 実行コマンド

```bash
# 1回だけ実行
npx vitest run

# 詳細表示（テストケース名を全て表示）
npx vitest run --reporter=verbose

# ウォッチモードで実行（開発中）
npm run test:watch

# UI モードで実行（ブラウザで結果確認）
npm run test:ui

# カバレッジレポート出力
npm run test:coverage
```
