# api.md — APIエンドポイント定義

> 全エンドポイントは認証必須。未認証の場合は `401 Unauthorized` を返す。

## 認証

### POST /api/auth/signup
新規ユーザー登録（認証不要）

**Request Body**
```json
{ "name": "田中 太郎", "email": "tanaka@example.com", "password": "password123" }
```

**Response 201**
```json
{ "id": "cuid" }
```

**Errors**
- `400` — バリデーションエラー（フィールド不足・形式不正・パスワード8文字未満）
- `409` — メールアドレスがすでに使用されている

---

### POST /api/auth/callback/credentials
NextAuth.js が管理。直接呼び出しはしない。

---

## ユーザー

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

## バリデーションルール（共通）

| フィールド | 必須 | 最大文字数 |
|-----------|------|-----------|
| `date` | YES | — (YYYY-MM-DD形式) |
| `workContent` | YES | 5000文字 |
| `tomorrowPlan` | YES | 5000文字 |
| `notes` | NO | 5000文字 |
| コメント `body` | YES | 1000文字 |
