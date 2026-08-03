<!--
doc-type: 詳細設計
id-prefix: なし
related: docs/basic-design/data-model.md, docs/basic-design/api-list.md, docs/requirements/details/business-rules.md, docs/requirements/details/data-screens-interfaces.md
-->

# DBスキーマ詳細設計

## 1. 目的とスコープ

`docs/basic-design/data-model.md` で定義した概念データモデルを、PostgreSQL 17 + Flyway + Spring Data JPAで実装できるテーブル定義方針へ具体化する。

本書ではMVP1で作成したテーブルとMVP3で追加するAI関連テーブルのカラム型、主キー、外部キー、CHECK制約、インデックス、Flyway作成順を定義する。EVM、日別EV、バーンダウン、AI生成などの業務ロジックは、本書のテーブル・カラムを前提に別途設計する。

## 2. 共通DB設計方針

| 項目 | 方針 |
| --- | --- |
| DB | PostgreSQL 17 |
| マイグレーション | Flyway |
| 主キー | 全テーブル `uuid` |
| 日時 | `timestamptz` |
| 日付 | `date` |
| 工数 | `numeric(6,2)` |
| 進捗率 | `smallint` |
| ステータス・種別 | PostgreSQL enumではなく `varchar` + CHECK制約 |
| 作成日時・更新日時 | `created_at`, `updated_at` はアプリケーション側で設定・更新する |
| 集計値 | 保存しない。参照APIまたは業務ロジックで都度計算する |

### 2.1 UUID

主キーはすべて `uuid` とする。API、Webフロントエンド、将来のFlutterアプリで同じIDを扱いやすくし、連番推測を避けるためである。

UUIDの生成はアプリケーション側で行う。MVP1では実装負荷を優先し、Java標準のランダムUUIDで開始する。UUIDv7は、一覧・履歴の件数増加により主キーインデックスの局所性が問題になった場合に検討する。

### 2.2 時刻とJST

履歴日時、トークン期限、作成日時、更新日時は `timestamptz` で保持する。学習日、予定日、プロジェクト期間は日付単位の業務データのため `date` とする。

JST基準の「今日」「日別EV」「連続学習日数」の境界判定は、DB制約ではなく業務ロジックで行う。`study_date <= 今日` もJST基準で判定するため、DB CHECKではなくアプリケーション側で検証する。

### 2.3 工数と刻み

予定工数と学習時間は `numeric(6,2)` とする。0.25時間単位を丸め誤差なく扱うため、浮動小数点型は使わない。

工数の下限と刻みはDB CHECKでも強制する。

```sql
value >= 0.25
and value * 4 = floor(value * 4)
```

### 2.4 削除方針

| 対象 | 方針 |
| --- | --- |
| `projects` | 削除APIに対応して物理削除する |
| `wbs_tasks` | 削除APIに対応して物理削除する |
| `study_logs` | 削除APIに対応して物理削除する |
| WBS履歴 | タスク削除後も保持する |
| `refresh_tokens` | アカウント削除時は同時に削除する |

WBS履歴はタスク削除後も参照できるように、履歴テーブルの `wbs_task_id` はnullableとし、`ON DELETE SET NULL` を使う。削除後も履歴の文脈が分かるよう、履歴テーブルには `project_id` と `task_name_snapshot` を保持する。プロジェクト削除時は、サービス層でプロジェクト配下の学習記録、WBS履歴、WBSタスク、期間履歴を削除してからプロジェクトを削除する。

## 3. テーブル一覧

