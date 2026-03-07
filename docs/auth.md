# auth.md — 認証・認可フロー

## 概要

NextAuth.js v5 の Credentials Provider を使用し、メールアドレス＋パスワードによる認証を実装する。
セッションは JWT 戦略で管理し、`proxy.ts` で未認証ユーザーを `/login` にリダイレクトする。

---

## 認証フロー

### サインアップ

```
クライアント
  → POST /api/auth/signup { name, email, password }
  → route.ts: Zod バリデーション
  → prisma.user.findUnique でメール重複チェック
  → bcrypt.hash(password, 10) でハッシュ化
  → prisma.user.create で保存
  → 201 { id }
```

### ログイン

```
クライアント
  → POST /api/auth/callback/credentials { email, password }
    （NextAuth が管理するエンドポイント、直接呼び出し不要）
  → authorize():
      authorizeCredentials(email, password) を呼び出し
      → prisma.user.findUnique でユーザー検索
      → bcrypt.compare でパスワード検証
      → 成功: { id, name, email } を返す
      → 失敗: null を返す（NextAuth が 401 を返す）
  → JWT トークン生成・httpOnly Cookie に保存
  → pages.signIn で設定した /login にリダイレクト（成功時は callbackUrl へ）
```

### セッション確認（APIルート）

```
クライアント → API リクエスト
  → APIルートで auth() を呼び出し
  → セッションなし → 401 Unauthorized
  → セッションあり → session.user.id でユーザー識別
```

### セッション確認（ページ・ミドルウェア）

```
クライアント → ページリクエスト
  → proxy.ts が全ルートでセッションを確認
  → セッションなし → /login にリダイレクト
  → セッションあり → そのまま表示
```

### ログアウト

```
クライアント
  → signOut() を呼び出し（next-auth からインポート）
  → JWT Cookie を削除
  → /login にリダイレクト
```

---

## ファイル構成と役割

| ファイル | 役割 |
|----------|------|
| `src/lib/auth.config.ts` | Edge 互換の軽量設定（`pages` + `authorized` callback）。`proxy.ts` が参照 |
| `src/lib/auth.ts` | NextAuth のフル設定（providers, session, callbacks）。`auth.config.ts` をスプレッド |
| `src/lib/authorize.ts` | ログイン検証ロジック（`authorizeCredentials` 関数）。テスト可能な形で分離 |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth のハンドラーを export（GET / POST） |
| `src/app/api/auth/signup/route.ts` | サインアップ API（NextAuth 管轄外） |
| `src/proxy.ts` | 未認証リダイレクト。Edge Runtime で動作（Next.js 16 で `middleware.ts` → `proxy.ts`） |
| `src/types/next-auth.d.ts` | `session.user.id` の型拡張 |

---

## セッション管理

| 項目 | 内容 |
|------|------|
| 戦略 | JWT（`session: { strategy: "jwt" }`） |
| 保存場所 | httpOnly Cookie（`next-auth.session-token`） |
| セッション有効期限 | NextAuth デフォルト（30日） |
| `session.user.id` | JWT callback で `token.id = user.id` → session callback で `session.user.id = token.id` として伝播 |

### セッション取得方法

```typescript
// APIルート・サーバーコンポーネント
import { auth } from "@/lib/auth";
const session = await auth();
const userId = session?.user?.id;

// クライアントコンポーネント
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

---

## 保護対象ルート

`proxy.ts` は以下のパスを**除いた全ルート**を認証必須とする。

| パス | 認証 | 理由 |
|------|------|------|
| `/login` | 不要 | ログインページ自体 |
| `/signup` | 不要 | サインアップページ自体 |
| `/api/auth/**` | 不要 | NextAuth のコールバック・サインアップ API |
| その他全パス | **必須** | 未認証なら `/login` へリダイレクト |

---

## 環境変数

| 変数名 | 用途 | 設定例 |
|--------|------|--------|
| `AUTH_SECRET` | JWT 署名・暗号化キー | `openssl rand -base64 32` で生成 |
| `NEXTAUTH_URL` | コールバック URL のベース | `http://localhost:3000`（本番は本番URLに変更） |

> **注意**: NextAuth v5 では `NEXTAUTH_SECRET` の代わりに `AUTH_SECRET` を使用する。
> ただし `NEXTAUTH_SECRET` も後方互換のために読まれる。

---

## 型拡張（`src/types/next-auth.d.ts`）

NextAuth のデフォルト `Session` に `user.id` が含まれないため、型拡張で追加している。

```typescript
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```
