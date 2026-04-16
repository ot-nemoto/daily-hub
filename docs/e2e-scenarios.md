# E2E テストシナリオ

各機能の E2E テストシナリオ。Playwright MCP を使って実施する。

---

## 結果の報告形式

各シナリオの結果を以下のステータスで報告する。

| ステータス | 意味 |
|----------|------|
| OK | 期待値通り |
| NG | 期待値と異なる（再現手順と実際の挙動を記載） |
| SKIP | 技術的制約等で実行不可（理由を記載） |

---

## 認証・リダイレクト

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | 未ログイン | `/reports/daily` にアクセスする | 未認証リダイレクト | `/login` にリダイレクトされる |
| 2 | 未ログイン | `/reports/monthly` にアクセスする | 未認証リダイレクト | `/login` にリダイレクトされる |
| 3 | 未ログイン | `/reports/new` にアクセスする | 未認証リダイレクト | `/login` にリダイレクトされる |
| 4 | 未ログイン | `/reports/[任意のID]` にアクセスする | 未認証リダイレクト | `/login` にリダイレクトされる |
| 5 | 未ログイン | `/settings` にアクセスする | 未認証リダイレクト | `/login` にリダイレクトされる |
| 6 | 未ログイン | `/admin/users` にアクセスする | 未認証リダイレクト | `/login` にリダイレクトされる |
| 7 | `tsukune@example.com` | `/login` でメールアドレス・パスワードを入力してサインインする | ログイン成功後の遷移 | `/reports/daily` に遷移する |
| 8 | `sunagimo@example.com` | `/login` でサインインする | 無効化アカウントのリダイレクト | `/auth-error?reason=inactive` にリダイレクトされ「アカウントが無効化されています」と表示される |
| 9 | `sunagimo@example.com` | `/auth-error` で「サインアウト」ボタンをクリックする | サインアウト遷移 | `/login` にリダイレクトされる |
| 10 | `tsukune@example.com` | ログイン後にヘッダーの「ログアウト」ボタンをクリックする | ログアウト | `/login` にリダイレクトされる |

---

## ヘッダー

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | ログイン後にヘッダーを確認する | ヘッダー項目の表示 | 「日次ビュー」「月次ビュー」「日報作成」「tsukune」「ログアウト」が表示される |
| 2 | `bonjiri@example.com` | ログイン後にヘッダーを確認する | ADMIN 専用リンク | 「ユーザー管理」リンクが表示される |
| 3 | `tsukune@example.com` | ログイン後にヘッダーを確認する | MEMBER の表示 | 「ユーザー管理」リンクが表示されない |
| 4 | `nankotsu@example.com` | ログイン後にヘッダーを確認する | VIEWER の表示 | 「日報作成」リンクが表示されない |

---

## 日報一覧（デイリービュー）

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | `/reports/daily` にアクセスする | 初期表示日付 | 今日の日付が表示される |
| 2 | `tsukune@example.com` | `/reports/daily` にアクセスする | 自分の日報表示 | tsukune の日報が表示される |
| 3 | `tsukune@example.com` | `/reports/daily` にアクセスする | 他ユーザーの日報表示 | tebasaki の日報も一覧に表示される |
| 4 | `tsukune@example.com` | 日報が存在しない日付を選択する | 空状態表示 | 「YYYY年M月D日 の日報はありません」と表示される |
| 5 | `tsukune@example.com` | ユーザーフィルターで「tsukune」を選択する | ユーザー絞り込み | tsukune の日報のみ表示される |
| 6 | `tsukune@example.com` | 日付入力に不正な値（例: `2026-02-30`）を入力する | バリデーション | 入力フィールドが赤枠表示され、URL が更新されない |
| 7 | `tsukune@example.com` | 有効な日付（例: `2026-01-01`）を入力する | 有効値の即時反映 | URL が更新され、その日付の日報一覧が表示される |
| 8 | `tsukune@example.com` | tsukune の日報カードを確認する | 自分の日報の操作ボタン | 「詳細」「編集」ボタンが表示される |
| 9 | `tsukune@example.com` | tebasaki の日報カードを確認する | 他ユーザーへの編集ボタン非表示 | 「詳細」ボタンのみ表示され「編集」ボタンは表示されない |
| 10 | `tsukune@example.com` | 日報カードの「詳細」ボタンをクリックする | 詳細ページへの遷移 | `/reports/[id]` に遷移する |

