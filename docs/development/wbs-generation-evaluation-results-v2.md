<!--
doc-type: 開発記録
related: docs/development/wbs-generation-evaluation.md, docs/detailed-design/ai-plan-generation.md
-->

# WBS生成評価記録 dataset v2

## 比較対象

| 区分 | prompt | schema | strategy | 用途 |
| --- | --- | --- | --- | --- |
| baseline | v4 | v1 | v1 | 変更前の比較基準 |
| candidate | v7 | v4 | v3 | 整数工数、サーバー日程配置、任意階層対応 |

比較条件の正本は`backend/src/test/resources/fixtures/wbs-generation/dataset-v2.json`とする。baselineの版情報は固定したが、dataset v2を使った実API再測定値は未取得である。未測定値を0件または成功として扱わない。

## 2026-08-18 実行結果

| 確認 | 結果 | 備考 |
| --- | --- | --- |
| candidate JSON Schema契約 | 成功 | strict Structured Outputsを実OpenAI APIで1回実行 |
| AI専用整数工数・階層変換・日程配置 | 成功 | 固定入力の自動テストで確認 |
| AI計画のDB結合経路 | 成功 | PostgreSQL Testcontainersで22件成功 |
| dataset v2全fixtureの実API品質評価 | 成功 | 7 fixtureを合計13回実行。構造ゲートは全件通過 |

## 記録する指標

- 構造通過率
- 学習範囲カバレッジ
- 親タスク数、LEAF数
- 総予定工数
- 構造再生成率
- 入力・出力トークン数

次回比較では、実行日時、modelName、applicationCommitを追記し、比較対象を同じ入力・回数で評価する。

## dataset v2 candidate実測

- 実行日時: 2026-08-18 21:35 JST
- modelName: `gpt-4.1-mini`
- applicationCommit: `working-tree`
- 構造通過率: 100%（13/13）
- 構造再生成率: 0%（0/13）
- 学習範囲カバレッジ平均: 94.9%
- 入力トークン合計: 9,796
- 出力トークン合計: 8,470

| fixture | 実行数 | 構造通過率 | 平均カバレッジ | 親数 | LEAF数 |
| --- | ---: | ---: | ---: | --- | --- |
| eight-chapter-toc-v1 | 1 | 100% | 100% | 8 | 16 |
| ocr-typos-v2 | 3 | 100% | 77.8% | 3 / 3 / 3 | 6 / 6 / 6 |
| missing-line-breaks-v2 | 3 | 100% | 100% | 3 / 3 / 3 | 6 / 6 / 6 |
| mixed-chapter-headings-v2 | 1 | 100% | 100% | 4 | 4 |
| numbering-irregularities-v2 | 1 | 100% | 100% | 2 | 6 |
| three-level-outline-v2 | 1 | 100% | 100% | 2 | 6 |
| four-level-outline-v2 | 3 | 100% | 100% | 2 / 2 / 2 | 7 / 7 / 7 |

`ocr-typos-v2`は3回中1回だけカバレッジ33.3%だった。3章・6 LEAFの構造は保持されたが、期待した正しい表記への補正が一部行われなかった。今回の責務移管により構造安定性は確保できた一方、OCR誤字の意味補正はモデル出力に依存しており非決定的である。ファインチューニング判断は、このケースの追加評価と実利用時の修正負荷を記録してから行う。

baselineはdataset v2で再実行していないため、candidateがbaseline以上という比較判定は未実施である。今回のcandidate実測を次回比較の基準として保持する。
