# ブラウザ自動操作向けダミー SaaS 管理画面

**English:** Dummy BtoB SaaS admin consoles for browser automation, AI agents, and end-to-end tests. The UI is a Vite + React 19 single-page app (React Router, no SSR). `/api/*` is a Hono app on Cloudflare Workers, on the same origin. Additions, edits, and deletions stay in browser memory and reset on reload, so the same scenario can be run again from the seeded list. Demo: https://sample-saas-admin.atzz.workers.dev

## このリポジトリについて

ブラウザ自動操作、AI エージェント、E2E テストの対象にするための、ダミー BtoB SaaS 管理画面（Admin Console）の集まりです。本番の顧客データも、本物の認証もありません。

デモ: https://sample-saas-admin.atzz.workers.dev

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

必須は姓、名、メールアドレスです。部署、役職、権限レベル、ステータス（初期値は「有効」）、入社日、備考は任意です。登録すると `/users` に戻り、「ユーザーを登録しました」と表示されます。登録した役職、権限、入社日、備考は `/users/:id` に残ります。登録したユーザーは監査ログの先頭にも残ります。

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

「保存する」でブラウザメモリ上のユーザーを更新し、`/users` に戻って「{氏名} の情報を更新しました」と表示します。同時に監査ログへ 1 件追加します。権限を変えたときは `user.permission_change`、有効から無効にしたとき（権限は変えていないとき）は `user.disable`、ステータスを無効から有効にしたときは `user.update`、それ以外の保存も `user.update` です。「キャンセル」と「一覧へ戻る」は保存せず、監査ログにも残りません。

「このユーザーを削除」を押すと確認ダイアログが開きます。本文は「{氏名} を削除してもよろしいですか？」です。「はい」で削除し、`/users` に戻って「{氏名} を削除しました」と表示します。この削除も監査ログに残ります。

存在しない ID、または削除済みの ID では「ユーザーが見つかりません」と表示し、「一覧へ戻る」で `/users` に戻ります。ID 1–100 のシードユーザーも、新規登録した ID 101 以降も更新できます。再読み込みすると seed=42 の初期値に戻ります。

### `/settings/sso` SSO設定 (SAML)

サイドバーの「SSO設定 (SAML)」から開きます。試験用の SAML 2.0 Service Provider です。

- SP の Entity ID、ACS URL、Metadata URL、NameID Format を表示し、各値をコピーできます。
- IdP Entity ID、IdP SSO URL、IdP X.509 証明書、「設定した IdP 証明書への署名検証を強制する」はブラウザのメモリだけに残ります。フォームの `toolname` は `configure_saml_idp` です。再読み込みすると消えます。秘密鍵は受け付けません。
- 「SAMLテスト送信 (IdP-Initiated SSO シミュレート)」は、その場で作った自己署名の SAMLResponse を `POST /api/saml/acs` へ送ります。成功するとこの画面に NameID、Issuer、検証済みの署名、属性を表示します。失敗すると理由を表示します。
- `/login` の「SAML SSOでログイン」は、IdP SSO URL が保存されていればその URL へ SAML リクエストを送ります。未設定のときはテスト応答で ACS を通り、成功すると `/dashboard` に移動します。
- ACS の検証に成功すると、ブラウザの監査ログへ `user.login` を 1 件追加します。Worker には残しません。

`GET /api/saml/metadata` は SP の EntityDescriptor を返します。`POST /api/saml/acs` は `SAMLResponse` と任意の `RelayState` を受けます。XML 署名、Audience、Recipient、有効期限を検証し、DTD と外部実体は拒否します。`RelayState` は `/` から始まる相対パスだけを受け付け、それ以外は `/settings/sso` にエラーを表示します。未指定のときは `/settings/sso` に戻ります。256KB を超える本文は拒否します。`POST /api/saml/test-response` はテスト用の署名済み SAMLResponse と公開証明書を返します。秘密鍵はレスポンスに含まれません。

### `/audit-logs` 監査ログ

操作履歴の一覧です。初期状態では 18 件のシードデータが入っています。サイドバーの「監査ログ」から開きます。

- 操作種別で絞り込めます。選択肢はログイン（`user.login`）、ユーザー作成（`user.create`）、ユーザー削除（`user.delete`）、権限変更（`user.permission_change`）、CSVエクスポート（`user.export_csv`）、ユーザー更新（`user.update`）、アカウント無効化（`user.disable`）です。「すべて」で種別の絞り込みは外れます。
- キーワードは、操作者、操作、対象、概要、IPアドレス、日時に部分一致します。検索ボタンで絞り込み、入力を空にするとキーワードは外れます。「クリア」で種別とキーワードの両方を外します。
- ログイン（`/login` のパスワード、または SAML ACS の検証成功）、ユーザー登録（`/users/new`）、ユーザー削除（`/users` の確認後、または `/users/:id` の確認後）、ユーザー更新（`/users/:id` の保存）、CSVダウンロード（ユーザー一覧の「CSVダウンロード」）、SCIM のプロビジョニングと無効化（`/settings/scim`）を行うと、その操作が先頭に追加されます。ログインしたメールアドレスが、その後の操作の操作者になります。未入力のときは `admin@example.com` です。SAML の場合は NameID が操作者になります。
- 追加分はブラウザのメモリだけに残り、再読み込みすると 18 件のシードに戻ります。

### `GET /api/audit-logs`

シードデータの監査ログを JSON で返します。ブラウザで追加した履歴は含みません。どの訪問者にも同じ結果です。

