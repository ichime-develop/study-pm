<!--
doc-type: 基本設計
id-prefix: API-AU, API-PJ, API-WB, API-SL, API-AN, API-AI
related: docs/basic-design/screen-list.md, docs/basic-design/screen-flow.md, docs/basic-design/data-model.md, docs/requirements/details/data-screens-interfaces.md
-->

# API一覧

## 1. 目的

PC Web版 `study-pm` と将来のFlutterスマホアプリが共通利用するREST APIの基本方針とAPI一覧を定義する。

本書ではAPIの責務、エンドポイント、使用画面、MVP、主要な入出力、関連業務ルールを整理する。詳細なリクエスト/レスポンスJSON、OpenAPI定義はAPI詳細設計または実装時に定義する。HTTPステータスと例外変換の横断方針は `docs/detailed-design/implementation-policy.md` に従う。

## 2. 前提

- 技術スタックは `docs/basic-design/tech-stack.md` に従う。
- 画面IDとルーティングは `docs/basic-design/screen-list.md` に従う。
- 画面遷移は `docs/basic-design/screen-flow.md` に従う。
- データモデルは `docs/basic-design/data-model.md` に従う。
- APIはJSON入出力を基本とする。
- 認証後のAPIは、認証済みアカウントの所有データだけを参照・更新できる。
- APIは画面単位ではなくリソース単位を基本とする。
- ただしプロジェクト概要、進捗分析など複数リソースを集約して表示する画面には、読み取り専用の集約APIを用意する。
- MVP外のAPIは同じ文書に記載するが、MVP列で実装対象を明確に分ける。

## 3. API ID方針

API IDは画面IDとは別系統で採番する。

| プレフィックス | 領域 |
| --- | --- |
| API-AU | 認証・アカウント |
| API-PJ | プロジェクト |
| API-WB | WBS |
| API-SL | 学習記録 |
| API-AN | 進捗分析 |
| API-AI | AI学習計画生成 |

## 4. 共通方針

### 4.0 認証方式

- 認証方式はJWTを採用する。
- アクセストークンは短命JWTとし、APIリクエストでは原則として `Authorization: Bearer ...` で送信する。
- アクセストークンはDBに保存しない。
- リフレッシュトークンは長命のランダム文字列とし、サーバー側では `refresh_tokens` にハッシュ化して保存する。
- アクセストークンの有効期限は15分、リフレッシュトークンの有効期限は14日をMVP1の既定値とする。
- ログアウト時は対象のリフレッシュトークンを失効させる。
- MVP1ではリフレッシュトークンのローテーション、再利用検知、デバイス一覧、全端末強制ログアウトは扱わない。
- PC Webでは、アクセストークンはメモリ保持、リフレッシュトークンは `HttpOnly`, `Secure`, `SameSite=Lax` 属性付きCookieで保持する方針とする。localStorageにはトークンを保存しない。`Secure` は本番では必須、ローカル開発では環境設定で無効化できるようにする。
- MVP1のPC Web向け登録・ログインAPIでは、リフレッシュトークンをレスポンス本文に含めずCookieでのみ返す。Flutter対応時は、クライアント種別を識別した上で本文返却を追加する。
- Flutterスマホアプリでは、アクセストークンとリフレッシュトークンをセキュアストレージで保持する方針とする。
- `/api/auth/refresh` は、PC WebではCookieから、Flutterではリクエスト本文からリフレッシュトークンを受け取れる設計にする。
- PC WebでリフレッシュトークンをCookie送信するため、`/api/auth/refresh` と `/api/auth/logout` はCSRFを考慮する。MVP1では `SameSite=Lax` を前提とする。

### 4.1 URL設計

