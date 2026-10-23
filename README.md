# ブラウザ自動操作向けダミー SaaS 管理画面

**English:** Dummy BtoB SaaS admin consoles for browser automation, AI agents, and end-to-end tests. The UI is a Vite + React 19 single-page app (React Router, no SSR). `/api/*` is a Hono app on Cloudflare Workers, on the same origin. Additions, edits, and deletions stay in browser memory and reset on reload, so the same scenario can be run again from the seeded list. Demo: https://browser-automation-saas-user-pages.atsushi1230-sdi.workers.dev

## このリポジトリについて

ブラウザ自動操作、AI エージェント、E2E テストの対象にするための、ダミー BtoB SaaS 管理画面（Admin Console）の集まりです。本番の顧客データも、本物の認証もありません。

デモ: https://browser-automation-saas-user-pages.atsushi1230-sdi.workers.dev

https://dummy-saas-user-pages.vercel.app は、この Workers URL へ恒久的に転送します。

`/` を開くと `/login` へ移動します。

## 使える画面

### `/login` ログイン

メールアドレスとパスワードは初期入力済みです。

| 項目 | 初期値 |
| --- | --- |
| メールアドレス | `admin@example.com` |
| パスワード | `xK9#mQ2$vL5@nR8w` |

「ログイン」を押すと `/dashboard` に移動します。入力値の照合は行いません。このパスワードは公開しているテスト用の値です。本番の認証情報は入れないでください。

### `/dashboard` ダッシュボード

- KPI カード（総ユーザー数、有効ユーザー、無効ユーザー、2025年の新規登録）
- 最近のアクティビティ

### `/users` ユーザー一覧

- ページネーション。1ページ 20 件で、ページ番号は `?page=` です。
- `?mode=cumulative` で、IntersectionObserver による無限スクロール（画面上の「累積スクロール」）に切り替わります。`mode` が無い、または `cumulative` 以外のときはページネーションです。
- メールアドレス検索。検索ボタンで部分一致します。入力を空にすると絞り込みは外れます。
- 削除は確認モーダルのあとで実行されます。
- 登録と削除の結果はトーストで表示され、4秒で消えます。
- 「CSVダウンロード」は、検索後に一覧へ出ているユーザーを BOM 付き UTF-8 の CSV（`users_YYYYMMDD.csv`）として保存します。現在のページだけでなく、絞り込み後の全件が入ります。
- 氏名のリンクと、操作列の「詳細」は `/users/:id` へ移動します。ページネーションと累積スクロールのどちらも同じです。

### `/users/new` ユーザー新規登録

フォームには WebMCP のカスタム属性が付いています。

- `form` の `toolname` は `register_user`
- `form` の `tooldescription` は、この登録フォームで何をするかの説明
- 各入力の `toolparamdescription` は、その項目の説明

必須は姓、名、メールアドレスです。部署、役職、権限レベル、ステータス（初期値は「有効」）、入社日、備考は任意です。登録すると `/users` に戻り、「ユーザーを登録しました」と表示されます。登録した役職、権限、入社日、備考は `/users/:id` に残ります。

### `/users/:id` ユーザー詳細・編集・削除

ユーザー一覧の氏名、または「詳細」から開きます。ヘッダーとサイドバーはダッシュボード画面と同じで、サイドバーの「ユーザー管理」は選択されたままです。

| 項目 | 内容 |
| --- | --- |
| ID | 表示のみ |
| 登録日 | 表示のみ |
| 姓 / 名 | 編集できる。必須 |
| メールアドレス | 編集できる。必須 |
| 部署 | 編集できる。任意 |
| 役職 | 編集できる。任意 |
| 権限 | 編集できる。一般 / 管理者 / 閲覧のみ。任意 |
| ステータス | 編集できる。有効 / 無効 |
| 入社日 | 編集できる。任意 |
| 備考 | 編集できる。任意 |

フォームには WebMCP のカスタム属性が付いています。

- `form` の `toolname` は `update_user`
- `form` の `tooldescription` は、この編集フォームで何をするかの説明
- 各入力の `toolparamdescription` は、その項目の説明

「保存する」でブラウザメモリ上のユーザーを更新し、`/users` に戻って「{氏名} の情報を更新しました」と表示します。「キャンセル」と「一覧へ戻る」は保存せずに `/users` に戻ります。

「このユーザーを削除」を押すと確認ダイアログが開きます。本文は「{氏名} を削除してもよろしいですか？」です。「はい」で削除し、`/users` に戻って「{氏名} を削除しました」と表示します。

存在しない ID、または削除済みの ID では「ユーザーが見つかりません」と表示し、「一覧へ戻る」で `/users` に戻ります。ID 1–100 のシードユーザーも、新規登録した ID 101 以降も更新できます。再読み込みすると seed=42 の初期値に戻ります。

## データの持ち方

ユーザーの追加、更新、削除はブラウザのメモリにだけ残ります。再読み込みするとシードデータの一覧に戻るので、同じ自動操作を最初から繰り返せます。シードユーザーの役職、権限、入社日、備考は ID ごとの固定値です。氏名、メールアドレス、部署、ステータス、登録日は seed=42 のままです。

## 始め方

Node.js 22 を使います。

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。`npm run dev` は画面と `/api/*` を同じオリジンで配信します。

本番ビルドの確認:

```bash
npm run build
npm run preview
```

`npm run preview` も http://localhost:3000 です。

Cloudflare Workers へ出すとき:

```bash
npm run deploy
```

`npm run deploy` は `vite build` のあと `wrangler deploy` を実行します。静的アセットは SPA として配信され、存在しない画面パスは `index.html` に戻ります。`/api/*` だけ Worker が先に受けます。

画面の追加、更新、削除はブラウザのメモリだけです。Worker の `GET /api/users` はシードデータ（100件、`seed=42`）をページングするだけで、登録、更新、削除は反映しません。各ユーザーには `id`、`name`、`email`、`department`、`status`、`createdAt` に加え、`position`、`permission`（`general` / `admin` / `readonly`）、`joinDate`、`notes` が含まれます。`GET /api/health` は `{ "ok": true }` を返します。

## ロードマップ

- 外部 IdP 連携のための SAML 2.0 Service Provider (SP)
- SaaS 管理画面の UI パターンを増やす
- パフォーマンスとエッジ配信の最適化

## セキュリティ

本番の個人情報、従業員データ、認証情報、証明書は入力しないでください。方針と報告方法は [SECURITY.md](SECURITY.md) です。

## コントリビューション

画面の追加、不具合修正、自動化シナリオは [CONTRIBUTING.md](CONTRIBUTING.md) を見てください。

## ライセンス

[MIT License](LICENSE) Copyright (c) 2026 Atsushi Kawamura
