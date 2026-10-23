# ブラウザ自動操作向けダミー SaaS 管理画面

**English:** Dummy BtoB SaaS admin consoles for browser automation, AI agents, and end-to-end tests. Additions and deletions stay in browser memory and reset on reload, so the same scenario can be run again from the seeded list. Demo: https://dummy-saas-user-pages.vercel.app

## このリポジトリについて

ブラウザ自動操作、AI エージェント、E2E テストの対象にするための、ダミー BtoB SaaS 管理画面（Admin Console）の集まりです。本番の顧客データも、本物の認証もありません。

デモ: https://dummy-saas-user-pages.vercel.app

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

### `/users/new` ユーザー新規登録

フォームには WebMCP のカスタム属性が付いています。

- `form` の `toolname` は `register_user`
- `form` の `tooldescription` は、この登録フォームで何をするかの説明
- 各入力の `toolparamdescription` は、その項目の説明

必須は姓、名、メールアドレスです。部署、役職、権限レベル、ステータス（初期値は「有効」）、入社日、備考は任意です。登録すると `/users` に戻り、「ユーザーを登録しました」と表示されます。登録したユーザーは監査ログの先頭にも残ります。

### `/audit-logs` 監査ログ

操作履歴の一覧です。初期状態では 18 件のシードデータが入っています。サイドバーの「監査ログ」から開きます。

- 操作種別で絞り込めます。選択肢はログイン（`user.login`）、ユーザー作成（`user.create`）、ユーザー削除（`user.delete`）、権限変更（`user.permission_change`）、CSVエクスポート（`user.export_csv`）、ユーザー更新（`user.update`）、アカウント無効化（`user.disable`）です。「すべて」で種別の絞り込みは外れます。
- キーワードは、操作者、操作、対象、概要、IPアドレス、日時に部分一致します。検索ボタンで絞り込み、入力を空にするとキーワードは外れます。「クリア」で種別とキーワードの両方を外します。
- ログイン（`/login`）、ユーザー登録（`/users/new`）、ユーザー削除（`/users` の確認後）、CSVダウンロード（ユーザー一覧の「CSVダウンロード」）を行うと、その操作が先頭に追加されます。ログインしたメールアドレスが、その後の操作の操作者になります。未入力のときは `admin@example.com` です。
- 追加分はブラウザのメモリだけに残り、再読み込みすると 18 件のシードに戻ります。

### `GET /api/audit-logs`

シードデータの監査ログを JSON で返します。ブラウザで追加した履歴は含みません。どの訪問者にも同じ結果です。

| クエリ | 内容 |
| --- | --- |
| `action` | 操作種別の完全一致。例: `user.login`。空や省略は全種別 |
| `limit` | 返す件数。1〜100 に丸めます。省略、または数値でないときは該当する全件 |

レスポンスは `logs`（新しい順の配列）、`totalCount`（`limit` を適用する前の件数）、`limit`（指定がなければ `null`）です。

各要素のフィールドは `id`、`timestamp`（JST の ISO 8601、例: `2026-10-23T09:12:04+09:00`）、`actor`、`action`、`target`、`summary`（日本語）、`ipAddress` です。IP アドレスは文書用の例であり、実在の端末のものではありません。

## データの持ち方

ユーザーの追加と削除、監査ログの追加はブラウザのメモリにだけ残ります。再読み込みするとシードデータに戻るので、同じ自動操作を最初から繰り返せます。`GET /api/audit-logs` は常に監査ログのシードだけを返します。

## 始め方

Node.js 22 を使います。

```bash
npm install
npm run dev
```

http://localhost:3000 を開きます。

本番ビルドの確認:

```bash
npm run build
```

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