| テーブル | MVP | 目的 |
| --- | --- | --- |
| `accounts` | MVP1 | ログインアカウントと所有データの起点 |
| `refresh_tokens` | MVP1 | リフレッシュトークンの失効管理 |
| `projects` | MVP1 | 学習プロジェクト |
| `project_period_history` | MVP1 | プロジェクト期間変更履歴 |
| `wbs_tasks` | MVP1 | 親タスクとリーフタスク |
| `wbs_task_plan_history` | MVP1 | WBS計画変更履歴 |
| `wbs_task_progress_history` | MVP1 | WBS進捗履歴 |
| `study_logs` | MVP1 | 学習実績 |
| `ai_plan_generation_requests` | MVP3 | AI計画生成条件と入力内容 |
| `ai_plan_sources` | MVP3 | 概要・目次・修正済みOCRテキスト |
| `ai_generation_jobs` | MVP3 | WBS生成の非同期状態 |
| `ai_plan_drafts` | MVP3 | 検証済みWBS下書き |

## 4. テーブル定義

### 4.1 accounts

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `email` | `varchar(254)` | NO | ログインメールアドレス |
| `password_hash` | `varchar(255)` | NO | パスワードハッシュ |
| `display_name` | `varchar(100)` | NO | 表示名 |
| `ai_usage_consent_at` | `timestamptz` | YES | 既存の未使用カラム。MVP3移行で削除する |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- `primary key (id)`

一意性:

- `lower(email)` の一意インデックスを作成する

MVP3ではAI利用同意を永続管理しない。既存の `Account.aiUsageConsentAt` フィールドと関連するDTO・SQL参照を削除し、AI関連テーブル追加と同じマイグレーション系列で `ai_usage_consent_at` を削除する。

### 4.2 refresh_tokens

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `account_id` | `uuid` | NO | `accounts.id` |
| `token_hash` | `varchar(255)` | NO | リフレッシュトークンのハッシュ |
| `expires_at` | `timestamptz` | NO | 有効期限 |
| `revoked_at` | `timestamptz` | YES | ログアウト等による失効日時 |
| `created_at` | `timestamptz` | NO | 作成日時 |

制約:

- `primary key (id)`
- `foreign key (account_id) references accounts(id) on delete cascade`
- `unique (token_hash)`
- `expires_at > created_at`

平文のリフレッシュトークンは保存しない。MVP1ではローテーション、再利用検知、端末一覧、全端末ログアウトは扱わない。

### 4.3 projects

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `account_id` | `uuid` | NO | `accounts.id` |
| `name` | `varchar(100)` | NO | プロジェクト名 |
| `description` | `varchar(5000)` | YES | 概要 |
| `start_date` | `date` | NO | 開始日 |
| `target_end_date` | `date` | NO | 目標終了日 |
| `status` | `varchar(20)` | NO | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- `primary key (id)`
- `foreign key (account_id) references accounts(id) on delete restrict`
- `status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')`
- `char_length(name) between 1 and 100`
- `start_date <= target_end_date`

プロジェクト削除時は、関連データも削除対象とする。削除後は復元しない。

### 4.4 project_period_history

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `project_id` | `uuid` | NO | `projects.id` |
| `old_start_date` | `date` | NO | 変更前開始日 |
| `new_start_date` | `date` | NO | 変更後開始日 |
| `old_target_end_date` | `date` | NO | 変更前目標終了日 |
| `new_target_end_date` | `date` | NO | 変更後目標終了日 |
| `changed_by_account_id` | `uuid` | NO | 変更者 |
| `changed_at` | `timestamptz` | NO | 変更日時 |

制約:

- `primary key (id)`
- `foreign key (project_id) references projects(id) on delete restrict`
- `foreign key (changed_by_account_id) references accounts(id) on delete restrict`
- `old_start_date <= old_target_end_date`
- `new_start_date <= new_target_end_date`

追加条件はアプリケーション側で制御する。開始日または目標終了日の保存前後の値が変わった場合のみ1行追加する。

