# architecture.md — 実装方針・技術スタック

## 技術スタック

| レイヤー | 技術 | 理由 |
|----------|------|------|
| フレームワーク | Next.js 16 (App Router) | フロント・APIを一体管理、TypeScript標準対応 |
| 言語 | TypeScript (strict) | 型安全、補完が効く |
| スタイリング | Tailwind CSS v4 | 素早いUI構築、クラスベースで管理しやすい |
| Lint / Format | Biome | ESLint + Prettier を1ツールで代替、高速 |
| ORM | Prisma | 型安全なDBアクセス、マイグレーション管理 |
| DB（開発） | PostgreSQL (Neon) | 開発・本番で同一DBエンジンを使い環境差異をなくす |
| DB（本番） | PostgreSQL (Neon) | サーバーレスPostgreSQL、無料枠で運用可能 |
| 認証 | Clerk (@clerk/nextjs v7, @clerk/backend v3) | eval-hubと同一Clerkアプリを共有・セッション共有。clerkId経由でDBユーザーと紐付け |
| ホスティング | Vercel (Hobby) | Next.jsの開発元、無料枠・無期限、デプロイが最も簡単 |
| ユニットテスト | Vitest + Testing Library | 高速、Vite互換、React コンポーネントテスト対応 |
| 開発サーバー | Turbopack | Next.js 16 デフォルト、HMR が高速 |
| パッケージ管理 | npm | devcontainerのデフォルト環境に合わせる |

## 非機能要件

### パフォーマンス

| # | 要件 |
|---|------|
| NFR-1 | 日次ビューの表示は 1 秒以内（チームメンバー 20 名以下想定） |
| NFR-2 | 月次ビューは最大 31 件の日報を一覧表示できる |

### セキュリティ

| # | 要件 |
|---|------|
| SEC-1 | 他ユーザーの日報を編集・削除できない（サーバー側で検証） |
| SEC-2 | 他ユーザーのコメントを削除できない（サーバー側で検証） |
| SEC-3 | パスワード管理は Clerk に委任する（DB にパスワードを保存しない） |
| SEC-4 | セッションは Clerk が管理する（Clerk JWT + DB ユーザー突合で認証） |

> 実装方針は下記「セキュリティ方針」を参照。

### 可用性・運用

| # | 要件 |
|---|------|
| OPS-1 | ローカル環境（devcontainer）で動作する |
| OPS-2 | 将来的にセルフホスト（VPS/コンテナ）でのデプロイが可能な構成にする |
| OPS-3 | データはDBに永続化し、アプリ再起動後も保持される |

### アクセシビリティ（未対応）

現時点では対応必須としない。

| # | 要件 |
|---|------|
| A11Y-1 | ダイアログ・モーダルに `role="dialog"` / `aria-modal` / `aria-labelledby` を付与する |
| A11Y-2 | キーボード操作（Escキーで閉じる、フォーカス移動）に対応する |
| A11Y-3 | スクリーンリーダーで主要操作（日報作成・編集・管理画面操作）が完結できるようにする |

## 認証フロー

詳細は [`docs/auth.md`](auth.md) を参照。

## アクセス制御（Phase 7a）

```
/admin/* へのアクセス
  → middleware で role === "ADMIN" を確認
  → admin 以外は / にリダイレクト

/api/admin/* へのアクセス
  → auth() でセッション取得
  → role !== "ADMIN" なら 403 を返す
```

## インフラ構成

```
ブラウザ
  → Vercel Edge Network
    → Next.js (Vercel Functions)
      → Prisma Client
        → Neon PostgreSQL (サーバーレス)
```

## データフロー

```
# ブラウザ操作（通常フロー）
Client (React)
  → Server Action
  → Prisma Client
  → Neon PostgreSQL

# 外部API連携（REST API）
External Client
  → REST API Route (/api/*) ※Authorization: Bearer <api-key>
  → lib（Zod 検証済みの入力・所有者/ロール検証）
  → Prisma Client
  → Neon PostgreSQL
```