---

## 日報一覧（マンスリービュー）

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | `/reports/monthly` にアクセスする | デフォルト表示 | 自分（tsukune）の今月分の日報が表示される |
| 2 | `tsukune@example.com` | 日報が存在しない月を選択する | 空状態表示 | 「YYYY年M月 の日報はありません」と表示される |
| 3 | `tsukune@example.com` | ユーザーフィルターで「tebasaki」を選択する | 他ユーザーへの切り替え | tebasaki の日報が表示される |
| 4 | `tsukune@example.com` | 月入力に不正な値（例: `2026-13`）を入力する | バリデーション | 入力フィールドが赤枠表示され、URL が更新されない |
| 5 | `tsukune@example.com` | 有効な月（例: `2026-01`）を入力する | 有効値の即時反映 | URL が更新され、その月の日報一覧が表示される |

---

## 日報作成

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | `/reports/new` にアクセスする | 日付デフォルト値 | 日付フィールドに今日の日付が入力されている |
| 2 | `tsukune@example.com` | 業務内容・明日の予定・所感を入力して「保存」をクリックする | 作成成功 | 日報詳細ページに遷移し、入力内容が表示される |
| 3 | `tsukune@example.com` | 作成後に `/reports/daily` を確認する | 日次ビューへの反映 | 作成した日報がデイリービューに表示される |
| 4 | `tsukune@example.com` | 業務内容を空にして「保存」をクリックする | 必須バリデーション | エラーが表示され保存されない |
| 5 | `tsukune@example.com` | 明日の予定を空にして「保存」をクリックする | 必須バリデーション | エラーが表示され保存されない |
| 6 | `tsukune@example.com` | 同じ日付で2件目の日報を作成しようとする | 重複チェック | 409 エラーが表示される |
| 7 | `tsukune@example.com` | 「保存」をクリックした直後にボタンを確認する | 送信中の状態 | ボタンが「保存中...」に変わり無効化される |
| 8 | `nankotsu@example.com` | `/reports/new` にアクセスする | VIEWER のアクセス制御 | `/reports/daily` にリダイレクトされる |
| 9 | `tsukune@example.com` | 「キャンセル」ボタンをクリックする | キャンセル遷移 | `/reports/daily` に戻る |

---

## 日報詳細

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | 自分の日報詳細ページを開く | コンテンツ表示 | 業務内容・明日の予定・所感が正しく表示される |
| 2 | `tsukune@example.com` | 自分の日報詳細ページを開く | 編集ボタン表示 | 「編集」ボタンが表示される |
| 3 | `tsukune@example.com` | tebasaki の日報詳細ページを開く | 他ユーザーへの編集ボタン非表示 | 「編集」ボタンが表示されない |
| 4 | `tsukune@example.com` | コメントがない日報の詳細ページを開く | 空コメント表示 | 「コメントはありません」と表示される |
| 5 | `tsukune@example.com` | 存在しない ID（例: `/reports/nonexistent`）にアクセスする | 404 表示 | 404 ページが表示される |

---

## 日報編集

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | 自分の日報の編集ページを開く | 既存データの表示 | 現在の業務内容・明日の予定・所感が入力欄に表示される |
| 2 | `tsukune@example.com` | 内容を変更して「保存」をクリックする | 編集の反映 | 詳細ページに変更後の内容が表示される |
| 3 | `tsukune@example.com` | 「キャンセル」をクリックする | キャンセル遷移 | `/reports/[id]` に戻り、変更は反映されない |
| 4 | `tsukune@example.com` | tebasaki の日報の編集 URL（`/reports/[id]/edit`）に直接アクセスする | 他ユーザーの編集ガード | `/reports/[id]` にリダイレクトされる |
| 5 | `tsukune@example.com` | 「保存」をクリックした直後にボタンを確認する | 送信中の状態 | ボタンが「保存中...」に変わり無効化される |

