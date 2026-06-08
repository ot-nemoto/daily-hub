# api.md — 外部 REST API 定義

外部連携用の REST API エンドポイント定義（APIキー認証）。

Server Actions の定義は [docs/actions.md](actions.md) を参照。

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認証 |
|---------|------|------|------|
| `GET` | `/api/reports` | 日報一覧取得 | APIキー（全ロール） |
| `POST` | `/api/reports` | 日報作成 | APIキー（MEMBER / ADMIN） |
| `POST` | `/api/admin/reports` | 日報バッチ登録（ADMIN専用） | APIキー（ADMIN のみ） |

---

## `GET /api/reports` — 日報一覧取得

**認証:** `Authorization: Bearer <api-key>` ヘッダー必須

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `date` | `YYYY-MM-DD` | - | 特定日で絞り込む（`from`/`to` と排他。同時指定時は `date` 優先） |
| `from` | `YYYY-MM-DD` | - | 期間開始日（`to` とセットで指定） |
| `to` | `YYYY-MM-DD` | - | 期間終了日（`from` とセットで指定） |
| `authorId` | string | - | 特定ユーザーに絞り込む |

**レスポンス**

```http
GET /api/reports?date=2026-06-01&authorId=xxx
Authorization: Bearer <api-key>
```

```json
{
  "reports": [
    {
      "id": "<report-id>",
      "date": "YYYY-MM-DD",
      "authorId": "<user-id>",
      "authorName": "山田太郎",
      "workContent": "...",
      "tomorrowPlan": "...",
      "notes": "..."
    }
  ]
}
```

ソート順: `date` 降順、同日内は `authorName` 昇順

| ステータス | 内容 |
|---|---|
| 200 | `{ "reports": [...] }`（該当なしは空配列） |
| 401 | APIキーなし・無効・アカウント無効 |
| 422 | バリデーションエラー（`{ "error": "<メッセージ>" }`） |

**権限ルール**

- `ADMIN` / `MEMBER` / `VIEWER` すべて参照可能
- `isActive=false` のユーザーは 401

---

## `POST /api/reports` — 日報作成・一括登録

**認証:** `Authorization: Bearer <api-key>` ヘッダー必須（個人設定で発行）

単体オブジェクトと配列の両方を受け付ける。

単体オブジェクトと配列の両方を受け付ける。既存日報がある場合は上書き（upsert）。

**リクエスト（単体）**

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

**リクエスト（複数日一括）**

```http
POST /api/reports
Authorization: Bearer <api-key>
Content-Type: application/json

[
  { "date": "YYYY-MM-DD", "workContent": "...", "tomorrowPlan": "...", "notes": "..." },
  { "date": "YYYY-MM-DD", "workContent": "...", "tomorrowPlan": "...", "notes": "..." }
]
```

**レスポンス**

単体・配列どちらも `{ "results": [...] }` 形式で返す。HTTP ステータスで create/update を区別する。

| ステータス | 内容 |
|---|---|
| 201 | 全件新規作成 `{ "results": [{ "date": "YYYY-MM-DD", "id": "<report-id>", "status": "created" }] }` |
| 200 | 1件以上が更新 `{ "results": [{ "date": "YYYY-MM-DD", "id": "<report-id>", "status": "created" \| "updated" }] }` |
| 401 | APIキーなし・無効・アカウント無効 |
| 403 | VIEWER ロールによるアクセス |
| 422 | バリデーションエラー（`{ "error": "<メッセージ>" }`） |

**権限ルール**

- `MEMBER` / `ADMIN` ロールのみ作成可能（`VIEWER` は 403）
- 自分の日報のみ登録対象（他ユーザー指定不可）
- `isActive=false` のユーザーは 401

---

## `POST /api/admin/reports` — 日報バッチ登録（ADMIN専用）

**認証:** `Authorization: Bearer <api-key>` ヘッダー必須（ADMIN ロールのユーザーのみ）

**リクエスト**

```http
POST /api/admin/reports
Authorization: Bearer <api-key>
Content-Type: application/json

[
  {
    "userName": "山田太郎",
    "date": "YYYY-MM-DD",
    "workContent": "作業内容（必須・最大5000文字）",
    "tomorrowPlan": "明日の予定（必須・最大5000文字）",
    "notes": "所感（省略可・最大5000文字）"
  }
]
```

**レスポンス**

| ステータス | 内容 |
|---|---|
| 200 | `{ "results": [{ "date": "YYYY-MM-DD", "id": "<report-id>", "status": "created" \| "updated" }] }` |
| 401 | APIキーなし・無効・アカウント無効 |
| 403 | ADMIN 以外によるアクセス |
| 422 | バリデーションエラー（`{ "error": "<メッセージ>" }`） |

**権限ルール**

- `ADMIN` ロールのみ利用可能
- `userName` で対象ユーザーを指定（`User.name` と一致する最初の1件を使用）
- 対象ユーザーが存在しない場合は自動作成（email: ランダム文字列 + `@example.com`、role: `VIEWER`）
- 既存日報がある場合は上書き（upsert）

---

## エラーレスポンス定義

| ステータスコード | 形式 | 説明 |
|----------------|------|------|
| 401 | `{ "error": "<メッセージ>" }` | 認証失敗 |
| 403 | `{ "error": "<メッセージ>" }` | 権限不足 |
| 409 | `{ "error": "<メッセージ>" }` | リソース競合 |
| 422 | `{ "error": "<メッセージ>" }` | バリデーションエラー |
