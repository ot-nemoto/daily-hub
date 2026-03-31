# auth.md — 認証・認可フロー

## 概要

[Clerk](https://clerk.com/) を使用したメールアドレス＋パスワード認証を実装する。
パスワード管理・メール認証はすべて Clerk が担い、daily-hub 側にパスワードのハッシュは保存しない。
セッションは Clerk の JWT で管理し、`proxy.ts` で未認証ユーザーを `/login` にリダイレクトする。

> **注意**: eval-hub と daily-hub は同一の Clerk アプリ（同一 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`）を共有する。
> 両プロジェクトは別の Vercel プロジェクトとしてデプロイされるが、セッションは共有される。

---

## 認証フロー

### ログイン

```
クライアント
  → Clerk のホスト型サインインUI（/login）
  → Clerk がメールアドレス＋パスワードを検証
  → Clerk が JWT をセット
  → / にリダイレクト
```

### セッション確認（API ルート・サーバーコンポーネント）

```
クライアント → リクエスト
  → getSession() を呼び出し
    → MOCK_USER_ID が設定されている場合（非本番）: id で DB を検索して直接返す（未存在なら console.error + null）
    → MOCK_USER_EMAIL が設定されている場合（非本番）: email で DB を検索して直接返す（未存在なら console.error + null）
    → Clerk の auth() で userId を取得
    → userId で DB の clerkId を検索
    → 未ヒット: メールで突合し clerkId を自動紐付け（初回ログイン）
    → DB 未存在の新規ユーザーは自動作成（DB にユーザーが0人なら role="ADMIN"、1人以上なら role="MEMBER"）
    → isActive === false → /auth-error?reason=inactive にリダイレクト
    → 削除済みユーザーが同一メール・Clerk アカウントで再ログインした場合は新規 MEMBER として自動再作成
  → セッションなし（未認証）→ null を返す（API は 401、画面は /login へ）
  → セッションあり → session.user.id でユーザー識別
```

### セッション確認（ミドルウェア）

```
クライアント → ページリクエスト
  → proxy.ts が全ルートで Clerk セッションを確認
  → セッションなし → /login にリダイレクト（Clerk が処理）
  → セッションあり → そのまま表示
```

### ログアウト

```
クライアント
  → Clerk の SignOutButton を使用
  → Clerk が JWT を削除
  → /login にリダイレクト
```

### パスワードリセット

パスワードのリセットは **Clerk のダッシュボードまたは Clerk のメール機能** で行う。
daily-hub の管理画面からパスワードをリセットする機能は提供しない。

---

## ファイル構成と役割

| ファイル | 役割 |
|----------|------|
| `src/lib/auth.ts` | `getSession()` 関数。Clerk セッションと DB ユーザーを統合 |
| `src/proxy.ts` | 未認証リダイレクト。`clerkMiddleware` を使用（Next.js 16 の middleware ファイル名） |

---

## セッション管理

| 項目 | 内容 |
|------|------|
| 戦略 | Clerk JWT |
| 保存場所 | Clerk が管理する httpOnly Cookie |
| `session.user.id` | DB の `users.id`（UUID） |
| `session.user.role` | DB の `users.role`（`ADMIN` / `MEMBER` / `VIEWER`） |
| `session.user.isActive` | DB の `users.is_active`（`false` の場合 `/auth-error?reason=inactive` にリダイレクト） |

### セッション取得方法

```typescript
// API ルート・サーバーコンポーネント
import { getSession } from "@/lib/auth";
const session = await getSession();
const userId = session?.user?.id;
```

---

## 保護対象ルート

`proxy.ts` は以下のパスを**除いた全ルート**を認証必須とする。

| パス | 認証 | 理由 |
|------|------|------|
| `/login` | 不要 | Clerk のサインインページ |
| `/auth-error` | 不要 | 認証エラー表示ページ |
| その他全パス | **必須** | 未認証なら Clerk が `/login` へリダイレクト |

---

## 環境変数

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk の公開キー |
| `CLERK_SECRET_KEY` | Clerk のシークレットキー |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | サインイン URL（`/login`） |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | サインイン後のデフォルトリダイレクト先 |
| `MOCK_USER_ID` | 非本番環境でのモックユーザー ID（Clerk をバイパス。対象未存在時は `console.error` + `null`） |
| `MOCK_USER_EMAIL` | 非本番環境でのモックユーザーメール（Clerk をバイパス。`MOCK_USER_ID` との同時設定は推奨しない（設定した場合は ID 優先）。対象未存在時は `console.error` + `null`） |

---

## clerkId の自動紐付けフロー

既存 DB ユーザー（NextAuth 時代に作成）への Clerk ID 紐付けは初回ログイン時に自動で行われる。

```
1. clerkId で DB 検索 → ヒット: そのままセッションを返す
2. 未ヒット: Clerk からメールアドレスを取得
3. メールで DB 検索
   a. 未存在 → DB のユーザー数を確認し、0人なら role="ADMIN"、1人以上なら role="MEMBER" で新規作成
   b. clerkId あり（他の Clerk ID に紐付き済み） → /auth-error にリダイレクト
   c. clerkId なし → updateMany で紐付け（レースコンディション対策済み）
```
