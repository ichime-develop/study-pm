<!--
doc-type: 開発方針
id-prefix: なし
related: docs/development/README.md, docs/basic-design/tech-stack.md
-->

# CIとブランチ運用方針

## 1. 目的

Lint、型チェック、テスト、ビルドを自動実行し、mainを検証済みの状態に保つ。

ローカルでの確認漏れを補い、レビュー時には変更内容そのものに集中できるようにする。

## 2. CIの構成

GitHub Actionsの`CI`ワークフローは、すべてのプルリクエストとmainへのpushで実行する。フロントエンドとバックエンドは独立したジョブとして並列に実行する。

| ジョブ | 実行内容 |
| --- | --- |
| `frontend` | `npm ci`、Lint、型チェック、テスト、ビルド |
| `backend` | Java 25で`./mvnw --batch-mode -f backend/pom.xml verify`を実行。TestcontainersがPostgreSQLを起動する結合テストを含む。 |

GitHub Rulesetで必要なstatus checkを指定する場合、ジョブ名`frontend`と`backend`を使う。名称を変更する場合はRulesetも同時に見直す。

## 3. main保護の方針

方針Aとして、CI成功を必須にし、プルリクエスト作成は必須にしない。

GitHubのRulesetではmainを対象に、`frontend`と`backend`のstatus checkを必須にし、force pushを禁止する。管理者を含めて検証を回避しない運用にする場合は、Rulesetのbypass listを空にする。

プルリクエスト経由の変更は、必要なstatus checkが成功するまでマージできない。mainへ直接変更する場合も、CI結果を確認し、失敗した状態を放置しない。Rulesetの挙動とGitHubプランは変更され得るため、設定時にはGitHubの画面で直接pushに対する制約を確認する。

## 4. プルリクエストを使う基準

次の変更では、レビューと検証結果を紐付けるためプルリクエストを使う。

- 機能スライス（例: MVP2のEVM実装）
- 複数ファイルにまたがるリファクタリング
- レビューを依頼する変更

次の変更は、ローカル検証後にmainへ直接pushしてよい。

- ドキュメントのみの修正
- 設定の微修正
- 誤字修正

## 5. ローカルでの事前確認

CIを待つ前に、変更範囲に応じてVS Codeのタスクまたは直接コマンドで確認する。

| 対象 | VS Codeタスク | 直接コマンド |
| --- | --- | --- |
| フロントエンド | `frontend検証 (lint+typecheck+test+build)` | `cd frontend && npm run lint && npm run typecheck && npm run test && npm run build` |
| バックエンド単体テスト | `backend検証 (test)` | `./mvnw -f backend/pom.xml test` |
| バックエンド結合テストを含む検証 | `backend検証 (verify: IT含む・Docker必須)` | `./mvnw -f backend/pom.xml verify` |

## 6. Lintの対象範囲

現時点のESLintは、次の違反を検出する。

- `any`の使用
- 未使用変数
- React Hooksの依存配列
- React Hooksの呼び出し規則

命名規約、責務コメント、CSSトークンの利用、バックエンドの静的解析は、現時点では自動検出の対象外であり、レビューで確認する。追加するルールは、実際の違反傾向を確認してから対象を限定し、誤検知や開発速度への影響を評価したうえで導入する。