### 4.5 wbs_tasks

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `project_id` | `uuid` | NO | `projects.id` |
| `parent_wbs_task_id` | `uuid` | YES | 親タスク。LEAFのみ設定可 |
| `task_type` | `varchar(10)` | NO | `PARENT`, `LEAF` |
| `name` | `varchar(100)` | NO | タスク名 |
| `description` | `varchar(5000)` | YES | 説明 |
| `planned_start_date` | `date` | YES | 開始予定日。LEAFのみ設定可 |
| `planned_end_date` | `date` | YES | 終了予定日。LEAFのみ設定可 |
| `planned_hours` | `numeric(6,2)` | YES | 予定工数。LEAFは必須 |
| `progress_rate` | `smallint` | YES | 進捗率。LEAFは必須 |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- `primary key (id)`
- `foreign key (project_id) references projects(id) on delete restrict`
- `foreign key (parent_wbs_task_id) references wbs_tasks(id) on delete restrict`
- `task_type in ('PARENT', 'LEAF')`
- `char_length(name) between 1 and 100`
- `planned_start_date is null or planned_end_date is null or planned_start_date <= planned_end_date`
- PARENT制約:
  - `parent_wbs_task_id is null`
  - `planned_start_date is null`
  - `planned_end_date is null`
  - `planned_hours is null`
  - `progress_rate is null`
- LEAF制約:
  - `planned_hours is not null`
  - `planned_hours >= 0.25`
  - `planned_hours * 4 = floor(planned_hours * 4)`
  - `progress_rate is not null`
  - `progress_rate between 0 and 100`
  - `progress_rate % 10 = 0`

DB CHECKだけでは、`parent_wbs_task_id` が同一プロジェクト内のPARENTであることを保証できない。この制約はWBS作成・更新のサービス層で検証する。

親タスク削除時に配下タスクも削除する場合は、サービス層で配下LEAFに学習記録がないことを確認し、子LEAFを削除してから親PARENTを削除する。

### 4.6 wbs_task_plan_history

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `wbs_task_id` | `uuid` | YES | 対象タスク。削除後はNULL |
| `project_id` | `uuid` | NO | 帰属プロジェクト。削除後も保持 |
| `task_name_snapshot` | `varchar(100)` | NO | 変更時点のタスク名 |
| `old_parent_wbs_task_id` | `uuid` | YES | 変更前親タスク |
| `new_parent_wbs_task_id` | `uuid` | YES | 変更後親タスク |
| `old_planned_start_date` | `date` | YES | 変更前開始予定日 |
| `new_planned_start_date` | `date` | YES | 変更後開始予定日 |
| `old_planned_end_date` | `date` | YES | 変更前終了予定日 |
| `new_planned_end_date` | `date` | YES | 変更後終了予定日 |
| `old_planned_hours` | `numeric(6,2)` | YES | 変更前予定工数 |
| `new_planned_hours` | `numeric(6,2)` | YES | 変更後予定工数 |
| `changed_by_account_id` | `uuid` | NO | 変更者 |
| `changed_at` | `timestamptz` | NO | 変更日時 |

制約:

- `primary key (id)`
- `foreign key (wbs_task_id) references wbs_tasks(id) on delete set null`
- `foreign key (project_id) references projects(id) on delete restrict`
- `foreign key (old_parent_wbs_task_id) references wbs_tasks(id) on delete set null`
- `foreign key (new_parent_wbs_task_id) references wbs_tasks(id) on delete set null`
- `foreign key (changed_by_account_id) references accounts(id) on delete restrict`
- `old_planned_start_date is null or old_planned_end_date is null or old_planned_start_date <= old_planned_end_date`
- `new_planned_start_date is null or new_planned_end_date is null or new_planned_start_date <= new_planned_end_date`
- `old_planned_hours is null or (old_planned_hours >= 0.25 and old_planned_hours * 4 = floor(old_planned_hours * 4))`
- `new_planned_hours is null or (new_planned_hours >= 0.25 and new_planned_hours * 4 = floor(new_planned_hours * 4))`