- ベースパスは `/api` とする。
- プロジェクト配下のリソースの一覧取得・作成は `/api/projects/{projectId}/...` に寄せる。
- 作成済みリソースの個別取得・更新・削除は、IDがグローバルに一意であるため `/api/wbs-tasks/{taskId}`, `/api/study-logs/{studyLogId}` のようにリソース直下のパスで扱う。所有者検証は4.2に従いサーバー側で行う。
- 認証中アカウントに関するAPI（ユーザー単位のサマリー等）は `/api/me` 配下を使う。
- アクション性が強い操作は、リソースの状態変更として表現できる場合は `PATCH` を使う。
- 集約表示用APIは読み取り専用の `GET` とし、DBに集計値を保存しない。
- 一覧APIのページングはMVP1では `page` / `size` によるoffset/page方式で開始する。個人利用規模を前提とし、性能問題が出た場合にcursor方式を検討する。

### 4.2 認証・認可

- 登録（API-AU-01）、ログイン（API-AU-02）、アクセストークン再発行（API-AU-05。リフレッシュトークンで検証）を除き、原則として認証必須とする。
- 認証済みAPIでは、パスやリクエスト本文で指定された `projectId`, `taskId`, `studyLogId` が認証中アカウントの所有データであることをサーバー側で検証する。
- 他ユーザーのデータを指定された場合、対象データの存在を推測しにくい応答とする。

### 4.3 エラー応答

エラー応答は次の共通形式を基本とする。

```json
{
  "code": "VALIDATION_ERROR",
  "message": "入力内容を確認してください。",
  "details": [
    {
      "field": "email",
      "message": "メールアドレスの形式で入力してください。"
    }
  ]
}
```

`details` は省略せず、詳細がない場合は空配列を返す。バリデーションエラーでは `field` 単位の配列を返す。認証失敗時は、メールアドレスまたはパスワードのどちらが誤っているかを特定できない `message` とする。

### 4.4 副作用の分離

- WBSタスクの通常更新と進捗率更新はAPIを分ける。
- 進捗率更新は `wbs_task_progress_history` の追加という重要な副作用を持つため、`PATCH /api/wbs-tasks/{taskId}/progress` として独立させる。
- 学習記録の登録・更新・削除後、実績工数や総学習時間は保存せず、表示時に現在の `study_logs` から再計算する。
- プロジェクト期間変更、WBS計画変更、WBS進捗変更では、要件で定義された履歴を保存する。

### 4.5 MVP境界

| MVP | API範囲 |
| --- | --- |
| MVP1 | 認証、プロジェクト、WBS、学習記録、プロジェクト一覧ホーム |
| MVP2 | 進捗分析、EVM、バーンダウン |
| MVP3 | AI学習計画生成、OCR、WBS下書き確認・変換 |

## 5. API一覧

### 5.1 認証・アカウント

| API ID | Method | Path | 概要 | 使用画面 | MVP | 認証 | 主な入力 | 主な出力 | 関連要件・ルール |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-AU-01 | POST | `/api/auth/signup` | アカウント登録 | AU01 | 1 | 不要 | email, password, displayName | アカウント概要、アクセストークン、Cookie設定 | USR-01, USR-05, USR-06, USR-07 |
| API-AU-02 | POST | `/api/auth/login` | ログイン | AU02 | 1 | 不要 | email, password | アカウント概要、アクセストークン、Cookie設定 | USR-02, USR-08 |
| API-AU-03 | POST | `/api/auth/logout` | ログアウト。リフレッシュトークンを失効させる | CM01 | 1 | 必須 | リフレッシュトークンまたはCookie | 成功結果 | USR-03 |
| API-AU-04 | GET | `/api/me` | 認証中アカウント取得 | ログイン後共通 | 1 | 必須 | なし | accountId, email, displayName | USR-04 |
| API-AU-05 | POST | `/api/auth/refresh` | アクセストークン再発行。リフレッシュトークンを検証し、新しいアクセストークンを返す | ログイン後共通（画面非依存） | 1 | 不要（リフレッシュトークンで検証） | リフレッシュトークンまたはCookie | 新しいアクセストークン | 4.0 認証方式 |

### 5.2 プロジェクト

