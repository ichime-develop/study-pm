<!--
doc-type: 詳細設計
id-prefix: API-AN
related: docs/basic-design/api-list.md, docs/detailed-design/business-logic.md, docs/requirements/details/business-rules.md
-->

# 進捗分析API詳細設計

## 1. 共通方針

- 対象APIは認証済みアカウントが所有するプロジェクトだけを参照する。存在しないIDと他アカウントのIDはともに `404 PROJECT_NOT_FOUND` とする。
- EVM・バーンダウンの算出不可は入力不足による正常な業務状態であり、HTTPエラーにしない。`200 OK` と `isCalculable: false` を返す。
- 数値項目は常にJSONキーを返す。全体算出不可または指標単位の算出不可では値を `null` とし、理由を `unavailableReasons` で返す。
- 時間・EVM値・差分日数はJSON numberで返す。表示時の小数点以下の丸めはクライアントの責務とする。

## 2. API-AN-01 EVMサマリー

`GET /api/projects/{projectId}/analysis/evm`

| 項目 | 型 | 説明 |
| --- | --- | --- |
| `baseDate` | string(date) | JST基準日 |
| `isCalculable` | boolean | EVM全体を算出可能か |
| `unavailableReasons` | string[] | 全体またはSPI/CPI単位の算出不可理由 |
| `bac`, `pv`, `ev`, `ac`, `sv`, `cv` | number / null | EVM工数指標。全体算出不可時は `null` |
| `spi`, `cpi` | number / null | 効率指標。分母が0の場合も `null` |

```json
{
  "baseDate": "2026-07-29",
  "isCalculable": true,
  "unavailableReasons": ["ZERO_ACTUAL_HOURS"],
  "bac": 20.0,
  "pv": 8.0,
  "ev": 6.0,
  "ac": 0.0,
  "sv": -2.0,
  "cv": 6.0,
  "spi": 0.75,
  "cpi": null
}
```

全体算出不可の場合は8指標をすべて `null` とし、例えば `MISSING_SCHEDULE` を返す。

## 3. API-AN-02 バーンダウン

`GET /api/projects/{projectId}/analysis/burndown`

| 項目 | 型 | 説明 |
| --- | --- | --- |
| `baseDate`, `isCalculable`, `unavailableReasons` | API-AN-01と同じ | 基準日と算出可否 |
| `idealPoints` | `{ date, remainingHours }[]` | プロジェクト開始日から目標終了日までの理想残 |
| `actualPoints` | `{ date, remainingHours }[]` | プロジェクト開始日からJST基準日までの実績残 |
| `idealRemainingHours`, `actualRemainingHours` | number / null | 基準日時点の残予定工数 |
| `workDifferenceHours`, `dayDifference` | number / null | 基準日時点の差分工数と差分日数 |

全体算出不可の場合は表示点を空配列、数値を `null` とする。

## 4. API-AN-03 計画不整合

`GET /api/projects/{projectId}/analysis/plan-warnings`

```json
{
  "warnings": [
    {
      "taskId": "7d2c70f5-30f5-4e5f-9410-2dcedb322deb",
      "taskName": "問題を解く",
      "type": "ENDS_AFTER_PROJECT",
      "plannedStartDate": "2026-07-20",
      "plannedEndDate": "2026-08-10",
      "message": "予定終了日がプロジェクト目標終了日より後です。"
    }
  ]
}
```

`type` は `STARTS_BEFORE_PROJECT` または `ENDS_AFTER_PROJECT` とする。1タスクが両方に該当する場合は、2件の警告として返す。

## 5. 算出不可理由

| 値 | 対象 | 説明 |
| --- | --- | --- |
| `NO_LEAF_TASKS` | EVM全体、バーンダウン全体 | 計算対象LEAFが0件 |
| `MISSING_SCHEDULE` | EVM全体、バーンダウン全体 | 予定開始日または予定終了日が未設定のLEAFが存在する |
| `ZERO_PLANNED_HOURS` | EVM全体、バーンダウン全体 | BACが0 |
| `ZERO_PLANNED_VALUE` | SPIのみ | PVが0 |
| `ZERO_ACTUAL_HOURS` | CPIのみ | ACが0 |
