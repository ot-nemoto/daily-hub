# daily-hub

![CI](https://github.com/ot-nemoto/daily-hub/actions/workflows/ci.yml/badge.svg)
![Version](https://img.shields.io/github/package-json/v/ot-nemoto/daily-hub)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

チームメンバーが毎日の業務内容・翌日予定・所感を記録・共有する日報管理Webアプリ。

## 機能

- 日報の作成・編集（作業内容 / 明日の予定 / 感想・課題・問題点）
- 他メンバーの日報閲覧・コメント
- 日次ビュー：指定日付の全ユーザー日報を一覧（ユーザー絞り込み可）
- 月次ビュー：期間を選択して日報を一覧（ユーザー切り替え可）
- 外部API：APIキーを使ってスクリプトや外部ツールから日報を投稿（→ [docs/api.md](docs/api.md)）

## ドキュメント

設計ドキュメントは [`docs/`](docs/) に格納。

| ファイル | 内容 |
|----------|------|
| [docs/product.md](docs/product.md) | プロダクト定義・目的 |
| [docs/architecture.md](docs/architecture.md) | 技術スタック・実装方針・非機能要件 |
| [docs/ui.md](docs/ui.md) | 機能要件・画面一覧・遷移・UI規約 |
| [docs/api.md](docs/api.md) | 外部 REST API エンドポイント定義 |
| [docs/actions.md](docs/actions.md) | Server Actions 定義 |
| [docs/schema.md](docs/schema.md) | DBスキーマ・Prismaモデル定義 |
| [docs/auth.md](docs/auth.md) | 認証フロー・保護ルート |
| [docs/development.md](docs/development.md) | ローカルセットアップ・Prisma操作・デプロイ手順 |

## クイックスタート

セットアップ・環境変数の詳細は [docs/development.md](docs/development.md) を参照。

```bash
npm install
# 環境変数を設定してから起動（docs/development.md 参照）
npm run dev   # http://localhost:3000
```
