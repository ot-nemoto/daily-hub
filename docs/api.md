# api.md — 外部 REST API 定義

外部連携用の REST API エンドポイント定義（APIキー認証）。

Server Actions の定義は [docs/actions.md](actions.md) を参照。

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証 |
|---------|------|------|------|
| `POST` | `/api/reports` | 日報作成 | APIキー |

---

## `POST /api/reports` — 日報作成

**認証:** `Authorization: Bearer <api-key>` ヘッダー必須（個人設定で発行）

**リクエスト**

```http
POST /api/reports
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "date": "YYYY-MM-DD",
  "workContent": "作業内容（必須・最大5000文字）",
  "tomorrowPlan": "明日の予定（必須・最大5000文字）",
  "notes": "所感（省略可・最大5000文字）"
}
```

**レスポンス**

| ステータス | 内容 |
|---|---|
| 201 | `{ "id": "<report-id>" }` |
| 401 | APIキーなし・無効・アカウント無効 |
| 403 | VIEWER ロールによるアクセス |
| 409 | 同日の日報が既存 |
| 422 | バリデーションエラー（`{ "error": "<メッセージ>" }`） |

**権限ルール**

- `MEMBER` / `ADMIN` ロールのみ作成可能（`VIEWER` は 403）
- 自分の日報のみ作成可能（1ユーザー1日1件）
- `isActive=false` のユーザーは 401

---

## エラーレスポンス定義

| ステータスコード | 形式 | 説明 |
|----------------|------|------|
| 401 | `{ "error": "<メッセージ>" }` | 認証失敗 |
| 403 | `{ "error": "<メッセージ>" }` | 権限不足 |
| 409 | `{ "error": "<メッセージ>" }` | リソース競合 |
| 422 | `{ "error": "<メッセージ>" }` | バリデーションエラー |
