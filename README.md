# daily-hub

チームメンバーが毎日の業務内容・翌日予定・所感を記録・共有する日報管理Webアプリ。

## 機能

- 日報の作成・編集（作業内容 / 明日の予定 / 感想・課題・問題点）
- 他メンバーの日報閲覧・コメント
- 日次ビュー：指定日付の全ユーザー日報を一覧（ユーザー絞り込み可）
- 月次ビュー：期間を選択して日報を一覧（ユーザー切り替え可）
- 外部API：APIキーを使ってスクリプトや外部ツールから日報を投稿

## ドキュメント

設計ドキュメントは [`docs/`](docs/) に格納。

| ファイル | 内容 |
|----------|------|
| [docs/product.md](docs/product.md) | プロダクト定義・目的 |
| [docs/requirements.md](docs/requirements.md) | 機能要件・非機能要件・画面一覧 |
| [docs/architecture.md](docs/architecture.md) | 技術スタック・ディレクトリ構成・実装方針 |
| [docs/api.md](docs/api.md) | 外部 REST API エンドポイント定義 |
| [docs/actions.md](docs/actions.md) | Server Actions 定義 |
| [docs/schema.md](docs/schema.md) | DBスキーマ・Prismaモデル定義 |
| [docs/ui.md](docs/ui.md) | 画面一覧・遷移・UIコンポーネント仕様 |
| [docs/auth.md](docs/auth.md) | 認証フロー・保護ルート |
| [docs/development.md](docs/development.md) | ローカルセットアップ・Prisma操作・デプロイ手順 |
| [docs/tasks.md](docs/tasks.md) | フェーズ別マイルストーン |
| [docs/testing.md](docs/testing.md) | 自動テスト方針・カバレッジ規約・実行手順 |
| [docs/e2e-scenarios.md](docs/e2e-scenarios.md) | E2Eテストシナリオ・手動テスト観点 |

## 外部APIから日報を投稿する

スクリプトや外部ツールから日報を投稿できます。

**1. APIキーを発行する**

`/settings`（個人設定）を開き、「APIキー」セクションで「生成する」をクリック。

**2. 日報を投稿する**

```bash
curl -X POST https://<your-domain>/api/reports \
  -H "Authorization: Bearer <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-12",
    "workContent": "作業内容",
    "tomorrowPlan": "明日の予定",
    "notes": "所感（省略可）"
  }'
```

成功すると `201` と作成された日報の ID が返ります。

```json
{ "id": "cm..." }
```

| ステータス | 意味 |
|---|---|
| 201 | 作成成功 |
| 401 | APIキーが無効またはアカウントが無効 |
| 403 | VIEWER ロールのため投稿不可 |
| 409 | 同日の日報が既に存在する |
| 422 | 入力値が不正 |

エンドポイントの詳細は [docs/api.md](docs/api.md) を参照。

---

## クイックスタート

セットアップ・環境変数の詳細は [docs/development.md](docs/development.md) を参照。

```bash
npm install
# 環境変数を設定してから起動（docs/development.md 参照）
npm run dev   # http://localhost:3000
```