対象リソースは日報・コメント・休日・祝日・プロフィール（`/api/me`）・admin（ユーザー管理／日報バッチ）。祝日（`/api/holidays`）は取得が全ロール可・登録／削除が ADMIN のみ。
ルートは「薄いアダプタ」に徹し、業務ロジック・所有者検証は `src/lib/` に置いて Server Actions と共有する。

## 外部 REST API の契約

- **Zod スキーマ（`src/lib/schemas/`）を単一の正とする**。ルートの入力検証と OpenAPI の両方をここから導出し、手書きの spec は持たない
- `buildOpenApiDocument()`（`src/lib/openapi/document.ts`）が **OpenAPI 3.1** を生成し、`/openapi.json` が実行時に配信する（`info.version` は `package.json`、`servers` はアクセス元 origin）
- **API リファレンス（`/api-reference`・Stoplight Elements）と `/openapi.json` が仕様の唯一の正**。エンドポイントごとのフィールド契約は Markdown に二重記載しない
- 両ルートは**ログイン必須**（Clerk 保護）。外部公開はしない

## 状態管理方針

- グローバルな状態管理ライブラリは使わない（MVP）
- サーバーコンポーネント中心で、データフェッチはサーバー側で行う
- フォームの送信は Server Actions または fetch + API Routes
- クライアント状態（フィルター選択など）は `useState` で管理

### フィルター入力バリデーション方針

日次・月次ビューのフィルターコンポーネント（`DailyFilter`, `MonthlyFilter`）は以下の方針で実装する。

| 入力種別 | 動作 |
|----------|------|
| ユーザー選択（`<select>`） | `onChange` で即時 `router.push()`（選択肢は常に有効値のため検証不要） |
| 日付入力（`<input type="date">`, `<input type="month">`） | `useState` でローカル管理し `onChange` で入力値を更新。有効な場合のみ `router.push()`、無効な場合は `border-red-500` を適用してエラーを示す（URL は変更しない） |

- 入力フィールドは `defaultValue`（非制御）ではなく `value` + `useState`（制御コンポーネント）で管理する
- 日付バリデーションは `isValidDate(value)` / `isValidMonth(value)` のようなユーティリティ関数で行い、正規表現＋`Date` コンストラクタの組み合わせで検証する

## セキュリティ方針

- 画面（Server Actions / Server Components）は `getSession()` でセッション確認してから処理
  - **外部連携用 REST API（`/api/*`）は例外**: `Authorization: Bearer <api-key>` の**APIキー認証**を採用する。`getSession()` ではなく `getAuthenticatedUser(req)`（キーを SHA-256 にして `prisma.user.findUnique({ where: { apiKeyHash } })`＋`isActive` 確認）でユーザーを照合し、**操作対象は常に認証情報由来の `user.id`**（リクエストの識別子は信頼しない）
- **CORS**: `/api/*` は任意オリジンから利用可能（`Access-Control-Allow-Origin: *`）。**`Access-Control-Allow-Credentials` を設定せず Cookie 認証も使わない**ため、他サイトからの資格情報つき窃取は成立しない。プリフライト（`OPTIONS`）は認証不要で 204 を返す
  - `/api-reference`・`/openapi.json` は **CORS 対象外**（同一オリジン＋Cookie 利用・ログイン必須）
- 日報の編集・コメントの削除は `authorId === session.user.id` をサーバー側で検証
- 管理者 API は `session.user.role === "ADMIN"` をサーバー側で検証（Phase 7a）
- **外部 API のエラー分類の契約**: lib は業務エラーを型付きで throw（`NotFoundError` / `ForbiddenError` / `ConflictError`）し、ルートが `statusForError()` で 404 / 403 / 409 に変換する。それ以外の例外（DB 障害等）は `withApiErrorHandling()` が受け止め、`500 { "error": "Internal Server Error" }` を返してログにのみ詳細を残す。ただし `redirect()` / `notFound()` の制御フロー例外は `unstable_rethrow()` で素通しする（500 に化けさせないため）。**API ルートではこれらを使わない**: `notFound()` は本文の無い 404 を返し、spec が定める `{ error }` 形式に反する。未存在は `jsonError(..., 404)` で返す。**`src/app/api/` 配下の全ハンドラはこのラッパーで包む**（`src/app/api/route-wrapping.test.ts` が包み漏れを検査する）。`/openapi.json` と `/api-reference` は外部 API の契約（`{ error }`）の対象外で、JSON エラーを返すのが適切ではないため包まない
- **外部 API の操作ログ（監査ログ）の契約**: 1 行 1 JSON を標準出力に書く（`src/lib/auditLog.ts`）。本リポジトリは public でエンドポイント・パラメータ構造が既知であり、「誰のキーで・いつ・何を操作したか」を追えないと異常アクセスを検知できないため
  - **記録する箇所は 2 つ、404 を返す経路は 2 つある**（T234）

