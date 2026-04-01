# daily-hub

チームメンバーが毎日の業務内容・翌日予定・所感を記録・共有する日報管理Webアプリ。

## 機能

- 日報の作成・編集（作業内容 / 明日の予定 / 感想・課題・問題点）
- 他メンバーの日報閲覧・コメント
- 日次ビュー：指定日付の全ユーザー日報を一覧（ユーザー絞り込み可）
- 月次ビュー：期間を選択して日報を一覧（ユーザー切り替え可）

## ドキュメント

設計ドキュメントは [`docs/`](docs/) に格納。

| ファイル | 内容 |
|----------|------|
| [docs/product.md](docs/product.md) | プロダクト定義・目的・MVPスコープ |
| [docs/requirements.md](docs/requirements.md) | 機能要件・非機能要件・画面一覧 |
| [docs/architecture.md](docs/architecture.md) | 技術スタック・ディレクトリ構成・実装方針 |
| [docs/api.md](docs/api.md) | APIエンドポイント定義 |
| [docs/schema.md](docs/schema.md) | DBスキーマ・Prismaモデル定義 |
| [docs/ui.md](docs/ui.md) | 画面一覧・遷移・UIコンポーネント仕様 |
| [docs/auth.md](docs/auth.md) | 認証フロー・保護ルート |
| [docs/development.md](docs/development.md) | ローカルセットアップ・Prisma操作・デプロイ手順 |
| [docs/tasks.md](docs/tasks.md) | フェーズ別マイルストーン |
| [docs/testing.md](docs/testing.md) | 自動テスト方針・カバレッジ規約・実行手順 |
| [docs/manual-testing.md](docs/manual-testing.md) | 手動テスト手順 |

## クイックスタート

セットアップ・環境変数の詳細は [docs/development.md](docs/development.md) を参照。

```bash
npm install
npm run dev   # http://localhost:3000
```