| API ID | Method | Path | 概要 | 使用画面 | MVP | 認証 | 主な入力 | 主な出力 | 関連要件・ルール |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-PJ-01 | GET | `/api/projects` | プロジェクト一覧取得 | PJ01 | 1 | 必須 | keyword, status, sort, page | プロジェクト一覧、ページ情報、一覧用集計 | PRJ-04, PRJ-05, PRJ-16, PRJ-17, 10.11 |
| API-PJ-02 | GET | `/api/me/study-summary` | プロジェクト一覧上部の学習サマリー取得 | PJ01 | 1 | 必須 | なし | 連続学習日数、総学習時間、進行中件数 | HME-02, HME-03, HME-04, 10.11 |
| API-PJ-03 | POST | `/api/projects` | プロジェクト作成 | PJ02 | 1 | 必須 | name, description, startDate, targetEndDate | 作成済みプロジェクト概要 | PRJ-01, PRJ-02, PRJ-14, PRJ-15 |
| API-PJ-04 | GET | `/api/projects/{projectId}` | プロジェクト詳細取得 | PJ02, PJ03, CM02 | 1 | 必須 | projectId | プロジェクト基本情報 | PRJ-07, SCR.PJ03-01 |
| API-PJ-05 | PATCH | `/api/projects/{projectId}` | プロジェクト基本情報更新 | PJ02, CM02 | 1 | 必須 | name, description, startDate, targetEndDate, status | 更新後プロジェクト概要 | PRJ-03, PRJ-20, PRJ-21, PRJ-22, 10.1, 10.4 |
| API-PJ-06 | GET | `/api/projects/{projectId}/overview` | プロジェクト概要用サマリー取得 | PJ03 | 1 | 必須 | projectId | 進捗率、予定工数、残予定工数、プロジェクト学習時間、プロジェクト連続日数、警告、未完了タスク | PRJ-18, PRJ-27, PRJ-28, SCR.PJ03-02, SCR.PJ03-10, SCR.PJ03-23 |
| API-PJ-07 | DELETE | `/api/projects/{projectId}` | プロジェクト削除 | PJ03 | 1 | 必須 | projectId | 成功結果 | PRJ-09, PRJ-10, PRJ-11, PRJ-12, PRJ-23, PRJ-24, PRJ-25, 10.1 |

### 5.3 WBS

| API ID | Method | Path | 概要 | 使用画面 | MVP | 認証 | 主な入力 | 主な出力 | 関連要件・ルール |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-WB-01 | GET | `/api/projects/{projectId}/wbs` | WBS一覧取得 | WB01, CM02 | 1 | 必須 | projectId | 親タスク・タスク一覧、ガント表示用日付範囲、集計 | WBS-01, WBS-06, WBS-12, WBS-24, 10.3 |
| API-WB-02 | POST | `/api/projects/{projectId}/wbs-tasks` | 親タスクまたはタスク作成 | WB01 | 1 | 必須 | taskType, name, description, parentTaskId, plannedStartDate, plannedEndDate, plannedHours | 作成済みWBSタスク | WBS-01, WBS-02, WBS-03, WBS-17, WBS-18, 10.3, 10.5 |
| API-WB-03 | GET | `/api/wbs-tasks/{taskId}` | WBSタスク詳細取得 | WB01 | 1 | 必須 | taskId | WBSタスク詳細、関連学習記録概要 | WBS-05, SCR.WB01-07 |
| API-WB-04 | PATCH | `/api/wbs-tasks/{taskId}` | WBSタスクの基本・計画情報更新 | WB01 | 1 | 必須 | name, description, parentTaskId, plannedStartDate, plannedEndDate, plannedHours | 更新後WBSタスク | WBS-05, WBS-07, WBS-16, WBS-22, WBS-23, 10.3, 10.4 |
| API-WB-05 | PATCH | `/api/wbs-tasks/{taskId}/progress` | タスク進捗率更新 | WB01 | 1 | 必須 | progressRate | 更新後進捗率、進捗履歴追加有無 | WBS-09, WBS-10, WBS-11, WBS-15, 10.5 |
| API-WB-06 | DELETE | `/api/wbs-tasks/{taskId}` | WBSタスク削除 | WB01 | 1 | 必須 | taskId | 成功結果 | WBS-08, WBS-20, WBS-21, 10.3 |
| API-WB-07 | GET | `/api/projects/{projectId}/wbs-summary` | WBS画面用のWBS集計取得 | WB01 | 1 | 必須 | projectId | 予定工数、実績工数、進捗率、遅延有無 | PRJ-08, WBS-12, WBS-13 |

