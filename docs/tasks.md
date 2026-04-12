# tasks.md — 実装タスク一覧

> ステータス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
>
> **完了条件**: APIルートのタスクはユニットテスト（`route.test.ts`）の作成・通過をもって完了とする。

---

## フェーズ 0 — プロジェクトセットアップ

| # | タスク | 依存 |
|---|--------|------|
| T01 | `[x]` Next.js プロジェクト初期化（TypeScript + Tailwind CSS + App Router + Turbopack + Biome + Vitest + Playwright） | — |
| T02 | `[x]` Prisma セットアップ・Neon (PostgreSQL) 接続確認 | T01 |
| T03 | `[x]` `prisma/schema.prisma` に User / Report / Comment モデルを定義 | T02 |
| T04 | `[x]` 初回マイグレーション実行（`prisma migrate dev`） | T03 |
| T05 | `[x]` NextAuth.js インストール・Credentials Provider 設定 | T01 |
| T06 | `[x]` 開発用シードデータ作成（`prisma/seed.ts`） | T04 |

---

## フェーズ 1 — 認証

| # | タスク | 依存 |
|---|--------|------|
| T10 | `[x]` サインアップ API（POST `/api/auth/signup`、bcrypt ハッシュ化、テスト込み） | T04 |
| T11 | `[x]` NextAuth Credentials Provider でログイン処理（テスト込み） | T05, T10 |
| T12 | `[x]` `src/proxy.ts` で未認証時のリダイレクト設定 | T11 |
| T13 | `[x]` ログインページ UI（`/login`） | T11 |
| T14 | `[x]` サインアップページ UI（`/signup`） | T10 |
| T15 | `[x]` ログアウト処理 | T11 |

---

## フェーズ 2 — 日報 CRUD

| # | タスク | 依存 |
|---|--------|------|
| T20 | `[x]` 日報作成 API（POST `/api/reports`、同日重複チェック、テスト込み） | T04 |
| T21 | `[x]` 日報詳細取得 API（GET `/api/reports/[id]`、テスト込み） | T04 |
| T22 | `[x]` 日報編集 API（PUT `/api/reports/[id]`、authorId 検証、テスト込み） | T04 |
| T23 | `[x]` 日報作成ページ UI（`/reports/new`） | T20 |
| T24 | `[x]` 日報編集ページ UI（`/reports/[id]/edit`） | T22 |
| T25 | `[x]` 日報詳細ページ UI（`/reports/[id]`） | T21 |

---

## フェーズ 3 — コメント

| # | タスク | 依存 |
|---|--------|------|
| T30 | `[x]` コメント追加 API（POST `/api/reports/[id]/comments`、テスト込み） | T04 |
| T31 | `[x]` コメント削除 API（DELETE `/api/reports/[id]/comments/[commentId]`、authorId 検証、テスト込み） | T04 |
| T32 | `[x]` 日報詳細ページにコメント一覧・追加フォームを組み込む | T25, T30 |
| T33 | `[x]` コメント削除ボタン（自分のコメントのみ表示） | T31, T32 |

---

## フェーズ 4 — 閲覧ビュー

| # | タスク | 依存 |
|---|--------|------|
| T40 | `[x]` 日報一覧 API（GET `/api/reports?date=...`、日次ビュー用、テスト込み） | T04 |
| T41 | `[x]` 日報一覧 API（GET `/api/reports?from=...&to=...`、月次ビュー用、テスト込み） | T04 |
| T42 | `[x]` ユーザー一覧 API（GET `/api/users`、テスト込み） | T04 |
| T43 | `[x]` 日次ビューページ UI（`/reports/daily`、日付選択・ユーザー絞り込み） | T40, T42 |
| T44 | `[x]` 月次ビューページ UI（`/reports/monthly`、期間選択・ユーザー切り替え） | T41, T42 |
| T45 | `[x]` 日次・月次フィルターの日付入力バリデーション（有効な値のみ即時反映・不正値は赤枠表示） | T43, T44 |

---

## フェーズ 5 以降

フェーズ 5 以降のタスクはすべて GitHub Issues で管理する。tasks.md には記載しない。

- [Issues — Phase 5: 仕上げ・品質](https://github.com/ot-nemoto/daily-hub/milestone/1)
- [Issues — Phase 6: Vercel デプロイ](https://github.com/ot-nemoto/daily-hub/milestone/2)
- [Issues — Phase 7a: ユーザー管理（最小構成）](https://github.com/ot-nemoto/daily-hub/milestone/3)
- [Issues — Phase 7b: ユーザー招待・追加](https://github.com/ot-nemoto/daily-hub/milestone/4)（廃止 — Clerk の機能で代替。#102 参照）
- [Issues — Phase 7c: 詳細管理](https://github.com/ot-nemoto/daily-hub/milestone/5)
- [Issues — Phase 8: CI/CD](https://github.com/ot-nemoto/daily-hub/milestone/6)
- [Issues — Phase 9: 個人管理](https://github.com/ot-nemoto/daily-hub/milestone/7)
- [Issues — Phase 10: 認証基盤移行（Clerk）](https://github.com/ot-nemoto/daily-hub/milestone/8)
- [Issues — Phase 11: 外部API連携](https://github.com/ot-nemoto/daily-hub/milestone/9)
