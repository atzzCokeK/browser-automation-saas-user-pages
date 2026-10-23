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

必須は姓、名、メールアドレスです。部署、役職、権限レベル、ステータス（初期値は「有効」）、入社日、備考は任意です。登録すると `/users` に戻り、「ユーザーを登録しました」と表示されます。

### `/audit-logs` 監査ログ

- 固定の監査ログ 20 件を、新しい順に表示します。
- 操作種別は「すべて」「ユーザー操作」「認証・SSO」「エクスポート」です。ユーザー操作はユーザー登録・ユーザー削除・権限変更、認証・SSO はログイン・SAML SSO設定変更・SCIMプロビジョニング、エクスポートは CSVエクスポートです。
- キーワードは操作者、対象、詳細の部分一致です。検索ボタンで絞り込み、入力を空にするとキーワードは外れます。
- 「JSONダウンロード」は、画面に出ているログを `audit-logs.json` として保存します。
- ログイン、ユーザー登録、ユーザー削除、ユーザー一覧の CSVダウンロードは、この画面の先頭に監査ログを足します。再読み込みすると消え、固定のログだけに戻ります。操作者は、直前のログインで入力したメールアドレスです。ログイン前は `admin@example.com` です。セッション中の接続元はテスト用の `192.0.2.10` です。

### `/api/audit-logs`

`GET /api/audit-logs` は固定の監査ログを JSON で返します。画面で足した分は含みません。

| クエリ | 内容 |
| --- | --- |
| `action` | 操作名、または「ユーザー操作」「認証・SSO」「エクスポート」。省略すると全件 |
| `limit` | 1 から 100 の整数。省略すると全件。それ以外は 400 |

応答は `logs`、`totalCount`、`limit`、`action` です。`totalCount` は `limit` を掛ける前の件数です。一致しない `action` のときは `logs` が空です。

`POST /api/audit-logs` は `actor`、`action`、`target`、`detail` を確認し、同じ形のログを返します。サーバーには保存しないので、`persisted` は `false`、`id` は `AL-ECHO` です。ほかの利用者の `GET` には出ません。`ipAddress` を省くと `192.0.2.1` です。`timestamp` を省くとリクエストを受けた日本時間になり、付けるときは `YYYY-MM-DDTHH:mm:ss+09:00` です。

## データの持ち方

ユーザーの追加と削除、監査ログのセッション中の追加はブラウザのメモリにだけ残ります。再読み込みするとシードデータに戻るので、同じ自動操作を最初から繰り返せます。

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
