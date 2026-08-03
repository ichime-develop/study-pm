<!--
doc-type: 詳細設計
id-prefix: API-AI
related: docs/basic-design/api-list.md, docs/basic-design/data-model.md, docs/detailed-design/ai-plan-generation.md, docs/requirements/details/acceptance.md
-->

# AI学習計画API詳細設計

## 1. 目的

MVP3のOCR、WBS下書き生成、下書き変換のHTTP契約を定義する。共通エラー形式と認証方式は `docs/basic-design/api-list.md` を正本とする。

## 2. 共通契約

### 2.1 所有者制御

- 全APIで認証を必須とする。
- generationRequest、job、draftは認証中accountIdで所有者を検証する。
- 未存在、削除済み、所有者不一致はすべて404とする。
- APIの入出力へaccountId、メールアドレス、内部の外部サービス認証情報を含めない。

### 2.2 revision

- WBS下書きは `draftRevision` を持つ。
- 下書き更新・変換リクエストは取得時のrevisionを必須とする。
- サーバー上のrevisionと一致しない場合は409 `STALE_AI_PLAN_REVISION` を返す。

### 2.3 AI機能の可用性

- AI機能を無効化した環境では、AI APIはすべて503 `AI_FEATURE_UNAVAILABLE` を返す。
- AI機能を有効化した環境でOpenAI APIキーが未設定の場合は、起動時検証でアプリケーションを起動しない。

### 2.4 ジョブ種別と状態

```text
jobType:
  WBS_GENERATION

status:
  QUEUED
  PROCESSING
  CANCEL_REQUESTED
  COMPLETED
  FAILED
  CANCELED
```

active状態は `QUEUED`, `PROCESSING`, `CANCEL_REQUESTED` とする。terminal状態は `COMPLETED`, `FAILED`, `CANCELED` とする。

### 2.5 ジョブ状態レスポンス

```json
{
  "jobId": "uuid",
  "jobType": "WBS_GENERATION",
  "status": "PROCESSING",
  "acceptedAt": "2026-07-29T03:00:00Z",
  "deadlineAt": "2026-07-29T03:05:00Z",
  "error": null,
  "result": null
}
```

完了時の `result` は `draftId` を返す。失敗時の `error` は安定した `code`、ユーザー向け `message`、再生成に向けた `actionHints` を返し、外部サービスの生レスポンスを含めない。

```json
{
  "code": "AI_OUTPUT_TOO_LARGE",
  "message": "生成結果が大きすぎるため、WBS下書きを作成できませんでした。",
  "actionHints": [
    "学習範囲を複数回に分ける",
    "WBS分割単位を粗くする"
  ]
}
```

## 3. OCR

### 3.1 POST `/api/ai-plan/ocr`

- `multipart/form-data`
- 画像1枚だけを受け付ける。
- jpg、jpeg、png、webp、10MB以下を検証する。
- Google Cloud Vision `DOCUMENT_TEXT_DETECTION` を同期呼び出しする。
- 成功時は200を返す。

```json
{
  "text": "抽出したテキスト",
  "detectedPageCount": 1
}
```

複数画像の最大3並列実行、順序管理、画像単位の再試行はPC Webの責務とする。クライアントは送信前に最大10枚・合計50MBを検証する。サーバーは画像を永続保存しないため、OCR APIをまたいだ合計サイズは保持・再集計せず、1リクエストの画像が10MB以下であることを強制する。

## 4. 生成依頼と入力

### 4.1 POST `/api/ai-plan/requests`

入力を保存し、AIを使わず判定できる矛盾を返す。入力が不正な場合は生成依頼を作成しない。`sources` のうち `sourceType = OCR_TEXT` は最大10件とし、超過時は400 `AI_INPUT_LIMIT_EXCEEDED` を返す。