API-WB-04は名称・説明・予定日・予定工数・親タスクの更新を扱う。進捗率はAPI-WB-05でのみ更新する。

API-WB-02で `taskType = LEAF` のタスクを作成した場合、初期進捗率0%の `wbs_task_progress_history` を1行作成する。

### 5.4 学習記録

| API ID | Method | Path | 概要 | 使用画面 | MVP | 認証 | 主な入力 | 主な出力 | 関連要件・ルール |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-SL-01 | GET | `/api/projects/{projectId}/study-logs` | プロジェクト内学習記録一覧取得 | SL01 | 1 | 必須 | projectId, taskId, page | 学習記録一覧、合計学習時間 | LOG-14, LOG-16, SCR.SL01-01, SCR.SL01-02 |
| API-SL-02 | POST | `/api/projects/{projectId}/study-logs` | 学習記録登録 | SL01, WB01 | 1 | 必須 | wbsTaskId, studyDate, studyHours, memo | 登録済み学習記録、再計算後サマリー | LOG-01, LOG-02, LOG-03, LOG-05, LOG-12, LOG-13, LOG-19 |
| API-SL-03 | GET | `/api/study-logs/{studyLogId}` | 学習記録詳細取得 | SL01 | 1 | 必須 | studyLogId | 学習記録詳細 | LOG-14, SCR.SL01-12 |
| API-SL-04 | PATCH | `/api/study-logs/{studyLogId}` | 学習記録更新 | SL01 | 1 | 必須 | wbsTaskId, studyDate, studyHours, memo | 更新後学習記録、再計算後サマリー | LOG-06, LOG-07, LOG-18, 10.6 |
| API-SL-05 | DELETE | `/api/study-logs/{studyLogId}` | 学習記録削除 | SL01 | 1 | 必須 | studyLogId | 成功結果、再計算後サマリー | LOG-06, LOG-08, LOG-18, SCR.SL01-16 |

学習記録は親タスクへ登録できない。`wbsTaskId` は同じプロジェクト内の `task_type = LEAF` のみ許可する。

### 5.5 進捗分析

| API ID | Method | Path | 概要 | 使用画面 | MVP | 認証 | 主な入力 | 主な出力 | 関連要件・ルール |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-AN-01 | GET | `/api/projects/{projectId}/analysis/evm` | EVMサマリー取得 | AN01, PJ03 | 2 | 必須 | projectId | `isCalculable`、理由、BAC, PV, EV, AC, SV, CV, SPI, CPI。算出不可値は`null` | EVM-01, EVM-02, EVM-03, EVM-05, EVM-13, EVM-15, 10.8 |
| API-AN-02 | GET | `/api/projects/{projectId}/analysis/burndown` | バーンダウン取得 | AN01 | 2 | 必須 | projectId | `isCalculable`、理由、理想線、実績線、差分工数、差分日数。算出不可値は`null` | EVM-06, EVM-07, EVM-09, EVM-10, EVM-12, 10.9 |
| API-AN-03 | GET | `/api/projects/{projectId}/analysis/plan-warnings` | 計画不整合取得 | PJ03, AN01, WB01 | 2 | 必須 | projectId | 不整合タスク一覧、警告種別 | EVM-11, PRJ-22, 10.4 |