| 経路 | 担当 | 理由 |
|------|------|------|
| ハンドラに到達したリクエスト | `withApiErrorHandling()` | 実際のステータスを記録できる |
| 未知の接頭辞（`/api/foo`） | `src/proxy.ts` | `isApiRoute` に一致しないため 404 分岐が**その場で応答を返して記録する**（`auth.protect()` には到達しない）。ルーティングまで来ないためキャッチオールでは捕まえられない。**この分岐を「冗長」として消すと穴が再発する** |
| 登録済み接頭辞の配下（`/api/reports/<id>/<存在しないサブパス>`） | `src/app/api/[...unmatched]/route.ts` | `isApiRoute` は接頭辞一致なので通過する。`proxy.ts` は実在するルートかを知れないため判定できない。**エンドポイント列挙としては最も現実的な形がここに該当する**（既知のリソース配下を探る） |

  - キャッチオールはラッパーで包むため記録が自動的に効く。`OPTIONS` は export しない（`proxy.ts` が `isApiRoute` 一致時の `OPTIONS` を 204 で返すため到達しない）
  - `src/proxy.test.ts` の「`isApiRoute` が実在する全 API ルートに一致する」検査は**キャッチオールを除外する**（「どれにも一致しなかったものを受ける」側であり一致させる対象ではない）。除外は catch-all セグメントに限定する（この検査は登録漏れを検出する安全網なので、除外を広げると穴になる）
  - `src/proxy.ts` の記録では `userId` は `null` になり IP で追うことになる（`src/proxy.ts` は Next 16 では Node.js ランタイムで動くため DB は引けるが、未認証の総当たりに DB クエリを与えたくないので引かない）
  - **記録されない経路**（意図的・既知の制約）
    - CORS プリフライト（`OPTIONS` → 204）: 操作ではなく、常に 204 を返すだけで何も明かさない。件数だけ増えるため記録しない
      - **登録済み接頭辞の配下への `OPTIONS` も記録されない**（`src/proxy.ts` が `isApiRoute` 一致時に 204 を返すため、キャッチオールに到達しない）。`isApiRoute` は実在するルートかを知れないため、ここを区別できない
      - ただし**この経路は列挙に使えない**。`isApiRoute` 一致なら実在・非実在を問わず常に 204 なので、応答から「どのサブパスが存在するか」が分からない。`OPTIONS` を記録対象外にしている理由（プリフライトは何も明かさない）がそのまま当てはまる
      - 未知の接頭辞（`/api/foo`）への `OPTIONS` は `proxy.ts` の 404 分岐が記録する（メソッドを問わない）
    - 登録済みルートに未実装メソッドで来た場合の 405: Next がルーティング段で返すため、ラッパーにも `proxy.ts` にも乗らない（`proxy.ts` は応答ステータスを知れない）
    - 画面（Server Actions / Server Components）の操作: 本契約の対象は外部 REST API のみ
  - **未認証リクエストの記録は IP ごとに抑制する**（T234）。404 を返す経路は認証より前・認証なしで通るため、キーを持たない誰でも記録を増やせる。レート制限が無いと**本物の痕跡を大量のノイズで埋められる**（検知のための機能が検知を妨げる手段になる）
    - `IP:ステータス` あたり 1 分 30 件まで記録し、上限に達した 1 件に `throttled: true` の印を付けて以降その窓では黙る。**抑制件数の繰り越しはしない**（窓をまたぐ状態が必要になり「捨てると信号が消える／残すとメモリが漏れる」ジレンマになる）。正確な件数はプラットフォーム側のリクエストログで分かる
    - 認証済みの記録は抑制しない（キーの発行数で上界がある）
    - IP が取れない場合は抑制しない（鍵が無く、まとめて数えると正当な記録まで落ちる）
    - 追跡 IP 数の上限に達したら**抑制をやめて記録する**（fail-open）。痕跡を失うより、洪水が洪水として見える方がよい
    - 予算は **`IP:ステータス`** ごとに独立させる。IP だけを鍵にすると、攻撃者が安い 404（未登録パスを叩くだけ）で予算を使い切ってから総当たりを始めることで、**401 の記録を 1 件も残さずにキーを探れる**。ノイズで埋めるどころか別の信号を完全に消せてしまう
    - **既知の制約**: 上限は「1 プロセス 1 インスタンス」ではなく、**実行コンテキストごと**に効く。Next はミドルウェア（`src/proxy.ts`）とルートハンドラを別バンドルにするため `src/lib/auditLog.ts` が二重に実体化し、同一プロセス内でも**それぞれが独立した上限を持つ**（実測で `throttled: true` が 2 回出る）。さらに Serverless ではインスタンス間でも共有できない。**完全な上限ではなく増幅を実用的な範囲に抑えるもの**で、厳密な制限が必要なら共有ストアが必要（保存先の決定と同時に検討する）
  - **記録する**: `type` / `at` / `userId` / `method` / `path` / `query` / `status` / `ip` / `bytes`（未認証の抑制が始まった記録のみ `throttled: true` が付く）。GET の成功も記録する（漏洩キーによる日報の列挙・持ち出しは GET で行われるため、書き込みだけでは痕跡が残らない）。401 / 403 も記録する（総当たりの検知。`userId` は `null` になるため IP に依存する）
  - **記録しない**: APIキー（ハッシュ・prefix も含めない。`userId` で足りる。記録するとログの保存先がキーの保管場所になる）、リクエスト/レスポンスボディ（日報本文・コメント本文）
  - `bytes` は `content-length`。本文の内容は持たないが、バッチ更新（`POST /api/admin/reports` は `userName` で対象を指定する）が空振りだったのか大量更新だったのかを区別できる。**ただし対象の一覧や件数そのものは記録されない**（ラッパーはルートの処理内容を知らない）。対象単位の記録が必要になった場合は、ルートから情報を渡す仕組みが別途必要になる
  - `userId` は **`isActive` の判定より前に記録する**。無効化済みユーザーの未失効キーが使われた場合、サーバーは「誰のキーか」を知っている。401 を返すとしてもそれを記録しないと、退職者の漏洩キーと当てずっぽうの総当たりがログ上で区別できない
  - `query` はクエリ文字列をそのまま残す（`?from=...&to=...` の形が列挙の検知に効く）。**APIキーをクエリで受け取ってはならない**（この契約が崩れる）
  - ユーザーの受け渡しは `WeakMap<Request, string>`。ラッパーは認証ユーザーを知らず、解決は各ハンドラ内の `getAuthenticatedUser(req)` が行うため、`Request` インスタンスをキーに渡す。これにより記録処理を各ルートに散らさない
  - **出力の失敗でリクエストを落とさない**（fail-open）。`apiKeyLastUsedAt` の更新と同じ方針。監査ログを fail-closed にする考え方もあるが、「ログが出せないと日報が保存できない」方が害が大きいと判断した
  - 制御フロー例外（`redirect()` / `notFound()`）の再 throw 時は記録しない（ステータスが確定しないため）
  - **保持期間と保存先は未決**。Vercel の Runtime Logs は Hobby で 1 時間しか保持されないため、現時点では「後から調べられる」状態ではない。1 行 1 JSON にしているのは、保存先を Log Drain / DB のどちらに決めてもルート側を触らずに移行できるようにするため