```json
{
  "sourceType": "MIXED",
  "learningGoal": "応用情報技術者試験に合格する",
  "startDate": "2026-08-01",
  "targetEndDate": "2026-10-01",
  "sources": [
    {
      "temporaryKey": "source-overview-1",
      "sourceType": "OVERVIEW",
      "sourceOrder": 0,
      "label": "学習内容の概要",
      "textContent": "重点分野を中心に学ぶ"
    },
    {
      "temporaryKey": "source-book-1-page-1",
      "sourceType": "OCR_TEXT",
      "sourceOrder": 1,
      "label": "教材名 目次1",
      "textContent": "修正済みOCR"
    },
    {
      "temporaryKey": "source-book-2",
      "sourceType": "PASTED_TOC",
      "sourceOrder": 2,
      "label": "問題集",
      "textContent": "貼り付け目次"
    }
  ],
  "constraints": {
    "weekdayAvailableHours": 1,
    "weekendAvailableHours": 2,
    "unavailableWeekdays": ["SUNDAY"],
    "scheduleNotes": "直前2週間は復習",
    "focusText": "ネットワーク",
    "lightText": "基礎理論",
    "excludeText": "",
    "quantityCondition": {
      "totalAmount": 120,
      "dailyAmount": 10,
      "unit": "ページ"
    },
    "wbsSplitUnit": "SECTION"
  }
}
```

`weekdayAvailableHours` は月曜日から金曜日、`weekendAvailableHours` は土曜日・日曜日に適用する。未指定時はそれぞれ平日1時間、土日2時間を補完する。祝日は特別扱いせず曜日に従う。`unavailableWeekdays` に含まれる曜日は、対応する時間設定にかかわらず0時間とする。両方の時間は0.25時間単位で0以上とする。

`wbsSplitUnit` は `SECTION`、`PAGE`、`QUESTION_SET`、`AI` のいずれかとする。`PAGE` を指定する場合は `quantityCondition.unit = "ページ"` とし、`totalAmount` と `dailyAmount` を必須とする。

成功時は201を返し、保存済み入力を返す。入力矛盾や入力上限の超過は保存せず、400エラーとして返す。

```json
{
  "generationRequestId": "uuid",
  "sourceType": "TABLE_OF_CONTENTS",
  "learningGoal": "Java Silverに合格する",
  "startDate": "2026-06-08",
  "targetEndDate": "2026-07-15",
  "constraints": {},
  "sources": []
}
```

### 4.2 PUT `/api/ai-plan/requests/{requestId}`

入力条件と `sources` 全体を更新し、事前検証を再実行する。`temporaryKey` は生成依頼内で一意とする。下書き作成後に入力またはsourceを変更した場合、既存下書きは古い入力に基づくものとして再生成を要求する。

## 5. WBS下書き

### 5.1 POST `/api/ai-plan/requests/{requestId}/draft-jobs`

```json
{
  "deadlinePriority": false
}
```

事前検証済みの入力だけを受け付ける。受付成功時は202を返す。同一ユーザーにactiveジョブがある場合は409 `AI_JOB_ALREADY_ACTIVE`、JST当日の日次上限に達している場合は429 `AI_DAILY_LIMIT_REACHED` とする。

サーバーは保存済みの入力、ユーザー入力の数量条件、日程補足を読み込み、数量条件がある場合は必要日数を再計算してWBS生成payloadを構築する。クライアントから数量条件や必要日数を再送させない。

日次上限はWBS生成ジョブの受付数で判定し、同一ジョブ内の自動再試行は追加件数として数えない。

### 5.2 GET `/api/ai-plan/drafts/{draftId}`

```json
{
  "draftId": "uuid",
  "draftRevision": 1,
  "project": {
    "name": "応用情報合格",
    "description": "",
    "startDate": "2026-08-01",
    "targetEndDate": "2026-10-01"
  },
  "tasks": [
    {
      "temporaryKey": "parent-1",
      "taskType": "PARENT",
      "parentTemporaryKey": null,
      "name": "ネットワーク",
      "description": "",
      "plannedStartDate": null,
      "plannedEndDate": null,
      "plannedHours": null,
      "sourceTemporaryKeys": []
    },
    {
      "temporaryKey": "leaf-1",
      "taskType": "LEAF",
      "parentTemporaryKey": "parent-1",
      "name": "TCP/IPを学ぶ",
      "description": "",
      "plannedStartDate": "2026-08-01",
      "plannedEndDate": "2026-08-05",
      "plannedHours": 4.0,
      "sourceTemporaryKeys": ["source-book-1-page-1"]
    }
  ],
  "validation": {
    "status": "WARNING"
  },
  "planWarnings": [],
  "relaxationOptions": []
}
```