| クエリ | 内容 |
| --- | --- |
| `action` | 操作種別の完全一致。例: `user.login`。空や省略は全種別 |
| `limit` | 返す件数。1〜100 に丸めます。省略、または数値でないときは該当する全件 |

レスポンスは `logs`（新しい順の配列）、`totalCount`（`limit` を適用する前の件数）、`limit`（指定がなければ `null`）です。

各要素のフィールドは `id`、`timestamp`（JST の ISO 8601、例: `2026-10-23T09:12:04+09:00`）、`actor`、`action`、`target`、`summary`（日本語）、`ipAddress` です。IP アドレスは文書用の例であり、実在の端末のものではありません。

### `/settings/scim` SCIMプロビジョニング

サイドバーの「SCIMプロビジョニング」から開きます。IdP からのユーザー同期を試すためのダミー SCIM 2.0 です。

- SCIM Base URL は `{現在のオリジン}/api/scim/v2` です。「ベース URL をコピー」でコピーできます。
- Bearer トークンは画面を開いたときに発行します。形式は `scim_test_token_` のあとに 16〜64 文字の英数字、`_`、`-` です。「トークンを再生成」と「トークンをコピー」があります。再読み込みすると別のトークンになり、この画面のユーザーとログは空に戻ります。
- 「SCIMリクエストシミュレーター」には次のボタンがあります。
  - 「ユーザーをプロビジョニング」は `POST /Users` です。成功すると `201 Created` になり、ブラウザのユーザー一覧にも追加されます。監査ログには `user.create` が 1 件残ります。
  - 「ユーザーを無効化」は、直前に作ったユーザーへの `PATCH /Users/:id` です。`active` を `false` にし、一覧と詳細のステータスを「無効」にします。監査ログには `user.disable` が 1 件残ります。対象がまだ無いときは API を呼ばず、監査ログにも残りません。
  - 「ユーザーを検索」は `GET /Users` です。`filter=userName eq "..."`、`startIndex=1`、`count=20` を付けます。検索だけでは監査ログは増えません。
- 同じ反映で、ステータス以外の項目だけを変えたときは `user.update`、ブラウザのユーザーを削除したときは `user.delete` になります。シミュレーターのボタンは作成、無効化、検索です。
- 直近のリクエストとレスポンス、および `GET /api/scim/v2/logs` のログ（メソッド、パス、ステータス、時刻、概要）を表示します。このログは監査ログとは別です。

`/api/scim/v2` のレスポンスは `Content-Type: application/scim+json` です。

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/api/scim/v2/ServiceProviderConfig` | 対応している機能 |
| GET | `/api/scim/v2/Schemas` | User と Enterprise User のスキーマ |
| GET | `/api/scim/v2/Users` | `startIndex`、`count`、`filter=userName eq "..."` |
| GET | `/api/scim/v2/Users/:id` | 1 件取得 |
| POST | `/api/scim/v2/Users` | 作成。`201 Created` |
| PUT | `/api/scim/v2/Users/:id` | 置き換え |
| PATCH | `/api/scim/v2/Users/:id` | `active`、`name`、`userName`、`department` などの更新 |
| DELETE | `/api/scim/v2/Users/:id` | 削除。`204 No Content` |
| GET | `/api/scim/v2/logs` | そのトークンの直近 50 件 |

Users と logs には Bearer トークンが必要です。トークンごとにユーザー最大 50 件、ログ最大 50 件で、古いものから捨てます。別のトークンのユーザーは見えません。データベースには書きません。`GET /api/users` のシード一覧とは別です。

シミュレーターで作ったユーザーは、再読み込みするまで `/users` と `/users/:id` に残ります。監査ログに足した履歴も再読み込みでシード 18 件に戻ります。

## データの持ち方

ユーザーの追加、更新、削除、監査ログの追加はブラウザのメモリにだけ残ります。再読み込みするとシードデータに戻るので、同じ自動操作を最初から繰り返せます。シードユーザーの役職、権限、入社日、備考は ID ごとの固定値です。氏名、メールアドレス、部署、ステータス、登録日は seed=42 のままです。`GET /api/audit-logs` は常に監査ログのシードだけを返します。

SCIM のユーザーとリクエストログは、Worker のメモリ上で Bearer トークンごとに最大 50 件まで持ちます。データベースには保存しません。画面を再読み込みするとトークンが新しくなり、SCIM 画面は空に戻ります。

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

画面の追加、更新、削除、監査ログの追加はブラウザのメモリだけです。Worker の `GET /api/users` はシードデータ（100件、`seed=42`）をページングするだけで、登録、更新、削除は反映しません。各ユーザーには `id`、`name`、`email`、`department`、`status`、`createdAt` に加え、`position`、`permission`（`general` / `admin` / `readonly`）、`joinDate`、`notes` が含まれます。`GET /api/audit-logs` は監査ログのシード 18 件を返します。`action` は操作種別の完全一致、`limit` は 1〜100 です。ブラウザで追加した履歴は含みません。`GET /api/health` は `{ "ok": true }` を返します。SAML の IdP 設定も Worker には保存しません。

## ロードマップ

- SaaS 管理画面の UI パターンを増やす
- パフォーマンスとエッジ配信の最適化

## セキュリティ

本番の個人情報、従業員データ、認証情報、証明書は入力しないでください。方針と報告方法は [SECURITY.md](SECURITY.md) です。

## コントリビューション

画面の追加、不具合修正、自動化シナリオは [CONTRIBUTING.md](CONTRIBUTING.md) を見てください。

## ライセンス

[MIT License](LICENSE) Copyright (c) 2026 Atsushi Kawamura