- 入力値は Zod でバリデーション
- SQLインジェクション対策は Prisma のパラメータ化クエリに委任
- 招待トークンは `crypto.randomUUID()` で生成し、使用後に `usedAt` をセットして無効化（Phase 7b）

## 環境変数

```env
# .env（ローカル開発・本番共通）
DATABASE_URL="postgresql://..."   # Neon の接続プール URL（?pgbouncer=true&connection_limit=1 付き）
DIRECT_URL="postgresql://..."     # Neon の直接接続 URL（prisma migrate 用）

# Clerk（Phase 10〜）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx               # シード実行時の Clerk ユーザー同期にも使用
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/reports/new

# ローカル開発用モック（Clerk をバイパスして DB ユーザーを直接使用）
# MOCK_USER_ID と MOCK_USER_EMAIL は同時に設定しない（MOCK_USER_ID が優先）
# 対象ユーザーが DB に存在しない場合は console.error を出力し getSession() は null を返す
MOCK_USER_ID=<DB の users.id>
# MOCK_USER_EMAIL=<DB の users.email>

# シード（prisma/seed.ts・ローカル専用。手順は docs/development.md 参照）
# SEED_PASSWORD=<任意の強いパスワード>       # テストユーザー共通パスワード（シード実行時は必須・既存 Clerk ユーザーにも同期）
# SEED_API_KEY_ADMIN / _MEMBER / _VIEWER   # 任意。未設定なら実行ごとに生成し e2e/.seed-keys.json へ出力
# バイパスフラグ（SEED_ALLOW_DESTRUCTIVE / SEED_ALLOW_UNSEEDED_DB）は .env に置かず実行時に前置する
```