進捗分析APIは集約結果を返すだけで、EVM指標やバーンダウン表示点をDBへ保存しない。

### 5.6 AI学習計画生成

| API ID | Method | Path | 概要 | 使用画面 | MVP | 認証 | 主な入力 | 主な出力 | 関連要件・ルール |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-AI-01 | POST | `/api/ai-plan/ocr` | 教材目次画像1枚のOCR | AI02 | 3 | 必須 | 10MB以下の画像ファイル | OCR結果テキスト | PLN-02, PLN-03, PLN-04, PLN-11〜15 |
| API-AI-02 | POST | `/api/ai-plan/requests` | AI計画生成依頼の作成・入力保存 | AI02 | 3 | 必須 | sourceType, learningGoal, startDate, targetEndDate, sources, constraints | generationRequestId、事前検証結果 | PLN-01, PLN-05, PLN-20, PLN-28, PLN-38, PLN-39 |
| API-AI-03 | PATCH | `/api/ai-plan/requests/{requestId}` | 入力条件・入力元テキストの更新 | AI02 | 3 | 必須 | 更新後条件、sources | 更新後入力、事前検証結果 | PLN-04, PLN-05, PLN-18 |
| API-AI-04 | POST | `/api/ai-plan/requests/{requestId}/draft-jobs` | 入力と生成条件からWBS生成ジョブ開始 | AI02 | 3 | 必須 | requestId, deadlinePriority | jobId, status, deadlineAt | PLN-24, PLN-31〜34, PLN-39 |
| API-AI-05 | GET | `/api/ai-plan/jobs/{jobId}` | AI処理ジョブ状態取得 | AI02 | 3 | 必須 | jobId | jobType, status, deadlineAt, errorCode, resultResourceId | PLN-08, PLN-31〜34 |
| API-AI-06 | POST | `/api/ai-plan/jobs/{jobId}/cancel` | AI処理の停止要求 | AI02 | 3 | 必須 | jobId | status | PLN-10, PLN-32 |
| API-AI-07 | GET | `/api/ai-plan/drafts/{draftId}` | WBS下書き取得 | AI03 | 3 | 必須 | draftId | プロジェクト基本情報、WBS下書き、計画不整合、緩和案 | PLN-06, PLN-26〜30 |
| API-AI-08 | PUT | `/api/ai-plan/drafts/{draftId}` | WBS下書きの一括編集・再検証 | AI03 | 3 | 必須 | draftRevision, project, draftWbsTasks | 更新後下書き、validation, warnings, relaxationOptions | PLN-16, PLN-17, PLN-26, PLN-29 |
| API-AI-09 | POST | `/api/ai-plan/drafts/{draftId}/convert` | WBS下書きからプロジェクト作成 | AI03 | 3 | 必須 | draftRevision | projectId, wbsTaskIds | PLN-07, PLN-26, PLN-27 |

OCRは画像1枚ごとの同期APIとし、PC Webは最大3件を並列実行する。最大10枚・合計50MBはOCR送信前にクライアントが検証し、サーバーはOCR APIで1画像10MB、生成依頼の保存時に `OCR_TEXT` 入力元が最大10件であることを検証する。画像を永続保存しない1画像単位APIのため、合計50MBはサーバー側で再集計しない。この責務分担はMVP3の意識的な例外とし、外部クライアントにも同じ事前検証を要求する。

WBS下書き生成は非同期ジョブとして受付後にポーリングする。WBS下書きからプロジェクトを作成した後、作成済みプロジェクトとWBSは通常の `projects` / `wbs_tasks` として扱う。同じ `ai_plan_draft` から複数プロジェクトを作成することはできない。

## 6. 画面とAPIの対応