計画履歴はLEAFのみを対象にする。名称・説明だけの変更では追加しない。追加条件はサービス層で制御する。`project_id` は、対象タスク削除後もどのプロジェクトの履歴か追跡できるよう保持する。
親タスク削除時は `old_parent_wbs_task_id` / `new_parent_wbs_task_id` がNULLになり、移動元・移動先の親タスクを履歴から追跡することは保証しない。

### 4.7 wbs_task_progress_history

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `wbs_task_id` | `uuid` | YES | 対象タスク。削除後はNULL |
| `project_id` | `uuid` | NO | 帰属プロジェクト。削除後も保持 |
| `task_name_snapshot` | `varchar(100)` | NO | 変更時点のタスク名 |
| `progress_rate` | `smallint` | NO | 変更後進捗率 |
| `changed_by_account_id` | `uuid` | NO | 変更者 |
| `changed_at` | `timestamptz` | NO | 変更日時 |

制約:

- `primary key (id)`
- `foreign key (wbs_task_id) references wbs_tasks(id) on delete set null`
- `foreign key (project_id) references projects(id) on delete restrict`
- `foreign key (changed_by_account_id) references accounts(id) on delete restrict`
- `progress_rate between 0 and 100`
- `progress_rate % 10 = 0`

LEAF作成時に0%の初期行を追加する。以降は保存前後の進捗率が変わった場合のみ追加する。`project_id` は、対象タスク削除後もどのプロジェクトの履歴か追跡できるよう保持する。

### 4.8 study_logs

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `account_id` | `uuid` | NO | `accounts.id` |
| `project_id` | `uuid` | NO | `projects.id` |
| `wbs_task_id` | `uuid` | NO | 対象LEAFタスク |
| `study_date` | `date` | NO | 学習日 |
| `study_hours` | `numeric(6,2)` | NO | 学習時間 |
| `memo` | `varchar(5000)` | YES | メモ |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- `primary key (id)`
- `foreign key (account_id) references accounts(id) on delete restrict`
- `foreign key (project_id) references projects(id) on delete restrict`
- `foreign key (wbs_task_id) references wbs_tasks(id) on delete restrict`
- `study_hours >= 0.25`
- `study_hours * 4 = floor(study_hours * 4)`

`wbs_task_id` が同一アカウント・同一プロジェクトのLEAFであることはサービス層で検証する。未来日の禁止もJST基準でサービス層が検証する。

### 4.9 ai_plan_generation_requests

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `account_id` | `uuid` | NO | 所有アカウント |
| `source_type` | `varchar(20)` | NO | `OVERVIEW`, `TABLE_OF_CONTENTS`, `MIXED` |
| `learning_goal` | `varchar(5000)` | NO | 学習目標 |
| `start_date` | `date` | NO | 学習開始日 |
| `target_end_date` | `date` | NO | 目標終了日 |
| `constraints_json` | `jsonb` | NO | 平日・土日それぞれの学習可能時間、学習できない曜日、補足、重点・軽め・除外条件、数量条件、WBS分割単位 |
| `retention_expires_at` | `timestamptz` | NO | 生成依頼配下のAI一時データ削除予定日時。変換済みでも適用 |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- `foreign key (account_id) references accounts(id) on delete cascade`
- `source_type in ('OVERVIEW', 'TABLE_OF_CONTENTS', 'MIXED')`
- `start_date <= target_end_date`
- `constraints_json` の平日・土日学習可能時間は0以上かつ0.25時間単位、WBS分割単位は `SECTION`、`PAGE`、`QUESTION_SET`、`AI` のいずれかとする
- WBS分割単位が `PAGE` の場合、数量条件の単位をページとし、総量と1日量を必須とする
- 概要、直接入力目次、修正済みOCR結果は `ai_plan_sources` に保存し、生成依頼へ重複保存しない

