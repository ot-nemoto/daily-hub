# api.md — APIエンドポイント定義

> 全エンドポイントは認証必須。未認証の場合は `401 Unauthorized` を返す。
> 認証は Clerk（Phase 10〜）。サーバー側では `getSession()` でセッションを取得する。

---

## エンドポイント一覧

| メソッド | パス | 概要 | 認可 |
|---------|------|------|------|
| PATCH | `/api/me` | ログイン中ユーザーの名前変更 | 要ログイン |
| GET | `/api/users` | ユーザー一覧取得 | 要ログイン |
| GET | `/api/reports` | 日報一覧取得（日次・月次） | 要ログイン |
| POST | `/api/reports` | 日報作成 | VIEWER 以外（MEMBER・ADMIN） |
| GET | `/api/reports/[id]` | 日報詳細取得 | 要ログイン |
| PUT | `/api/reports/[id]` | 日報編集 | 本人かつ VIEWER 以外（MEMBER・ADMIN） |
| GET | `/api/reports/[id]/comments` | コメント一覧取得 | 要ログイン |
| POST | `/api/reports/[id]/comments` | コメント追加 | 要ログイン |
| DELETE | `/api/reports/[id]/comments/[commentId]` | コメント削除 | 本人のみ |
| GET | `/api/admin/users` | ユーザー一覧取得（管理用） | ADMIN のみ |
| POST | `/api/admin/users` | ユーザー作成 | ADMIN のみ |
| PATCH | `/api/admin/users/[id]` | ユーザー情報更新（ロール・有効化） | ADMIN のみ |
| DELETE | `/api/admin/users/[id]` | ユーザー完全削除 | ADMIN のみ |
| POST | `/api/admin/invitations` | 招待リンク発行 | ADMIN のみ |
| GET | `/api/admin/invitations` | 招待リンク一覧取得 | ADMIN のみ |

---

## ユーザー

### PATCH /api/me
ログイン中ユーザーの名前変更

**Request Body**
```json
{ "name": "新しい名前" }
```

**Response 200**
```json
{ "id": "cuid", "name": "新しい名前", "email": "user@example.com" }
```

**Errors**
- `400` — バリデーションエラー（名前が空・100文字超）
- `401` — 未認証

---

### GET /api/users
全ユーザー一覧（日次ビューのユーザー選択用）

**Response 200**
```json
[
  { "id": "cuid", "name": "山田 太郎", "email": "yamada@example.com" }
]
```

---

## 日報

### GET /api/reports
日報一覧取得（クエリパラメータで絞り込み）

**Query Parameters**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `date` | `YYYY-MM-DD` | いずれか1つ | 指定日の全ユーザー日報（日次ビュー） |
| `userId` | string | - | 特定ユーザーに絞り込み（`date` と併用） |
| `from` | `YYYY-MM-DD` | いずれか1つ | 期間開始（月次ビュー） |
| `to` | `YYYY-MM-DD` | `from` と同時 | 期間終了（月次ビュー） |
| `authorId` | string | - | 特定ユーザーに絞り込み（`from/to` と併用） |

**Response 200**
```json
[
  {
    "id": "cuid",
    "date": "2026-03-06",
    "workContent": "○○機能の実装",
    "tomorrowPlan": "レビュー対応",
    "notes": "DBの設計で詰まった",
    "author": { "id": "cuid", "name": "山田 太郎" },
    "commentCount": 2,
    "createdAt": "2026-03-06T12:00:00Z",
    "updatedAt": "2026-03-06T18:00:00Z"
  }
]
```

---

### POST /api/reports
日報作成

**Request Body**
```json
{
  "date": "2026-03-06",
  "workContent": "○○機能の実装",
  "tomorrowPlan": "レビュー対応",
  "notes": "DBの設計で詰まった"
}
```

**Response 201**
```json
{ "id": "cuid" }
```

**Errors**
- `400` — バリデーションエラー（フィールド不足・形式不正）
- `409` — 同日にすでに日報が存在する

---

### GET /api/reports/[id]
日報詳細取得

**Response 200**
```json
{
  "id": "cuid",
  "date": "2026-03-06",
  "workContent": "○○機能の実装",
  "tomorrowPlan": "レビュー対応",
  "notes": "DBの設計で詰まった",
  "author": { "id": "cuid", "name": "山田 太郎" },
  "comments": [
    {
      "id": "cuid",
      "body": "お疲れ様です",
      "author": { "id": "cuid", "name": "鈴木 花子" },
      "createdAt": "2026-03-06T19:00:00Z"
    }
  ],
  "createdAt": "2026-03-06T12:00:00Z",
  "updatedAt": "2026-03-06T18:00:00Z"
}
```

**Errors**
- `404` — 日報が存在しない

---

### PUT /api/reports/[id]
日報編集（自分の日報のみ）

**Request Body**
```json
{
  "workContent": "○○機能の実装（完了）",
  "tomorrowPlan": "レビュー対応",
  "notes": "解決できた"
}
```

**Response 200**
```json
{ "id": "cuid" }
```

**Errors**
- `400` — バリデーションエラー
- `403` — 他ユーザーの日報を編集しようとした
- `404` — 日報が存在しない

---

## コメント