| 画面ID | 主に使用するAPI |
| --- | --- |
| AU01 | API-AU-01 |
| AU02 | API-AU-02 |
| PJ01 | API-PJ-01, API-PJ-02 |
| PJ02 | API-PJ-03, API-PJ-04, API-PJ-05 |
| PJ03 | API-PJ-04, API-PJ-06, API-PJ-07, API-AN-01, API-AN-03 |
| WB01 | API-WB-01, API-WB-02, API-WB-03, API-WB-04, API-WB-05, API-WB-06, API-WB-07, API-SL-02 |
| SL01 | API-SL-01, API-SL-02, API-SL-03, API-SL-04, API-SL-05 |
| AN01 | API-AN-01, API-AN-02, API-AN-03 |
| AI01 | なし（静的な選択画面。遷移のみ） |
| AI02 | API-AI-01〜06 |
| AI03 | API-AI-07〜09 |
| CM01（共通） | API-AU-03, API-AU-04 |

API-AU-04（認証中アカウント取得）はログイン後の全画面で共通利用するため、個別画面の行には記載しない。

MVP1ではAN01、AI01、AI02、AI03は実装対象外とする。PJ03で進捗分析への導線を表示する場合も、MVP1では非活性または段階提供表示とする。

## 7. 主要業務ルールとの対応

| ルール | 主に関係するAPI | 方針 |
| --- | --- | --- |
| 所有者制御 | 全認証必須API | 認証中アカウントの所有データだけ参照・更新できる |
| プロジェクト削除 | API-PJ-07 | 削除前確認は画面側で行い、APIでは所有者確認後に対象プロジェクトと関連データを削除する |
| 完了条件 | API-PJ-05 | 完了へ変更する場合、1件以上のリーフタスクが存在し、全リーフタスクが100%であることを検証する |
| プロジェクト期間履歴 | API-PJ-05 | 開始日または目標終了日が変わった場合、`project_period_history` を追加する |
| WBS階層制約 | API-WB-02, API-WB-04 | 親タスクは最上位のみ、リーフタスクは親タスク配下または親なしのみ許可する |
| WBS計画履歴 | API-WB-04 | 親タスク、予定日、予定工数が変わった場合、`wbs_task_plan_history` を追加する |
| WBS進捗履歴 | API-WB-02, API-WB-05 | タスク作成時に0%を追加し、進捗率変更時に `wbs_task_progress_history` を追加する |
| 学習記録制約 | API-SL-02, API-SL-04 | 親タスク、未来日、他プロジェクトのタスクを拒否する。過去日の学習記録は期限なく編集・削除を許可する |
| 実績工数再計算 | API-SL-02〜05, API-PJ-06, API-WB-01, API-WB-07 | 実績工数は保存せず、現在の学習記録から取得時に再計算する |
| EVM・バーンダウン | API-AN-01, API-AN-02 | 指標は保存せず、現在の計画値・進捗履歴・学習記録から計算する |
| AI所有者制御 | API-AI-02〜09 | generationRequest、job、draftのaccountIdが認証中アカウントと一致する場合だけ参照・更新する |
| AI処理の排他 | API-AI-04 | 同一ユーザーに待機中・処理中・停止要求中のジョブがある場合は409で拒否する |
| AI出力検証 | API-AI-04, API-AI-08, API-AI-09 | 構造化出力受信時、下書き編集時、変換時に業務制約を検証する |

MVP3の3画面フローへの整理に伴い、未実装だったAI API案のIDを `API-AI-01`〜`API-AI-09` に再割り当てした。実装済みAPIとの互換性はなく、以後は本表のIDと責務を正本とする。

## 8. 未決事項

| ID | 内容 | 決定タイミング |
| --- | --- | --- |
| API-TBD-06 | API IDをOpenAPI operationIdへそのまま反映するか | OpenAPI定義作成時 |
| API-TBD-08 | 1日のユーザー別生成上限、ジョブ総期限、外部呼び出しタイムアウト、通信再試行回数の具体値 | MVP3の実測・運用設計 |

## 9. 矛盾点・要件同期メモ

UIモックは本設計のAI01〜AI03に対応する3画面構成へ同期済みである。
