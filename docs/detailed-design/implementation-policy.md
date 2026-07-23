<!--
doc-type: 詳細設計
id-prefix: なし
related: docs/detailed-design/README.md, docs/basic-design/api-list.md, docs/basic-design/tech-stack.md, docs/development/coding-guidelines.md
-->

# 実装方針詳細設計

## 1. 目的とスコープ

MVP1実装で複数領域に横断して適用する方針を定義する。

対象はエラー応答、例外設計、ログ出力、backend/frontendの内部構造、Cookie/CORS、設定管理、テスト分類とする。

本書はAPI、DB、業務ロジック、命名規約の正本を置き換えない。実装時にそれらを一貫して適用するための詳細設計として扱う。

## 2. 正本の切り分け

| 領域 | 正本 | 本書で扱うこと |
| --- | --- | --- |
| 技術選定、採用理由、トップレベル構成 | `docs/basic-design/tech-stack.md` | backend/frontend内部構造の詳細化 |
| APIエラーJSON形状 | `docs/basic-design/api-list.md` 4.3 | HTTPステータス、例外変換、実装責務 |
| 認証方式、JWT/refresh token TTL、Cookie属性値 | `docs/basic-design/api-list.md` 4.0 | 設定管理方法、CORS、配置前提 |
| DB契約 | `docs/detailed-design/database-schema.md` | 変更しない |
| 業務ロジック | `docs/detailed-design/business-logic.md` | 変更しない |
| 命名、コメント、クラス/メソッド設計 | `docs/development/coding-guidelines.md` | 実装配置との接続 |

`tech-stack.md` は `frontend/`、`backend/`、`docs/` などのトップレベル構成の正本とする。本書は、その配下のパッケージ、ディレクトリ、配置責務の正本とする。

## 3. backendパッケージ構造

backendのJavaパッケージは、ドメインと横断関心で分ける。

```text
com.studypm
├── account
├── auth
├── project
├── wbs
├── studylog
├── summary
├── common
│   ├── api
│   ├── error
│   └── time
└── config
```

| パッケージ | 責務 |
| --- | --- |
| `account` | アカウント情報、プロフィール、所有者起点の扱い |
| `auth` | ログイン、JWT、RefreshToken、Cookie、認証API |
| `project` | プロジェクトCRUD、削除、プロジェクト概要API |
| `wbs` | WBS、PARENT/LEAFタスク、進捗更新、計画履歴、進捗履歴 |
| `studylog` | 学習記録の登録、更新、削除、同一プロジェクト内タスク付替 |
| `summary` | ユーザー単位の総学習時間、連続学習日数などの横断集計 |
| `common.api` | API共通レスポンス、共通エラーレスポンス、Security用APIハンドラ |
| `common.error` | アプリケーション例外、エラーコード、例外からHTTPステータスへの分類 |
| `common.time` | JST基準日、Clock、日時変換 |
| `config` | Spring設定、外部設定値、Security設定 |

`RefreshToken` は認証手段の一部なので `auth` に置く。`API-PJ-06` のプロジェクト概要集約はプロジェクト画面専用の集約なので `project` に置く。ユーザー単位で複数プロジェクトを横断する集計のみ `summary` に置く。

ControllerはHTTP入出力の変換、Serviceはユースケースの進行、Calculator/Validatorは業務判断、Repositoryは永続化に責務を限定する。Controllerで業務ルールを判定しない。

## 4. frontendディレクトリ構造

frontendはルーティング、画面組み立て、ドメイン別機能、横断部品を分ける。

```text
frontend/src
├── app
├── routes
├── pages
├── features
│   ├── auth
│   ├── projects
│   ├── wbs
│   └── studyLogs
└── shared
    ├── api
    ├── components
    ├── styles
    └── types
```

| ディレクトリ | 責務 |
| --- | --- |
| `app` | アプリ初期化、`QueryClient`、共通Provider、全体CSS読み込み |
| `routes` | ルート定義のみ。画面ロジックやAPI呼び出しは置かない |
| `pages` | ルートに対応する画面組み立て。複数featureの部品を配置する |
| `features/*` | ドメイン別のAPI hook、UI部品、画面内ロジック、型 |
| `shared/api` | HTTPクライアント、共通エラー処理、認証ヘッダー付与 |
| `shared/components` | ドメインに依存しない共通UI部品 |
| `shared/styles` | デザイントークン、グローバルCSS、共通レイアウトCSS |
| `shared/types` | 複数featureで共有する型 |

`pages` は画面の組み立てに留め、ドメイン別の処理は `features/*` に置く。`routes` はURLと画面コンポーネントの対応だけを持つ。

`shared/utils` は汎用置き場になりやすいためMVP1では作らない。横断関数が必要な場合は、用途が分かる `shared/api`、`shared/types`、`common.time` 相当の明確な領域に置く。