### 4.10 ai_plan_sources

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `ai_plan_generation_request_id` | `uuid` | NO | 生成依頼 |
| `temporary_key` | `varchar(100)` | NO | OpenAI入出力内で入力元を参照する一時識別子 |
| `source_type` | `varchar(20)` | NO | `OVERVIEW`, `PASTED_TOC`, `OCR_TEXT` |
| `source_order` | `integer` | NO | 教材・画像順 |
| `label` | `varchar(100)` | YES | 教材名・画像表示名 |
| `text_content` | `text` | NO | WBS下書き生成に利用した修正済みテキスト |
| `content_hash` | `varchar(64)` | NO | 内容変更検知用SHA-256 |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- 生成依頼内で `temporary_key` を一意にする
- `source_type in ('OVERVIEW', 'PASTED_TOC', 'OCR_TEXT')`
- `source_order >= 0`
- `char_length(text_content) >= 1`
- `source_type = 'OVERVIEW'` の `text_content` は5,000文字以下
- 同一生成依頼の `PASTED_TOC` と `OCR_TEXT` の `text_content` 合計は20,000文字以下
- 同一生成依頼の `OCR_TEXT` は10件以下

複数行の合計文字数と `OCR_TEXT` 件数はDB CHECKだけでは保証できないため、source一括更新トランザクション内でサービス層が検証する。OpenAIへ送る全テキスト30,000文字上限も、学習目標、sources、constraintsから送信payloadを組み立てた後にサービス層で検証する。画像本体、画像URL、外部ストレージキーは保持しない。生成依頼削除時はcascadeする。

### 4.11 ai_generation_jobs

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `ai_plan_generation_request_id` | `uuid` | NO | 生成依頼 |
| `account_id` | `uuid` | NO | 排他・日次上限判定用 |
| `job_type` | `varchar(30)` | NO | `WBS_GENERATION` |
| `status` | `varchar(30)` | NO | ジョブ状態 |
| `deadline_at` | `timestamptz` | NO | 受付時からの総期限 |
| `deadline_priority` | `boolean` | NO | 期限優先の生成方針 |
| `attempt_count` | `integer` | NO | 外部呼び出し回数 |
| `schema_regeneration_count` | `integer` | NO | 構造検証失敗による再生成回数 |
| `error_code` | `varchar(100)` | YES | 安定した失敗コード |
| `provider_request_id` | `varchar(255)` | YES | 外部調査用ID。本文は保持しない |
| `model_name` | `varchar(100)` | NO | 使用モデル |
| `prompt_version` | `varchar(50)` | NO | プロンプト版 |
| `schema_version` | `varchar(50)` | NO | 構造化出力スキーマ版 |
| `strategy_version` | `varchar(50)` | NO | サーバー生成戦略版 |
| `input_tokens` | `integer` | YES | 入力トークン数 |
| `output_tokens` | `integer` | YES | 出力トークン数 |
| `started_at` | `timestamptz` | YES | 処理開始日時 |
| `completed_at` | `timestamptz` | YES | terminal到達日時 |
| `created_at` | `timestamptz` | NO | 受付日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

制約:

- `job_type = 'WBS_GENERATION'`
- `status in ('QUEUED', 'PROCESSING', 'CANCEL_REQUESTED', 'COMPLETED', 'FAILED', 'CANCELED')`
- `attempt_count >= 0`
- `schema_regeneration_count between 0 and 1`
- `deadline_at > created_at`

同一ユーザーのactive状態を1件に制限する部分一意インデックスを作成する。

### 4.12 ai_plan_drafts

