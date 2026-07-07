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

## E2E テスト（Playwright）

**ローカル専用。** CI では実行しない。devcontainer 内で dev サーバー・Playwright・ブラウザをすべて完結させて実行する。

> ⚠️ **実行対象 DB の注意**: `global.setup.ts` が `prisma/seed.ts` を実行し、対象 DB の `comment`/`report`/`dayOff` を**全削除**してから再投入する。**必ずローカル/開発用の DB に対してのみ実行すること**（共有 DB・本番相当 DB に向けて実行しない）。実行前に `DATABASE_URL` の向き先を確認する。

シナリオの一覧は [`docs/e2e-scenarios.md`](e2e-scenarios.md) を参照。テストコードは `e2e/` 配下に配置する。

### 構成

| ファイル | 役割 |
|---------|------|
| `playwright.config.ts` | baseURL・`webServer`（dev サーバー自動起動）・`workers: 1`（直列）・Chromium プロジェクト |
| `e2e/global.setup.ts` | Clerk Testing Token 準備（`clerkSetup`）→ シード投入 → ロール別ログインセッションを `e2e/.auth/*.json` に保存 |
| `e2e/fixtures.ts` | 共通定数（シードパスワード・`storageState` パス解決） |
| `e2e/*.spec.ts` | シナリオ本体。`test.use({ storageState: authState("<role>") })` でロール別に実行 |

### 認証方針

- Clerk 認証は [`@clerk/testing`](https://clerk.com/docs/testing/playwright/overview) を利用し、`clerk.signIn()` で UI を経由せずプログラム的にログインする
- ボット検知は Testing Token（`setupClerkTestingToken`）で回避する
- ロール別にログインセッションを `storageState` にキャッシュし、各テストは保存済みセッションから開始する

### シード方針

- **スイート開始前に `global.setup.ts` が1回シードを実行する**（`comment`/`report` を全削除して再投入、ユーザーを upsert）
- データ競合を避けるため `workers: 1` で直列実行する
- 破壊的な操作を伴うテストは、未来日付や専用データで自己完結させ他テストへ影響させない

### テストユーザー

シード定義のユーザー（共通パスワード `Yakitori2026`）を利用する。

| ユーザー | メールアドレス | 用途 |
|---------|-------------|------|
| bonjiri | `bonjiri@example.com` | 管理操作テスト（ADMIN）・admin 系 REST API 確認（apiKey: `c1d2e3f4-a5b6-7890-abcd-ef1234567890`） |
| tsukune | `tsukune@example.com` | 機能テスト全般・APIキーテスト（MEMBER） |
| tebasaki | `tebasaki@example.com` | ユーザー分離確認（MEMBER） |
| nankotsu | `nankotsu@example.com` | VIEWER ロール動作確認・REST API 403 確認（apiKey: `b1e3a704-e5f6-7890-abcd-ef1234567890`） |
| sunagimo | `sunagimo@example.com` | 無効化アカウントのリダイレクト確認（isActive=false） |
| torikawa | `torikawa@example.com` | ロール変更・無効化テストの対象ユーザー（MEMBER） |
| yagen | `yagen@example.com` | 提出状況の「休」表示・提出率（休日除外）確認用（MEMBER、直近14日平日提出 + 休日1件で提出率100%） |

### 実行

```bash
npm run test:e2e          # 通常テスト（シード込み）
npm run test:e2e:shots    # 通常テスト + 全テストの終了時スクリーンショットを取得（目視レビュー用）
npm run test:e2e:ui       # UI モードで実行
npx playwright test daily.spec.ts   # 特定ファイルのみ
```

> 初回のみ `npx playwright install --with-deps chromium` でブラウザを導入する。

### スクリーンショット（目視レビュー用）

既定（`test:e2e`）は**失敗時のみ**スクリーンショットを取得する（`playwright.config.ts` の `screenshot: "only-on-failure"`）。

全テストの画面を目視レビューしたいときは `test:e2e:shots` を使う。これは環境変数 `SHOTS=1` で `screenshot: "on"` に切り替え、**全テストの終了時スクリーンショット**を取得して HTML レポートに添付する。

### レポート

`test:e2e` / `test:e2e:shots` 実行後に HTML レポート（`playwright-report/`）が生成される。`npx playwright show-report` で開ける（各テストのスクリーンショット・失敗時のトレース付き）。

### コード化状況

現状コード化済みの範囲（段階的に拡張中）:

- 認証・リダイレクト、ヘッダー
- 日次ビュー・月次ビュー（表示フィールド複数選択を含む）

未コード化の領域（詳細・編集モーダル／コメント／作成／設定／APIキー／管理／休日／提出状況／REST API）は [`docs/e2e-scenarios.md`](e2e-scenarios.md) を参照し、順次追加する。
