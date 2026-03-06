# daily-hub

チームメンバーが毎日の業務内容・翌日予定・所感を記録・共有する日報管理Webアプリ。

## 機能

- 日報の作成・編集（作業内容 / 明日の予定 / 感想・課題・問題点）
- 他メンバーの日報閲覧・コメント
- 日次ビュー：指定日付の全ユーザー日報を一覧（ユーザー絞り込み可）
- 月次ビュー：期間を選択して日報を一覧（ユーザー切り替え可）

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript (strict) |
| スタイリング | Tailwind CSS |
| ORM / DB | Prisma + SQLite（開発）/ PostgreSQL（本番） |
| 認証 | NextAuth.js v5 (Credentials Provider) |

## ドキュメント

設計ドキュメントは [`docs/`](docs/) に格納。

| ファイル | 内容 |
|----------|------|
| [docs/product.md](docs/product.md) | プロダクト定義・MVPスコープ |
| [docs/requirements.md](docs/requirements.md) | 機能要件・非機能要件・画面一覧 |
| [docs/architecture.md](docs/architecture.md) | 技術スタック・ディレクトリ構成・実装方針 |
| [docs/api.md](docs/api.md) | APIエンドポイント定義 |
| [docs/schema.md](docs/schema.md) | DBスキーマ・Prismaモデル定義 |
| [docs/tasks.md](docs/tasks.md) | 実装タスク一覧・進捗管理 |

## 開発環境

devcontainer（Node.js & TypeScript）を使用。VS Code の「Reopen in Container」で起動。

```bash
npm install
npx prisma migrate dev
npm run dev
```

> アプリは http://localhost:3000 で起動します。