| カラム | 型 | Null | 制約・用途 |
| --- | --- | --- | --- |
| `id` | `uuid` | NO | 主キー |
| `ai_plan_generation_request_id` | `uuid` | NO | 生成依頼 |
| `ai_generation_job_id` | `uuid` | NO | 生成元ジョブ |
| `account_id` | `uuid` | NO | 所有アカウント |
| `revision` | `integer` | NO | 楽観ロック用版 |
| `project_name` | `varchar(100)` | NO | プロジェクト名 |
| `project_description` | `varchar(5000)` | YES | 概要 |
| `start_date` | `date` | NO | 開始日 |
| `target_end_date` | `date` | NO | 目標終了日 |
| `draft_wbs_tasks_json` | `jsonb` | NO | 一時キーを持つ親・LEAF下書き。LEAFは対応する入力元の`sourceTemporaryKeys`を持つ |
| `validation_status` | `varchar(20)` | NO | `VALID`, `WARNING`, `INVALID` |
| `warnings_json` | `jsonb` | NO | 計画不整合 |
| `relaxation_options_json` | `jsonb` | NO | 最大3件の単一条件変更案 |
| `converted_project_id` | `uuid` | YES | 変換先プロジェクト。プロジェクト削除時はNULL |
| `converted_at` | `timestamptz` | YES | 変換日時 |
| `created_at` | `timestamptz` | NO | 作成日時 |
| `updated_at` | `timestamptz` | NO | 更新日時 |

`converted_project_id` は一意とし、`projects.id` への外部キーは `ON DELETE SET NULL` とする。変換済み判定は `converted_at` を正本とし、変換先プロジェクトを削除して `converted_project_id` がNULLになっても再変換を許可しない。`revision` は下書き更新と変換時の競合検出に使用する。

## 5. 制約・外部キー

### 5.1 DB制約で守るもの

| 領域 | DBで守る制約 |
| --- | --- |
| アカウント | `lower(email)` の一意インデックス |
| プロジェクト | 状態値、名称長、開始日 <= 目標終了日 |
| WBS | `PARENT` / `LEAF` のカラム保持ルール、予定日順、予定工数下限、進捗率範囲・刻み |
| 学習記録 | 学習時間下限・0.25刻み |
| 履歴 | 参照先削除時の履歴保持、履歴のプロジェクト帰属、履歴値の範囲 |
| トークン | token hash一意、有効期限が作成日時より後 |
| AI入力 | 日付順、入力元一時キー、ジョブ種別・状態、下書き変換一意性、変換先プロジェクト削除時の参照NULL化 |
| AI排他 | 同一アカウントのactiveジョブを部分一意インデックスで1件に制限 |

### 5.2 サービス層で守るもの

| 領域 | サービス層で守る制約 |
| --- | --- |
| 所有者制御 | 指定IDが認証中アカウントの所有データであること |
| プロジェクト削除 | 削除前に所有者確認を行い、関連データを削除順序に従って削除すること |
| WBS親子 | 親が同一プロジェクトのPARENTであること、3階層以上を作らないこと |
| WBS削除 | 学習記録があるLEAF、配下に学習記録があるPARENTの削除拒否 |
| 履歴追加 | 保存前後の値が変わった場合だけ履歴を追加すること |
| 学習記録 | 未来日禁止、対象タスクが同一プロジェクトのLEAFであること |
| 完了条件 | LEAFが1件以上あり、全LEAFが100%の場合だけプロジェクト完了を許可すること |
| AI入力上限 | OCR・目次合計20000文字、概要5000文字、条件5000文字、送信合計30000文字を切り捨てず検証すること |
| AI条件 | 平日・土日・学習できない曜日から期間内の利用可能時間を算出すること、`PAGE`選択時の数量条件を検証すること |
| AI出力 | 必須項目、最大2階層、0.25時間単位、日付、LEAFと入力元の対応を保存前と変換前に検証すること |
| 停止競合 | 結果保存トランザクションでジョブを再取得・ロックし、CANCEL_REQUESTEDなら結果を保存せずCANCELEDにすること |

## 6. インデックス

### 6.1 認証

| インデックス | 目的 |
| --- | --- |
| `ux_accounts_email_lower` on `lower(email)` | ログイン、登録時のメール一意性 |
| `ux_refresh_tokens_token_hash` on `token_hash` | リフレッシュトークン検証 |
| `idx_refresh_tokens_account_state` on `(account_id, revoked_at, expires_at)` | アカウント別の有効・失効トークン確認 |