## 5. エラー応答・例外設計

### 5.1 エラー応答形式

エラーJSONの形状は `docs/basic-design/api-list.md` 4.3 を正本とする。本書では形状を再定義せず、HTTPステータスと例外変換の適用方針だけを定義する。

`details` は常に配列として返す。詳細がない場合は空配列とする。

### 5.2 HTTPステータス

HTTPステータスは通信の成否ではなく、リクエストに対するサーバーの判定結果を表す。4xxはクライアントまたは業務起因、5xxはサーバー起因とする。応答が返らない通信断、タイムアウト、電文解析失敗は、フロントエンド側で通信エラーとして別扱いする。

| ステータス | 用途 | 例 |
| --- | --- | --- |
| `400 Bad Request` | リクエスト形式、型、入力値の不正 | JSON不正、必須漏れ、桁数超過、範囲外、Bean Validation違反 |
| `401 Unauthorized` | 未認証、アクセストークン無効・期限切れ | `Authorization` ヘッダーなし、期限切れJWT |
| `403 Forbidden` | MVP1では原則未使用。将来のロール、CSRF、明示的禁止操作用に予約 | 管理者専用操作、CSRF拒否 |
| `404 Not Found` | 未存在、削除済み、所有者不一致 | 存在しないprojectId、他アカウントのtaskId、削除済みリソース |
| `409 Conflict` | 現在状態との衝突 | 学習記録があるLEAF削除不可、完了条件未達での完了拒否、親子制約違反 |
| `422 Unprocessable Content` | MVP1では使わない | 将来、400/409で表現しにくい業務入力違反が増えた場合に検討 |
| `500 Internal Server Error` | 想定外エラー | 未捕捉例外、DB接続失敗 |

リソース作成APIは原則 `201 Created` を返す。アカウント登録はログイン済みセッションの開始を伴うため、認証APIの例外として `200 OK` を返す。

他アカウント資源、削除済み資源、未存在資源は一律404とする。対象データの存在を推測しにくくするため、他アカウント資源に403を返さない。

405などSpring MVCが判定するフレームワーク由来のHTTPステータスは、ステータスを維持したまま共通エラー応答形式へ変換する。

MVP1では入力不正を400、状態衝突を409に寄せる。422は採用しない。

主な業務違反は次のステータスへ割り当てる。

| 違反 | ステータス | 理由 |
| --- | --- | --- |
| 未来日の学習記録 | `400 Bad Request` | 入力値そのものが許可範囲外 |
| プロジェクト開始日 > 目標終了日 | `400 Bad Request` | 入力値の組み合わせ不正 |
| タスク開始予定日 > 終了予定日 | `400 Bad Request` | 入力値の組み合わせ不正 |
| 学習記録の別プロジェクトLEAFへの付替 | `400 Bad Request` | リクエストで指定した関連先が入力制約に違反 |
| 親タスクへの学習記録登録 | `400 Bad Request` | リクエストで指定した関連先が入力制約に違反 |
| 学習記録があるLEAFの削除 | `409 Conflict` | 現在のデータ状態により削除できない |
| 学習記録があるLEAFを含むPARENTの削除 | `409 Conflict` | 現在のデータ状態により削除できない |
| 完了条件未達でのプロジェクト完了 | `409 Conflict` | 現在の進捗状態により完了できない |
| タスク配下への子タスク追加 | `409 Conflict` | 現在のWBS構造により追加できない |

### 5.3 例外変換

- Controllerでtry-catchしない。
- Spring MVC例外とBean Validation例外は `GlobalExceptionHandler` で共通形式へ変換する。
- Spring Securityの401/403は `AuthenticationEntryPoint` / `AccessDeniedHandler` で共通形式へ変換する。
- Service層の業務例外は `common.error` 配下のアプリケーション例外で表す。
- ログイン失敗は、メールアドレスまたはパスワードのどちらが誤っているかを特定できないメッセージにする。

### 5.4 フロントエンドのエラー表示方針

フロントエンドでは、エラーを意味で分類し、HTTPステータスはその分類へ振り分けるための伝達手段として扱う。

| 意味分類 | 受け取り方 | 表示・アクション |
| --- | --- | --- |
| 業務エラー | HTTP 4xx（400/404/409） | 400はフィールド横インライン表示と入力保持。409は理由をインライン表示。404は一覧へ戻す、または「対象が存在しません」と表示する |
| システムエラー | HTTP 5xx、応答なし（通信断、タイムアウト、電文解析失敗） | 操作起点はトーストと再試行。読み込み起点は領域内エラーと再読み込み |
| 予期せぬエラー | フロントエンドの未捕捉例外、描画クラッシュ | Error Boundaryでエラー画面を表示し、「再読み込み」「ホームへ」を提示する |
| 認証切れ（特別枠） | 保護APIでHTTP 401 | ログイン画面へリダイレクトし、「セッションが切れました」と通知する |

