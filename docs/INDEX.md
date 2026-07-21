# ドキュメントインデックス

study-pmの要件定義、基本設計、UIモック、セットアップ、開発方針ドキュメントへの入口です。

## 1. 読む順序

1. [要件定義サマリ](requirements/summary/README.md)で全体像を確認する。
2. [スコープ](requirements/details/scope.md)と[機能要件](requirements/details/functional.md)でMVP範囲を確認する。
3. [データ・画面・外部インターフェース要件](requirements/details/data-screens-interfaces.md)で画面要件とデータ要件を確認する。
4. [画面一覧](basic-design/screen-list.md)、[画面遷移図](basic-design/screen-flow.md)、[技術スタック](basic-design/tech-stack.md)、[データモデル](basic-design/data-model.md)、[API一覧](basic-design/api-list.md)で基本設計の前提を確認する。
5. [詳細設計README](detailed-design/README.md)、[DBスキーマ詳細設計](detailed-design/database-schema.md)、[業務ロジック詳細設計](detailed-design/business-logic.md)、[実装方針詳細設計](detailed-design/implementation-policy.md)で実装前提を具体化する。
6. [UIモック](ui-mock/README.md)と[開発方針](development/README.md)を参照し、実装方針に落とし込む。
7. 実装前に[コーディング規約](development/coding-guidelines.md)でコード上の名前、コメント、設計の基準を確認する。

## 2. 要件定義

- [要件定義サマリ](requirements/summary/README.md) - 要件定義全体の概要と主要な判断をまとめる。
- [スコープ](requirements/details/scope.md) - MVP範囲、ユースケース、対象外範囲を定義する。
- [ユーザーストーリー](requirements/details/user-stories.md) - 利用者視点の達成したいことを整理する。
- [機能要件](requirements/details/functional.md) - プロジェクト、WBS、学習記録、進捗可視化、認証などの機能要件を定義する。
- [業務ルール](requirements/details/business-rules.md) - 工数、進捗率、EVM、学習記録などの計算・制約ルールを定義する。
- [データ・画面・外部インターフェース要件](requirements/details/data-screens-interfaces.md) - データ項目、画面要件、外部連携要件を定義する。
- [非機能要件](requirements/details/non-functional.md) - 性能、可用性、セキュリティ、運用などの要件を定義する。
- [受け入れ基準](requirements/details/acceptance.md) - MVPの受け入れ基準と保留事項を整理する。
- [用語定義](requirements/details/glossary.md) - 用語とID体系を定義する。
- [要件レビュー記録](requirements/review/requirements-review.md) - 要件定義に対するレビュー指摘と対応状況を記録する。

## 3. 基本設計

- [技術スタック](basic-design/tech-stack.md) - フロントエンド、バックエンド、DB、テスト、ローカル開発環境の採用方針を定義する。
- [画面一覧](basic-design/screen-list.md) - 画面ID、画面名、MVP区分、主な役割を定義する。
- [画面遷移図](basic-design/screen-flow.md) - 画面間の遷移と遷移制約を定義する。
- [データモデル](basic-design/data-model.md) - エンティティ、履歴、集計値、MVP別テーブル作成方針を定義する。
- [API一覧](basic-design/api-list.md) - REST APIの基本方針、API ID、エンドポイント、画面・業務ルールとの対応を定義する。

## 4. 詳細設計

- [詳細設計README](detailed-design/README.md) - 詳細設計の位置づけと収録方針をまとめる。
- [DBスキーマ詳細設計](detailed-design/database-schema.md) - PostgreSQLテーブル、カラム型、制約、外部キー、インデックス、Flyway作成順を定義する。
- [業務ロジック詳細設計](detailed-design/business-logic.md) - 集計、状態遷移、履歴保存、学習サマリー、EVM、バーンダウンの実装前提を定義する。
- [実装方針詳細設計](detailed-design/implementation-policy.md) - エラー、例外、ログ、内部構造、設定管理、テスト分類の横断方針を定義する。

## 5. UIモック

- [UIモックREADME](ui-mock/README.md) - UIモックの位置づけ、起動方法、確認観点をまとめる。
- [MVP1画面計画](ui-mock/mvp1-screen-plan.md) - MVP1で確認する画面とモック上の検証観点を整理する。

## 6. セットアップ

- [セットアップREADME](setup/README.md) - 開発環境構築の入口をまとめる。
- [フロントエンドセットアップ](setup/frontend.md) - フロントエンド開発環境の構築手順をまとめる。
- [GitHubセットアップ](setup/github.md) - GitHub利用時の初期設定や運用メモをまとめる。

## 7. 開発方針

- [開発方針README](development/README.md) - 開発方針ドキュメントの入口をまとめる。
- [AI支援開発](development/ai-assisted-development.md) - AIを使った開発時の役割分担と注意点を定義する。
- [仕様駆動開発](development/specification-driven-development.md) - 仕様駆動で進めるための考え方と成果物の扱いを定義する。
- [コーディング規約](development/coding-guidelines.md) - 実装時の命名、コメント、クラス設計、メソッド設計の判断基準を定義する。