### 6.2 プロジェクト・一覧

| インデックス | 目的 |
| --- | --- |
| `idx_projects_account_updated` on `(account_id, updated_at desc)` | プロジェクト一覧の初期表示 |
| `idx_projects_account_status` on `(account_id, status)` | 状態フィルタ |

キーワード検索はMVP1では部分一致検索を想定する。性能が問題になった場合に、`pg_trgm` や全文検索インデックスを検討する。

### 6.3 WBS

| インデックス | 目的 |
| --- | --- |
| `idx_wbs_tasks_project_type` on `(project_id, task_type)` | 集計対象LEAF抽出、PARENT抽出 |
| `idx_wbs_tasks_project_parent` on `(project_id, parent_wbs_task_id)` | 親子表示、親配下タスク取得 |
| `idx_wbs_tasks_project_plan_dates` on `(project_id, planned_start_date, planned_end_date)` | WBS表示順、ガント表示、PV計算 |

### 6.4 履歴

| インデックス | 目的 |
| --- | --- |
| `idx_project_period_history_project_changed` on `(project_id, changed_at desc)` | 期間変更履歴確認 |
| `idx_wbs_task_plan_history_task_changed` on `(wbs_task_id, changed_at desc)` | タスク計画履歴確認 |
| `idx_wbs_task_plan_history_project_changed` on `(project_id, changed_at desc)` | プロジェクト単位の計画履歴追跡 |
| `idx_wbs_task_progress_history_task_changed` on `(wbs_task_id, changed_at desc)` | 日別EV、バーンダウン実績線 |
| `idx_wbs_task_progress_history_project_changed` on `(project_id, changed_at desc)` | プロジェクト単位の日別EV、バーンダウン実績線 |

`wbs_task_id` は削除後NULLになり得る。履歴計算は現存タスクを主対象とし、削除済みタスクの履歴は `project_id` と `task_name_snapshot` を使って変更追跡用途として残す。

### 6.5 学習記録

| インデックス | 目的 |
| --- | --- |
| `idx_study_logs_account_date` on `(account_id, study_date desc)` | ユーザー単位の総学習時間、連続学習日数 |
| `idx_study_logs_project_date` on `(project_id, study_date desc)` | プロジェクト単位の学習記録一覧・集計 |
| `idx_study_logs_task_date` on `(wbs_task_id, study_date desc)` | タスク詳細の学習記録概要、削除可否判定 |

### 6.6 AI計画生成

| インデックス | 目的 |
| --- | --- |
| `idx_ai_requests_account_updated` on `(account_id, updated_at desc)` | ユーザーの作成途中データ再開 |
| `idx_ai_requests_retention` on `(retention_expires_at)` | 保持期限を過ぎた生成依頼のcleanup |
| `idx_ai_sources_request_order` on `(ai_plan_generation_request_id, source_order)` | 入力元の順序取得 |
| `ux_ai_generation_jobs_account_active` on `(account_id)` where `status in ('QUEUED','PROCESSING','CANCEL_REQUESTED')` | 同一ユーザーのAI処理を1件に制限 |
| `idx_ai_generation_jobs_account_created` on `(account_id, created_at desc)` | 日次生成上限、利用量集計 |
| `idx_ai_generation_jobs_deadline` on `(status, deadline_at)` | 期限超過ジョブの検出 |
| `ux_ai_plan_drafts_generation_job` on `(ai_generation_job_id)` | 1ジョブから複数下書きが作成されることを防止 |
| `ux_ai_plan_drafts_converted_project` on `(converted_project_id)` where `converted_project_id is not null` | 重複変換防止 |
| `idx_ai_plan_drafts_account_updated` on `(account_id, updated_at desc)` | 下書き再開 |

