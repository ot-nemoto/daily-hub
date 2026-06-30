# actions.md — Server Actions 定義

全 Action は認証必須。未認証の場合は原則 `/login` にリダイレクトする。
ただし、管理系 Action（`updateUserAdmin` / `deleteUser`）は ADMIN 権限必須で、未認証時・権限不足時ともに `/` にリダイレクトする。

---

## Action 一覧

| Action | ファイル | 概要 | 認可 |
|--------|---------|------|------|
| `createReport` | `src/app/reports/actions.ts` | 日報作成 | VIEWER 以外（MEMBER・ADMIN） |
| `updateReport` | `src/app/reports/[id]/actions.ts` | 日報編集 | 本人かつ VIEWER 以外（MEMBER・ADMIN） |
| `createComment` | `src/app/reports/[id]/actions.ts` | コメント追加 | 要ログイン |
| `deleteComment` | `src/app/reports/[id]/actions.ts` | コメント削除 | 本人のみ |
| `updateMe` | `src/app/settings/actions.ts` | プロフィール更新 | 要ログイン |
| `generateApiKey` | `src/app/settings/actions.ts` | APIキー生成・再生成 | 要ログイン |
| `revokeApiKey` | `src/app/settings/actions.ts` | APIキー失効 | 要ログイン |
| `updateUserAdmin` | `src/app/admin/users/actions.ts` | ユーザー情報更新 | ADMIN のみ |
| `deleteUser` | `src/app/admin/users/actions.ts` | ユーザー削除 | ADMIN のみ |
| `addDayOff` | `src/app/day-off/actions.ts` | 休日登録 | 要ログイン |
| `removeDayOff` | `src/app/day-off/actions.ts` | 休日削除 | 要ログイン（本人のみ） |

---

## 日報

### `createReport`