### GET /api/reports/[id]/comments
コメント一覧（日報詳細取得時に含めるため基本的に使わないが定義する）

**Response 200**
```json
[
  {
    "id": "cuid",
    "body": "お疲れ様です",
    "author": { "id": "cuid", "name": "鈴木 花子" },
    "createdAt": "2026-03-06T19:00:00Z"
  }
]
```

---

### POST /api/reports/[id]/comments
コメント追加

**Request Body**
```json
{ "body": "お疲れ様です" }
```

**Response 201**
```json
{ "id": "cuid" }
```

**Errors**
- `400` — バリデーションエラー（空文字・1000文字超）
- `404` — 日報が存在しない

---

### DELETE /api/reports/[id]/comments/[commentId]
コメント削除（自分のコメントのみ）

**Response 204** — No Content

**Errors**
- `403` — 他ユーザーのコメントを削除しようとした
- `404` — コメントが存在しない

---

## 管理者（ADMIN ロール必須）

> 全エンドポイントは `ADMIN` ロールのユーザーのみアクセス可能。`ADMIN` 以外は `403 Forbidden`。

### GET /api/admin/users
ユーザー一覧取得（管理画面用）

**Response 200**
```json
[
  {
    "id": "cuid",
    "name": "土井垣将",
    "email": "doigaki@example.com",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "lastReportAt": "2026-03-10T00:00:00Z",
    "submissionRate30d": 0.85
  }
]
```

- `lastReportAt`: 最後に日報を投稿した日付（投稿なしは `null`）
- `submissionRate30d`: 直近30日間のうち日報を提出した割合（0〜1）

---

### POST /api/admin/users
ユーザー直接作成（Phase 7b）

`clerkId` は null のまま作成され、対象者が Clerk でログインした際に自動紐付けされる。

**Request Body**
```json
{ "name": "山田 太郎", "email": "yamada@example.com", "role": "MEMBER" }
```

- `role` は省略可（デフォルト `MEMBER`）。`MEMBER` または `VIEWER` のみ指定可

**Response 201**
```json
{ "id": "cuid" }
```

**Errors**
- `400` — バリデーションエラー
- `409` — メールアドレスが既に使用されている

---

### PATCH /api/admin/users/[id]
ユーザー情報更新（ロール変更・有効化／無効化）

**Request Body**（変更したいフィールドのみ指定）
```json
{ "role": "MEMBER", "isActive": false }
```

**Response 200**
```json
{ "id": "cuid" }
```

**Errors**
- `400` — バリデーションエラー（不正なロール値など）
- `403` — 自分自身の `ADMIN` ロールを降格しようとした
- `404` — ユーザーが存在しない

---

### DELETE /api/admin/users/[id]
ユーザー完全削除（日報・コメントを含む）（Phase 7c）

**Response 204** — No Content

**Errors**
- `403` — 自分自身を削除しようとした
- `404` — ユーザーが存在しない

---

### POST /api/admin/invitations
招待リンク発行（Phase 7b）

**Request Body**
```json
{ "email": "invite@example.com" }
```
- `email` は任意。指定した場合はそのメールアドレスのみ利用可

**Response 201**
```json
{
  "id": "cuid",
  "token": "uuid-token",
  "inviteUrl": "https://daily-hub.vercel.app/login",
  "expiresAt": "2026-03-14T00:00:00Z"
}
```

**Errors**
- `400` — メールアドレス形式が不正

---

### GET /api/admin/invitations
招待リンク一覧取得（Phase 7b）

**Response 200**
```json
[
  {
    "id": "cuid",
    "email": "invite@example.com",
    "inviteUrl": "https://daily-hub.vercel.app/login",
    "expiresAt": "2026-03-14T00:00:00Z",
    "usedAt": null,
    "createdAt": "2026-03-11T00:00:00Z"
  }
]
```

---

## エラーレスポンス定義

### 共通レスポンス形式

エラーは JSON 形式で統一して返す。

```json
{ "error": "エラーメッセージ" }
```

ほとんどのエンドポイントではバリデーションエラー時に Zod の `flatten()` 形式を返す。

```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "date": ["YYYY-MM-DD 形式で入力してください"],
      "workContent": ["必須項目です"]
    }
  }
}
```

ただし `PATCH /api/me` は内部的に flatten() を使って最初のエラーメッセージを取り出し、`{ "error": "文字列" }` の形式で返す。

### 共通ステータスコード

| ステータス | 説明 |
|-----------|------|
| `400 Bad Request` | バリデーション失敗（フィールド不足・形式不正など） |
| `401 Unauthorized` | 未認証（Clerk セッションなし） |
| `403 Forbidden` | 認可エラー（他ユーザーのリソースへのアクセス、権限不足） |
| `404 Not Found` | 指定リソースが存在しない |
| `409 Conflict` | リソースの重複（同日日報など） |

---

## バリデーションルール（共通）

| フィールド | 必須 | 制約 |
|-----------|------|------|
| `date` | YES | YYYY-MM-DD 形式 |
| `workContent` | YES | 最大 5000 文字 |
| `tomorrowPlan` | YES | 最大 5000 文字 |
| `notes` | NO | 最大 5000 文字 |
| コメント `body` | YES | 1〜1000 文字 |
| ユーザー `name` | YES | 最大 100 文字 |