## 7. Flyway V1作成順

`V1__create_initial_schema.sql` では、外部キー依存に従って次の順で作成する。

1. `accounts`
2. `refresh_tokens`
3. `projects`
4. `project_period_history`
5. `wbs_tasks`
6. `wbs_task_plan_history`
7. `wbs_task_progress_history`
8. `study_logs`
9. インデックス

`wbs_tasks` は自己参照を持つため、テーブル作成時に `parent_wbs_task_id` の外部キーを同時に定義してよい。循環参照や親種別の検証はサービス層で行う。

### 7.1 MVP3マイグレーション

MVP3では利用可能な次のversionで、次の順序によりAI関連テーブルを追加する。

1. `ai_plan_generation_requests`
2. `ai_plan_sources`
3. `ai_generation_jobs`
4. `ai_plan_drafts`
5. AI関連インデックス
6. `Account.aiUsageConsentAt` フィールドと関連するDTO・SQL参照を削除
7. 未使用の `accounts.ai_usage_consent_at` を削除

既存データの変換は不要である。Javaフィールドと関連参照の削除、Flywayによるカラム削除を同じ変更へ含め、アプリケーション起動・Repository結合テスト・マイグレーションテストで参照漏れがないことを確認する。

## 8. JPA実装時の注意

- `uuid` はJava側で `java.util.UUID` として扱う。
- `timestamptz` は `OffsetDateTime` または `Instant` に寄せる。画面表示時にJSTへ変換する。
- `date` は `LocalDate` として扱う。
- `numeric(6,2)` は `BigDecimal` として扱う。工数計算では `double` を使わない。
- CHECK制約に頼るだけでなく、入力値はAPI層またはService層で先に検証する。
- `wbs_tasks` のPARENT/LEAF制約はDB CHECKとService検証の両方で守る。
- 履歴テーブルの `wbs_task_id` はnullableのため、JPA関連はoptionalとして扱う。
- `updated_at` はEntity更新時にアプリケーション側で明示的に更新する。
- AI入力本文をEntityの `toString`、SQLパラメータログ、監査ログへ出力しない。
- JSONB内の下書きタスク一時キーは下書き内で一意にし、各LEAFの`sourceTemporaryKeys`が同じ生成依頼の入力元だけを参照することをサービス層で検証する。

## 9. 業務ロジック設計へ渡す前提

- BAC、PV、EV、AC、バーンダウン表示点は保存しない。
- BACは `wbs_tasks` のLEAFの `planned_hours` 合計から計算する。
- PVは `wbs_tasks` のLEAFの `planned_start_date`, `planned_end_date`, `planned_hours` から日別配分する。
- EVは現在値では `wbs_tasks.progress_rate`、日別EVでは `wbs_task_progress_history` のJST各日終了時点の最新値から計算する。
- ACは `study_logs.study_date <= JST当日` の `study_hours` 合計から計算する。
- 予定日未設定のLEAFを含む場合、PVとバーンダウンは算出不可として扱う方針を業務ロジック設計で明文化する。
- WBS計画履歴とプロジェクト期間履歴はMVP2のEVM・バーンダウン計算には使わない。現在有効な計画値で再計算する。
- 削除済みタスクの履歴は変更追跡用途として保持するが、現行のEVM・バーンダウン計算対象には含めない。
- PJ01の進捗率ソートは、進捗率を非保存の都度計算値として扱うため、DBの単純なORDER BYではなくアプリケーション側での計算後ソートを前提とする。

## 10. 未決事項

| 項目 | 内容 | 決定タイミング |
| --- | --- | --- |
| AIデータ保持期間 | 入力・ジョブ・下書きの具体的な保持日数 | MVP3の運用設計。`retention_expires_at` で変更可能にする |
| 検索インデックス | プロジェクト名・概要検索に通常LIKEで足りるか、`pg_trgm` を使うか | 性能確認時 |
