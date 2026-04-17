# testing.md — テスト方針

## 完了条件

| 対象 | 完了条件 |
|------|---------|
| Server Actions（`src/app/**/actions.ts`） | ユニットテストの作成をもって完了 |
| Route Handlers（`src/app/api/**/route.ts`） | ユニットテストの作成をもって完了 |
| ユーティリティ関数（`src/lib/`） | ユニットテストの作成をもって完了 |
| UI コンポーネント | E2E テストの実施をもって完了（[docs/e2e-scenarios.md](e2e-scenarios.md) 参照） |

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

## E2E テスト（Playwright MCP）

### テストユーザー

**E2E テストはシード実行済みであることを前提とする。** シードの実行方法は [`docs/development.md` — シードデータ投入](development.md#シードデータ投入) を参照。

| ユーザー | メールアドレス | パスワード | 用途 |
|---------|-------------|---------|------|
| bonjiri | `bonjiri@example.com` | `Yakitori2026` | 管理操作テスト（ADMIN） |
| tsukune | `tsukune@example.com` | `Yakitori2026` | 機能テスト全般・APIキーテスト（MEMBER） |
| tebasaki | `tebasaki@example.com` | `Yakitori2026` | ユーザー分離確認（MEMBER） |
| nankotsu | `nankotsu@example.com` | `Yakitori2026` | VIEWER ロール動作確認・REST API 403 確認（apiKey: `b1e3a704-e5f6-7890-abcd-ef1234567890`） |
| sunagimo | `sunagimo@example.com` | `Yakitori2026` | 無効化アカウントのリダイレクト確認（isActive=false） |
| torikawa | `torikawa@example.com` | `Yakitori2026` | ロール変更・無効化テストの対象ユーザー（MEMBER） |

### 実施方法

テスト対象の URL と [`docs/e2e-scenarios.md`](e2e-scenarios.md) のシナリオをモデルに渡して実施する。
