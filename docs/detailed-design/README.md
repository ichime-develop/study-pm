<!--
doc-type: 詳細設計
id-prefix: なし
related: docs/INDEX.md, docs/basic-design/data-model.md, docs/basic-design/api-list.md, docs/development/specification-driven-development.md
-->

# 詳細設計

実装前に、基本設計を具体的な構造、入出力、制約、例外処理へ落とし込む成果物を管理する。

## 収録方針

- 基本設計では抽象度が高すぎて実装者が迷う領域を対象にする。
- 型、制約、外部キー、インデックス、例外、入出力、永続化方針を具体化する。
- 要件定義や基本設計の責務を上書きせず、その前提を補強する。

## 現在の成果物

- [DBスキーマ詳細設計](database-schema.md) - PostgreSQLテーブル、制約、インデックス、Flyway作成順を定義する。
- [業務ロジック詳細設計](business-logic.md) - 集計、状態遷移、履歴保存、学習サマリー、EVM、バーンダウンの実装前提を定義する。
- [進捗分析API詳細設計](analysis-api.md) - EVM、バーンダウン、計画不整合APIのJSON形式と算出不可表現を定義する。
- [AI学習計画API詳細設計](ai-plan-api.md) - OCR、候補確認、非同期ジョブ、WBS下書き、プロジェクト変換のHTTP契約を定義する。
- [AI学習計画生成詳細設計](ai-plan-generation.md) - 外部サービス境界、状態遷移、Structured Outputs検証、矛盾判定、停止・再試行を定義する。
- [実装方針詳細設計](implementation-policy.md) - エラー、例外、ログ、内部構造、設定管理、テスト分類の横断方針を定義する。
