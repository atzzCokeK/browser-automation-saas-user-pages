# セキュリティポリシー

**English:** This repository is a dummy SaaS admin testbed for browser automation and SSO/SAML testing. Do not enter real personal information, real employee data, or production credentials or certificates. Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/atzzCokeK/browser-automation-saas-user-pages/security/advisories/new).

## このリポジトリで扱うデータ

ここはブラウザ自動操作と SSO/SAML の試験用ダミー管理画面です。本番のサービスではありません。

次のものは、画面への入力、Issue、Pull Request、コミットのどれにも置かないでください。

- 実在の個人情報（氏名、メールアドレス、電話番号、住所など）
- 実在の従業員データ
- 本番の認証情報、API キー、秘密鍵、トークン、証明書

ログイン画面に最初から入っているパスワードは、自動操作のための公開ダミーです。本番のシステムでは使わないでください。

ユーザーの追加と削除はブラウザのメモリにだけ残り、再読み込みで消えます。共有のサーバーデータベースには保存しません。試験用の状態は、ブラウザのメモリかストレージ、または署名付きでサーバーに状態を持たない Cookie に置いてください。

## 脆弱性の報告

公開の Issue には書かないでください。GitHub Security Advisories のプライベート報告を使ってください。

https://github.com/atzzCokeK/browser-automation-saas-user-pages/security/advisories/new

次を書いてください。

- 影響する画面またはエンドポイント
- 再現手順
- 想定される被害

実在の個人情報や本番の秘密は貼らないでください。修正のための追加情報が要るときだけ、こちらから連絡します。

プライベート報告が無効なときは、所有者が Settings の Private vulnerability reporting を有効にするまで、上の URL から報告できません。その場合も公開 Issue は使わず、所有者へ非公開で連絡してください。

## CI で見ていること

`main` への push と pull request で、秘密情報のスキャン（Gitleaks）、`npm audit`、依存差分の Dependency Review、CodeQL（JavaScript / TypeScript）を実行します。Dependency Review は、リポジトリの Dependency graph が有効なときだけ依存差分を検査します。無効なあいだはジョブが警告を出して成功し、有効になったあとは新しく入った high 以上で失敗します。この設定はリポジトリの Settings → Advanced Security から所有者が切り替えます。

`npm audit` は依存関係を直接検査し、既知の脆弱性が報告された場合は失敗します。