### 5.3 PUT `/api/ai-plan/drafts/{draftId}`

`draftRevision`、project、tasksを一括送信する。サーバーはAI出力受信時と同じ構造・業務検証と、計画整合性判定を再実行する。警告は保存を許可するが、構造違反は400で拒否する。

### 5.4 POST `/api/ai-plan/drafts/{draftId}/convert`

```json
{
  "draftRevision": 2
}
```

変換トランザクション内で次を行う。

1. draftを行ロックして所有者、revision、未変換を確認する。
2. 構造・業務制約を再検証する。
3. projectを作成する。
4. PARENT、LEAF、初期0%進捗履歴を作成する。
5. `convertedProjectId`, `convertedAt` を更新する。

変換済みの場合は409 `AI_PLAN_ALREADY_CONVERTED` を返す。

## 6. ジョブ操作

### 6.1 GET `/api/ai-plan/jobs/{jobId}`

状態取得のたびに期限超過を判定する。期限超過時は、QUEUED/PROCESSINGをFAILED `AI_JOB_TIMEOUT`、CANCEL_REQUESTEDをCANCELEDへ遷移させてから返す。

### 6.2 POST `/api/ai-plan/jobs/{jobId}/cancel`

- QUEUEDはCANCELEDへ即時遷移する。
- PROCESSINGはCANCEL_REQUESTEDへ遷移する。
- CANCEL_REQUESTEDは冪等に同じ状態を返す。
- terminal状態は現在状態を返す。

停止要求は外部サービスの処理・料金発生の停止を保証しない。

## 7. エラーコード

| HTTP | code | 用途 |
| --- | --- | --- |
| 400 | `AI_INPUT_LIMIT_EXCEEDED` | 文字数・1画像サイズ・生成依頼内のOCR入力元件数超過 |
| 400 | `AI_INPUT_CONFLICT` | 開始日、学習可能時間、ページ・ペース等の事前矛盾 |
| 400 | `AI_DRAFT_VALIDATION_FAILED` | 下書きの構造・業務制約違反 |
| 404 | `AI_PLAN_NOT_FOUND` | 未存在、削除済み、所有者不一致 |
| 409 | `AI_JOB_ALREADY_ACTIVE` | 同一ユーザーのactiveジョブあり |
| 409 | `STALE_AI_PLAN_REVISION` | 下書きの更新競合 |
| 409 | `AI_PLAN_ALREADY_CONVERTED` | 下書きの重複変換 |
| 429 | `AI_DAILY_LIMIT_REACHED` | ユーザー別日次上限 |
| 502 | `AI_PROVIDER_ERROR` | 外部サービスの非一時的失敗 |
| 503 | `AI_FEATURE_UNAVAILABLE` | 設定不足または外部サービス停止 |

ジョブ失敗は状態取得APIのHTTP 200レスポンス内に次の安定コードを返す。

| code | 用途 | 主なactionHints |
| --- | --- | --- |
| `AI_OUTPUT_TOO_LARGE` | OpenAI出力が設定トークン上限へ到達 | 学習範囲を分ける、WBS分割単位を粗くする |
| `AI_DRAFT_DAILY_LIMIT_EXCEEDED` | 日別予定工数が24時間を超過 | 目標終了日を延長する、学習範囲を減らす |
| `AI_STRUCTURED_OUTPUT_INVALID` | 再生成後も構造検証に失敗 | 入力内容を確認して再生成する |
| `AI_PROVIDER_ERROR` | 外部サービス失敗 | 入力内容を確認して再生成する |
| `AI_INTERNAL_ERROR` | アプリケーション内部の予期しない失敗 | 入力内容を確認して再生成する |
| `AI_JOB_TIMEOUT` | ジョブ総期限を超過 | 時間をおいて再生成する |