---

## コメント

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | 日報詳細でコメントを入力して送信する | コメント投稿 | コメント一覧に追加される |
| 2 | `tsukune@example.com` | コメント入力欄を空にして送信する | 必須バリデーション | 投稿できない |
| 3 | `tsukune@example.com` | 1001文字のコメントを入力して送信する | 文字数バリデーション | 投稿できない |
| 4 | `tsukune@example.com` | 自分が投稿したコメントを確認する | 削除ボタン表示 | 削除ボタンが表示される |
| 5 | `tsukune@example.com` | tebasaki が投稿したコメントを確認する | 他ユーザーへの削除ボタン非表示 | 削除ボタンが表示されない |
| 6 | `tsukune@example.com` | 自分のコメントの削除ボタンをクリックする | コメント削除 | コメントが一覧から消える |

---

## 個人設定

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | `/settings` にアクセスする | 現在の情報表示 | 現在の名前（tsukune）とメールアドレスが表示される |
| 2 | `tsukune@example.com` | メールアドレスフィールドを確認する | 読み取り専用 | メールアドレスフィールドが変更不可（読み取り専用）になっている |
| 3 | `tsukune@example.com` | 名前を「tsukune-updated」に変更して「保存」をクリックする | 名前変更の反映 | 保存成功フィードバックが表示され、ヘッダーの名前も更新される |
| 4 | `tsukune@example.com` | 名前を「tsukune」に戻して「保存」をクリックする | 名前の復元 | 保存成功フィードバックが表示され、ヘッダーが「tsukune」に戻る |
| 5 | `tsukune@example.com` | 名前を空にして「保存」をクリックする | 必須バリデーション | エラーが表示され保存されない |
| 6 | `tsukune@example.com` | 101文字の名前を入力して「保存」をクリックする | 文字数バリデーション | エラーが表示され保存されない |

---

## APIキー管理

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | `/settings` でAPIキー欄を確認する（シード後） | 既存キーの表示状態 | APIキーがマスク表示され、「再生成」「失効」ボタンのみ表示される（「表示」ボタンは表示されない） |
| 2 | `tsukune@example.com` | 「再生成」をクリックする | キーの更新 | 新しいキーが生成され、プレーンテキストで表示される |
| 3 | `tsukune@example.com` | 「隠す」をクリックする | マスク表示への切り替え | APIキーがマスク表示に切り替わる |
| 4 | `tsukune@example.com` | 「表示」をクリックする | プレーンテキスト表示への切り替え | APIキーがプレーンテキストで表示される（再生成直後のセッション内のみ） |
| 5 | `tsukune@example.com` | ページをリロードする | リロード後のマスク表示 | マスク表示に戻り「表示」ボタンは表示されない |
| 6 | `tsukune@example.com` | 「失効」をクリックする | キーの削除 | キーが削除され「生成する」ボタンに戻る |
| 7 | `tsukune@example.com` | 「生成する」をクリックする | キーの新規生成 | キーが生成され、プレーンテキストで表示される |
| 8 | `tebasaki@example.com` | `/settings` でAPIキー欄を確認する | ユーザー分離 | tsukune のキーは表示されない（tebasaki はキーなし） |

---

## REST API（外部連携）

以下は curl などの外部クライアントで手動確認する。API キーはシード固定値（`a1b2c3d4-e5f6-7890-abcd-ef1234567890`）を使用する。