バックエンドの `ApplicationException` は、5.2と5.3に従って業務エラーを4xxとして返す。フロントエンドはステータスと失敗種別を見て、上表の意味分類へ振り分ける。

ログインAPIの資格情報誤りは業務エラーとして扱い、ログイン画面へリダイレクトせず、ログインフォーム内にインライン表示する。保護APIで発生するセッション切れの401とは扱いを分ける。

真の通信エラーは、HTTPステータスが返らないケースだけとする。HTTP 4xx/5xxの応答が返っている場合は、通信自体は成立しているものとして扱う。

MVP1では、グローバルなトースト機構を1つ、TanStack Queryの `isError` による領域内フォールバック、Error Boundaryを1つ用意すればよい。過剰に作り込まない。

バックエンド分類（例外からHTTPステータスへの分類）とフロントエンド分類（ステータスから意味とアクションへの分類）は2層として分けて持ち、統合しない。

## 6. ログ出力方針

| レベル | 用途 |
| --- | --- |
| `ERROR` | 想定外例外、DB接続失敗、外部サービス接続失敗 |
| `WARN` | 認証失敗、認可拒否、業務上の拒否、削除不可 |
| `INFO` | アプリ起動、ログイン成功、ログアウト、主要な作成・削除 |
| `DEBUG` | 開発時の詳細確認。通常運用では出力しない |

次の値はログに出力しない。

- パスワード
- JWT
- refresh token
- Cookie値
- `Authorization` ヘッダー

ログには必要最小限の識別子だけを含める。例: `accountId`, `projectId`, `resourceId`。将来リクエストIDを導入できるよう、ログメッセージは処理単位が分かる形にする。

## 7. Cookie/CORS/設定管理

### 7.1 認証値の正本

JWT/refresh token TTL、Cookie属性の具体値は `docs/basic-design/api-list.md` 4.0 を正本とする。本書では同じ値を再宣言しない。

### 7.2 設定管理

次の値は環境別に外部化する。

| 設定 | 管理方針 |
| --- | --- |
| JWT署名秘密鍵 | 環境変数または秘密情報管理で注入する。リポジトリへ保存しない |
| DB接続情報 | `application-local.yml` と環境変数で分ける |
| CORS許可origin | 環境別に明示する。ワイルドカードは禁止 |
| Cookie `Secure` | 本番true。ローカル開発では環境別設定で無効化可能にする |

### 7.3 Cookie/CORS前提

MVP1の本番配置は、frontend と API を同一サイトに置く前提とする。

PC WebでCookieを送信する場合、CORSは `allowCredentials=true` とし、許可originを明示する。Cookie送信時にワイルドカードoriginは使わない。

将来frontendとAPIを別サイトに配置する場合は、Cookie属性とCORS方針を再設計する。

## 8. テスト分類

| 種別 | 命名 | 対象 |
| --- | --- | --- |
| backend単体テスト | `XxxTest` | Service、Calculator、Validator、例外分類 |
| backend結合テスト | `XxxIT` | Repository、Flyway、PostgreSQL制約、API結合 |
| frontendテスト | `Xxx.test.tsx` | ユーザー操作、画面表示、フォームバリデーション |

重点的に確認する。

- 400/401/404/409/500 の共通エラー応答
- 所有者不一致が404になること
- ログイン失敗時にどちらが誤りか分からないこと
- 認証情報がログに出力されないこと
- Cookie/CORS設定が環境別に切り替わること

## 9. 実装時チェックリスト

- APIエラーJSON形状を `api-list.md` 4.3 と一致させる。
- 他アカウント資源、削除済み資源、未存在資源を404にする。
- MVP1で422を返さない。
- Controllerに業務判断を書かない。
- 業務例外を `common.error` で分類する。
- 認証情報をログに出さない。
- backend/frontendの新規ファイルを本書の構造へ配置する。
- 命名と責務コメントは `coding-guidelines.md` に従う。

## 10. 未決事項

| 事項 | 方針 | 決定時期 |
| --- | --- | --- |
| 403の本格利用 | MVP1では予約扱い。ロール、CSRF、管理者機能を入れる場合に再検討する | 権限モデル追加時 |
| 422の採用 | MVP1では使わない。400/409で表現しにくい業務入力違反が増えた場合のみ検討する | API詳細設計またはMVP2以降 |
| 別サイト配置 | MVP1では同一サイト配置を前提とする。別サイトにする場合はCookie/CORSを再設計する | デプロイ構成検討時 |