> シードの APIキー・パスワードはコードに固定値を持たない（本リポジトリは public であり、コミットした値は恒久的に compromised 扱いになる）。`.env.example` 側も有効値では配らない（コピーしただけでガードが無効化されるため）。
> `SEED_PASSWORD` は Clerk アプリを共有する eval-hub / link-hub のテストユーザーにも反映されるため、値の変更は 3 リポジトリ揃えて行う。
> シードは `CLERK_SECRET_KEY` が開発インスタンス（`sk_test_`）であることを要求する。パスワード同期は既存ユーザーに無条件で書き込むため、DB 側のガードだけでは「DB は dev・Clerk は本番」の組み合わせを止められない。

## Prisma 7 の接続構成

Prisma 7 では URL の設定箇所が分離された。

| 設定箇所 | URL | 用途 |
|----------|-----|------|
| `prisma.config.ts` → `datasource.url` | `DIRECT_URL` | CLI（migrate / generate） |
| `src/lib/prisma.ts` → `PrismaClient` adapter | `DATABASE_URL` | ランタイム（クエリ） |

- `DATABASE_URL`：Neon の **接続プール URL**（`?pgbouncer=true&connection_limit=1` 付き）。Vercel Functions のサーバーレス環境で接続数を節約するために使用。`@prisma/adapter-pg` 経由で渡す。
- `DIRECT_URL`：Neon の **直接接続 URL**。`prisma migrate` は接続プール非対応のため直接接続が必要。

## デプロイフロー

```
git push origin develop
  → Vercel が自動検知
    → ビルド（vercel-build: prisma migrate deploy && next build）
      → Vercel にデプロイ
        ※ マイグレーションは vercel-build スクリプトで自動実行

git push origin master
  → GitHub Actions (release.yml) が起動
    → package.json のバージョンを取得
    → タグが未存在なら GitHub Releases を即時公開
      → リリースノートをコミット・PR から自動生成
```

## バージョン固有の仕様・既知の指摘パターン

| ライブラリ | 事象 | 正しい仕様 |
|-----------|------|-----------|
| Next.js 16 | `src/proxy.ts` を `middleware.ts` に変更するよう指摘される | Next.js 16 以降、Middleware は Proxy に改称され `proxy.ts` が公式ファイル名となった。変更不要（[公式ドキュメント](https://nextjs.org/docs/app/getting-started/proxy)） |
---