| # | 手順 | 確認観点 | 期待値 |
|---|------|---------|-------|
| 1 | tsukune の有効な API キーで `POST /api/reports` を呼ぶ | 正常系 | 201 と `{ id }` が返る |
| 2 | Authorization ヘッダーなしで `POST /api/reports` を呼ぶ | 認証なし | 401 が返る |
| 3 | 無効な API キーで `POST /api/reports` を呼ぶ | 無効キー | 401 が返る |
| 4 | VIEWER ロールのユーザーの API キーで `POST /api/reports` を呼ぶ | 権限不足 | 403 が返る |
| 5 | 同日に既存の日報がある状態で `POST /api/reports` を呼ぶ | 重複チェック | 409 が返る |
| 6 | `date` が `YYYY-MM-DD` 形式でない値で `POST /api/reports` を呼ぶ | バリデーション | 422 が返る |

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Authorization: Bearer a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Content-Type: application/json" \
  -d '{"date":"YYYY-MM-DD","workContent":"作業内容","tomorrowPlan":"明日の予定","notes":""}'
```

---

## 管理画面（ADMIN のみ）

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` | `/admin/users` にアクセスする | MEMBER のアクセス制御 | `/` にリダイレクトされ、最終的に `/reports/daily` に遷移する |
| 2 | `nankotsu@example.com` | `/admin/users` にアクセスする | VIEWER のアクセス制御 | `/` にリダイレクトされ、最終的に `/reports/daily` に遷移する |
| 3 | `bonjiri@example.com` | `/admin/users` にアクセスする | ユーザー一覧表示 | 名前・メール・ロール・登録日・最終日報投稿日・直近30日提出率が表示される |
| 4 | `bonjiri@example.com` | bonjiri 自身の行を確認する | 最終日報投稿日 | 「なし」と表示される（bonjiri は日報なし） |
| 5 | `bonjiri@example.com` | `torikawa@example.com` のロールを VIEWER に変更する | ロール変更 | 変更後のロールが一覧に反映される |
| 6 | `bonjiri@example.com` | `torikawa@example.com` のロールを MEMBER に戻す | ロール変更の復元 | MEMBER に戻ったことが一覧に反映される |
| 7 | `bonjiri@example.com` | 自分自身（bonjiri）のロールを変更しようとする | 自己ロール降格の防止 | 変更できない（ボタンが無効または操作不可） |
| 8 | `bonjiri@example.com` | `torikawa@example.com` を無効化する | アカウント無効化 | isActive が false になる |
| 9 | `torikawa@example.com` | 無効化後にログインする | 無効化アカウントのリダイレクト | `/auth-error?reason=inactive` にリダイレクトされ「アカウントが無効化されています」と表示される |
| 10 | `bonjiri@example.com` | `torikawa@example.com` を再有効化する | アカウント再有効化 | isActive が true になる |
| 11 | `bonjiri@example.com` | 自分自身（bonjiri）を無効化しようとする | 自己無効化の防止 | 操作できない（ボタンが無効または操作不可） |

---

## ユーザー分離

| # | ユーザー | 手順 | 確認観点 | 期待値 |
|---|---------|------|---------|-------|
| 1 | `tsukune@example.com` → `tebasaki@example.com` | tsukune でログインして日次ビューを確認後、ログアウトして tebasaki でログインする | 日報の分離 | tebasaki 視点では自分の日報と他ユーザーの日報が表示されるが、編集できるのは自分の日報のみ |
| 2 | `tebasaki@example.com` | tsukune の日報編集 URL（`/reports/[id]/edit`）に直接アクセスする | 他ユーザーの編集ガード | `/reports/[id]` にリダイレクトされる |
| 3 | `tsukune@example.com` → `tebasaki@example.com` | tsukune でコメントを投稿後、ログアウトして tebasaki でログインしてそのコメントを確認する | コメントの削除ボタン分離 | tebasaki には tsukune のコメントの削除ボタンが表示されない |
| 4 | `tsukune@example.com` → `tebasaki@example.com` | tsukune の `/settings` で APIキーを確認後、ログアウトして tebasaki でログインし `/settings` を確認する | APIキーの分離 | tebasaki には tsukune の APIキーが表示されない |