**ファイル:** `src/app/reports/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `date` | `string` | YES | `YYYY-MM-DD` 形式 |
| `workContent` | `string` | YES | 最大 5000 文字 |
| `tomorrowPlan` | `string` | YES | 最大 5000 文字 |
| `notes` | `string` | YES | 最大 5000 文字、空文字可 |

**戻り値**

```ts
{ id?: string; error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"日報を作成する権限がありません"` | VIEWER ロール |
| `"この日付の日報はすでに作成済みです"` | 同日に日報が存在する（ConflictError） |
| バリデーションエラーメッセージ | フィールド不足・形式不正 |

---

### `updateReport`

**ファイル:** `src/app/reports/[id]/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `string` | YES | 日報 ID |
| `workContent` | `string` | YES | 最大 5000 文字 |
| `tomorrowPlan` | `string` | YES | 最大 5000 文字 |
| `notes` | `string` | YES | 最大 5000 文字、空文字可 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"日報を編集する権限がありません"` | VIEWER ロール |
| `"日報が見つかりません"` | 指定 ID の日報が存在しない（NotFoundError） |
| `"この日報を編集する権限がありません"` | 他ユーザーの日報（ForbiddenError） |
| バリデーションエラーメッセージ | フィールド不足・形式不正 |

---

## コメント

### `createComment`

**ファイル:** `src/app/reports/[id]/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `reportId` | `string` | YES | 日報 ID |
| `body` | `string` | YES | 1〜1000 文字 |

**戻り値**

```ts
{ id?: string; error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"日報が見つかりません"` | 指定 ID の日報が存在しない（NotFoundError） |
| バリデーションエラーメッセージ | 空文字・1000 文字超 |

---

### `deleteComment`

**ファイル:** `src/app/reports/[id]/actions.ts`

**引数**

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `reportId` | `string` | YES |
| `commentId` | `string` | YES |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"コメントが見つかりません"` | 指定 ID のコメントが存在しない（NotFoundError） |
| `"このコメントを削除する権限がありません"` | 他ユーザーのコメント（ForbiddenError） |

---

## プロフィール

### `updateMe`

**ファイル:** `src/app/settings/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `name` | `string` | YES | 最大 100 文字 |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"ユーザーが見つかりません"` | セッションユーザーが DB に存在しない（NotFoundError） |
| バリデーションエラーメッセージ | 空文字・100 文字超 |

---

### `generateApiKey`

**ファイル:** `src/app/settings/actions.ts`

**引数:** なし

**戻り値**

```ts
{ apiKey?: string; error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"ユーザーが見つかりません"` | セッションユーザーが DB に存在しない（NotFoundError） |

---

### `revokeApiKey`

**ファイル:** `src/app/settings/actions.ts`

**引数:** なし

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"ユーザーが見つかりません"` | セッションユーザーが DB に存在しない（NotFoundError） |

---

## 休日管理

休日管理ページ（`/day-off`）のカレンダー UI から、日付クリックで休日の登録・解除を行う。

### `addDayOff`

**ファイル:** `src/app/day-off/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `date` | `string` | YES | `YYYY-MM-DD` 形式 |
| `userId` | `string` | NO | ADMIN のみ有効。省略時は自分 |

**認可**

- `userId` 省略または自分のID → 全ロール許可
- 他ユーザーのID → ADMIN のみ許可（MEMBER/VIEWER は拒否）
- 指定ユーザーが存在しない → エラー

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"この日付はすでに休日として登録されています"` | 同一ユーザー・同一日付の休日が既に存在する |
| `"他のユーザーの休日を変更する権限がありません"` | 非ADMIN が他ユーザーの userId を指定した |
| `"指定されたユーザーが見つかりません"` | ADMIN が存在しない userId を指定した |
| バリデーションエラーメッセージ | 日付形式不正 |

---

### `removeDayOff`

**ファイル:** `src/app/day-off/actions.ts`

**引数**

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `date` | `string` | YES | `YYYY-MM-DD` 形式 |
| `userId` | `string` | NO | ADMIN のみ有効。省略時は自分 |

**認可**

`addDayOff` と同じ。

**戻り値**

```ts
{ error?: string }
```

**補足**

- `deleteMany` で削除するため、未登録日付を指定しても 0 件削除で安全に無視される

**エラー**

| error | 原因 |
|-------|------|
| `"他のユーザーの休日を変更する権限がありません"` | 非ADMIN が他ユーザーの userId を指定した |
| `"指定されたユーザーが見つかりません"` | ADMIN が存在しない userId を指定した |
| バリデーションエラーメッセージ | 日付形式不正 |

---

## 管理者（ADMIN ロール必須）

> ADMIN 以外のロールは `/` にリダイレクトされる。

### `updateUserAdmin`

**ファイル:** `src/app/admin/users/actions.ts`

**引数**（`role` と `isActive` はいずれかが必須）

| フィールド | 型 | 必須 | 制約 |
|-----------|-----|------|------|
| `id` | `string` | YES | ユーザー ID |
| `role` | `Role` | いずれか必須 | `"ADMIN"` / `"MEMBER"` / `"VIEWER"` |
| `isActive` | `boolean` | いずれか必須 | — |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"Cannot demote yourself from ADMIN"` | 自分の ADMIN ロール降格（ForbiddenError） |
| `"Cannot change your own active status"` | 自分自身の isActive 変更（ForbiddenError） |
| `"ユーザーが見つかりません"` | 指定 ID のユーザーが存在しない（NotFoundError） |

---

### `deleteUser`

**ファイル:** `src/app/admin/users/actions.ts`

**引数**

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `id` | `string` | YES |

**戻り値**

```ts
{ error?: string }
```

**エラー**

| error | 原因 |
|-------|------|
| `"Cannot delete yourself"` | 自分自身を削除しようとした（ForbiddenError） |
| `"ユーザーが見つかりません"` | 指定 ID のユーザーが存在しない（NotFoundError） |

---

## 共通仕様

### 認証・認可

| 条件 | 挙動 |
|------|------|
| 未認証（管理系 Action 以外） | `/login` にリダイレクト |
| 未認証（管理系 Action） | `/` にリダイレクト |
| VIEWER ロールが作成・編集を試みる | `error` フィールドにメッセージを返す |
| ADMIN 以外が管理 Action を呼ぶ | `/` にリダイレクト |

### エラー戻り値の形式

全 Action は成功時 `error` が `undefined` で、必要に応じて他のフィールド（例: `{ id: string }`）を含む。失敗時は `{ error: "メッセージ文字列" }` を返す。
リダイレクトが必要な場合は `redirect()` を呼ぶため戻り値は返らない。
